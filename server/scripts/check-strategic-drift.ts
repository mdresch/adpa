import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const projectId = 'e8edf585-a14d-42dc-8009-660784d31387';

async function checkStrategicDrift() {
  try {
    console.log('\n🚨 CHECKING DRIFT STATUS FOR STRATEGIC DOCUMENTS\n');
    console.log('=' .repeat(70));

    // Get the 3 strategic documents
    const docsResult = await pool.query(`
      SELECT id, name, created_at
      FROM documents
      WHERE project_id = $1
      AND (
        name ILIKE '%vision%' OR 
        name ILIKE '%implementation%' OR 
        name ILIKE '%immediate%'
      )
      ORDER BY created_at DESC
      LIMIT 3
    `, [projectId]);

    console.log(`\n📄 Strategic Documents (${docsResult.rows.length} found):\n`);
    docsResult.rows.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Uploaded: ${doc.created_at}\n`);
    });

    if (docsResult.rows.length === 0) {
      console.log('⚠️  No strategic documents found!');
      await pool.end();
      return;
    }

    console.log('=' .repeat(70));

    // Check for existing drift alerts
    const driftResult = await pool.query(`
      SELECT 
        dd.id,
        dd.drift_type,
        dd.severity,
        dd.title,
        dd.description,
        dd.impact,
        dd.created_at,
        d.name as document_name
      FROM baseline_drift_detection dd
      LEFT JOIN documents d ON dd.source_document_id = d.id
      WHERE dd.project_id = $1
      ORDER BY dd.created_at DESC
      LIMIT 30
    `, [projectId]);

    console.log(`\n🚨 Drift Alerts in Database: ${driftResult.rows.length}\n`);

    if (driftResult.rows.length > 0) {
      console.log('Recent drift alerts:\n');
      
      const bySeverity: Record<string, number> = {};
      const byType: Record<string, number> = {};
      
      driftResult.rows.forEach((drift, idx) => {
        const severityIcon = drift.severity === 'critical' ? '🔴' : 
                             drift.severity === 'high' ? '🟠' : 
                             drift.severity === 'medium' ? '🟡' : '🟢';
        
        console.log(`${idx + 1}. ${severityIcon} [${drift.severity.toUpperCase()}] ${drift.drift_type}`);
        console.log(`   ${drift.title}`);
        console.log(`   Document: ${drift.document_name || 'N/A'}`);
        console.log(`   Created: ${drift.created_at}\n`);
        
        bySeverity[drift.severity] = (bySeverity[drift.severity] || 0) + 1;
        byType[drift.drift_type] = (byType[drift.drift_type] || 0) + 1;
      });
      
      console.log('=' .repeat(70));
      console.log('\n📊 DRIFT SUMMARY:\n');
      console.log('By Severity:');
      Object.entries(bySeverity).forEach(([sev, count]) => {
        const icon = sev === 'critical' ? '🔴' : sev === 'high' ? '🟠' : sev === 'medium' ? '🟡' : '🟢';
        console.log(`  ${icon} ${sev}: ${count}`);
      });
      
      console.log('\nBy Type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`  📌 ${type}: ${count}`);
      });
      
    } else {
      console.log('⚠️  NO DRIFT ALERTS FOUND!\n');
      console.log('📌 Drift detection may need to be triggered manually.');
      console.log('📌 Check if drift detection runs automatically on document upload.');
    }

    console.log('\n' + '=' .repeat(70));
    console.log('\n✨ CHECK COMPLETE!\n');

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStrategicDrift();

