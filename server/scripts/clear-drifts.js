const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({ 
  connectionString,
  ssl: (connectionString?.includes('supabase.co') || connectionString?.includes('azure') || process.env.DB_SSL === 'true')
    ? { rejectUnauthorized: false }
    : false
});

async function clearDrifts() {
  try {
    console.log('🔍 Finding Communications Management Plan drifts...\n');
    
    // Check existing drifts
    const existingDrifts = await pool.query(`
      SELECT 
        bdd.id,
        bdd.detection_type,
        bdd.drift_severity,
        bdd.drift_description,
        bdd.status,
        d.name as document_name
      FROM baseline_drift_detection bdd
      JOIN documents d ON bdd.source_document_id = d.id
      WHERE d.name LIKE '%Communications Management Plan%'
      AND bdd.status = 'active'
      ORDER BY bdd.created_at DESC
    `);
    
    console.log(`📊 Found ${existingDrifts.rows.length} active drift(s):\n`);
    
    if (existingDrifts.rows.length === 0) {
      console.log('✅ No active drifts found - already cleared!');
      return;
    }
    
    existingDrifts.rows.forEach((drift, i) => {
      console.log(`${i + 1}. [${drift.drift_severity}] ${drift.detection_type}`);
      console.log(`   ${drift.drift_description.substring(0, 100)}...`);
    });
    
    console.log('\n🔄 Marking drifts as resolved...\n');
    
    // Mark drifts as resolved
    const result = await pool.query(`
      UPDATE baseline_drift_detection
      SET 
        status = 'resolved',
        resolution_notes = 'Drift manually resolved: Document updated to v1.0.4 with drift items removed (Slack, Trello, Procurement Lead, Implementation Manager, bi-weekly CCB changed to monthly)',
        resolved_at = CURRENT_TIMESTAMP
      WHERE source_document_id IN (
        SELECT id FROM documents 
        WHERE name LIKE '%Communications Management Plan%'
      )
      AND status = 'active'
      RETURNING id, detection_type
    `);
    
    console.log(`✅ SUCCESS! Marked ${result.rows.length} drift(s) as resolved:\n`);
    
    result.rows.forEach((drift, i) => {
      console.log(`   ${i + 1}. ${drift.detection_type} (ID: ${drift.id})`);
    });
    
    console.log('\n📊 Final Status:');
    console.log(`   Active Drifts: 0`);
    console.log(`   Resolved Drifts: ${result.rows.length}`);
    console.log('\n🎉 Drift clearance complete! Refresh the Baseline Management page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
  } finally {
    await pool.end();
  }
}

clearDrifts();

