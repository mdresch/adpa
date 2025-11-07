import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import axios from 'axios';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const projectId = 'e8edf585-a14d-42dc-8009-660784d31387';
const API_URL = process.env.FRONTEND_URL || 'http://localhost:5000';

async function triggerDriftDetection() {
  try {
    console.log('\n🚨 TRIGGERING DRIFT DETECTION FOR STRATEGIC VISION DOCUMENTS\n');
    console.log('=' .repeat(70));

    // Get the 3 most recent documents
    const docsResult = await pool.query(`
      SELECT id, name, created_at
      FROM documents
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [projectId]);

    console.log(`\nFound ${docsResult.rows.length} recent documents:\n`);
    docsResult.rows.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Uploaded: ${doc.created_at}\n`);
    });

    // Find strategic documents
    const strategicDocs = docsResult.rows.filter(d => 
      d.name.toLowerCase().includes('vision') ||
      d.name.toLowerCase().includes('implementation') ||
      d.name.toLowerCase().includes('immediate') ||
      d.name.toLowerCase().includes('portal') ||
      d.name.toLowerCase().includes('maturity')
    );

    if (strategicDocs.length === 0) {
      console.log('⚠️  No strategic vision documents found in recent uploads.');
      console.log('   Looking for files with: vision, implementation, immediate, portal, maturity\n');
      await pool.end();
      return;
    }

    console.log(`\n🎯 Found ${strategicDocs.length} strategic document(s):\n`);

    // Get admin token (for API calls)
    const userResult = await pool.query(`
      SELECT id, email FROM users WHERE role = 'admin' LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      console.log('❌ No admin user found. Cannot trigger drift detection via API.');
      await pool.end();
      return;
    }

    console.log(`Using admin: ${userResult.rows[0].email}\n`);
    console.log('=' .repeat(70));

    // Trigger drift detection for each document using driftDetectionService directly
    const { driftDetectionService } = await import('../src/services/driftDetectionService');

    for (const doc of strategicDocs) {
      console.log(`\n📋 Analyzing: ${doc.name}`);
      console.log(`   Document ID: ${doc.id}`);
      
      try {
        const result = await driftDetectionService.checkForDrift(projectId, doc.id);
        
        console.log(`   ✅ Drift Check Complete!`);
        console.log(`   Has Drift: ${result.hasDrift ? 'YES 🚨' : 'NO ✅'}`);
        console.log(`   Severity: ${result.severity}`);
        console.log(`   Drift Points: ${result.driftPoints.length}`);
        
        if (result.hasDrift) {
          console.log(`\n   🔍 Drift Details:`);
          result.driftPoints.slice(0, 5).forEach((dp, idx) => {
            console.log(`      ${idx + 1}. [${dp.entityType}] ${dp.driftType}`);
            console.log(`         ${dp.description?.substring(0, 100)}...`);
          });
          
          if (result.driftPoints.length > 5) {
            console.log(`      ... and ${result.driftPoints.length - 5} more drift points`);
          }
        }
        
        console.log(`\n   Summary: ${result.summary}`);
        
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n' + '=' .repeat(70));
    console.log('\n✨ DRIFT DETECTION COMPLETE!\n');

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

triggerDriftDetection();

