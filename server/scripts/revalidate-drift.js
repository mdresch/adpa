const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({ 
  connectionString,
  ssl: (connectionString?.includes('supabase.co') || connectionString?.includes('azure') || process.env.DB_SSL === 'true')
    ? { rejectUnauthorized: false }
    : false
});

async function revalidateDrift() {
  try {
    console.log('🔍 Finding Communications Management Plan document...');
    
    // Find the document
    const docResult = await pool.query(`
      SELECT d.id, d.name, d.project_id, d.content
      FROM documents d
      WHERE d.name LIKE '%Communications Management Plan%'
      AND d.project_id IS NOT NULL
      ORDER BY d.updated_at DESC
      LIMIT 1
    `);
    
    if (docResult.rows.length === 0) {
      console.log('❌ Document not found');
      return;
    }
    
    const doc = docResult.rows[0];
    console.log(`✅ Found document: ${doc.name}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Project ID: ${doc.project_id}`);
    console.log(`   Content length: ${doc.content?.length || 0} chars`);
    
    // Find active baseline
    const baselineResult = await pool.query(`
      SELECT id, version, status
      FROM project_baselines
      WHERE project_id = $1
      AND status = 'approved'
      ORDER BY created_at DESC
      LIMIT 1
    `, [doc.project_id]);
    
    if (baselineResult.rows.length === 0) {
      console.log('❌ No approved baseline found');
      return;
    }
    
    const baseline = baselineResult.rows[0];
    console.log(`✅ Found baseline: v${baseline.version}`);
    console.log(`   ID: ${baseline.id}`);
    
    // Import baseline service
    const { baselineService } = await import('../dist/services/baselineService.js');
    
    console.log('\n🔄 Running drift validation...');
    
    const drifts = await baselineService.validateDocumentAgainstBaseline(
      doc.project_id,
      doc.id,
      doc.content,
      doc.name
    );
    
    console.log(`\n📊 Results:`);
    console.log(`   Drifts found: ${drifts.length}`);
    
    if (drifts.length === 0) {
      console.log('   ✅ No drift detected - document aligns with baseline!');
      
      // Mark old drifts as resolved
      const resolveResult = await pool.query(`
        UPDATE baseline_drift_detection 
        SET status = 'resolved',
            resolution_notes = 'Drift resolved via manual re-validation script',
            resolved_at = CURRENT_TIMESTAMP
        WHERE source_document_id = $1 
        AND status = 'active'
        RETURNING id
      `, [doc.id]);
      
      console.log(`   ✅ Marked ${resolveResult.rows.length} old drift(s) as resolved`);
    } else {
      console.log(`   ⚠️ Found ${drifts.length} drift(s):`);
      drifts.forEach((d, i) => {
        console.log(`   ${i + 1}. [${d.drift_severity}] ${d.detection_type}: ${d.drift_description}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

revalidateDrift();

