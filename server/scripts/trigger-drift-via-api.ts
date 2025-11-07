import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import fetch from 'node-fetch';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const projectId = 'e8edf585-a14d-42dc-8009-660784d31387';
const API_URL = 'http://localhost:5000/api';

async function triggerDriftViaAPI() {
  try {
    console.log('\n🚨 TRIGGERING DRIFT DETECTION VIA API\n');
    console.log('=' .repeat(70));

    // Get admin token
    const adminResult = await pool.query(`
      SELECT id, email, password FROM users WHERE role = 'admin' LIMIT 1
    `);

    if (adminResult.rows.length === 0) {
      console.log('❌ No admin user found');
      await pool.end();
      return;
    }

    const admin = adminResult.rows[0];
    console.log(`\n👤 Admin user: ${admin.email}`);

    // Login to get token
    console.log('🔐 Authenticating...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: admin.email,
        password: 'admin123' // Default admin password
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Authentication failed. Using direct service call instead...');
      await pool.end();
      return;
    }

    const authData: any = await loginResponse.json();
    const token = authData.token;
    console.log('✅ Authenticated\n');

    // Get recent strategic documents
    const docsResult = await pool.query(`
      SELECT id, name, created_at
      FROM documents
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [projectId]);

    const strategicDocs = docsResult.rows.filter((d: any) => 
      d.name.toLowerCase().includes('vision') ||
      d.name.toLowerCase().includes('implementation') ||
      d.name.toLowerCase().includes('immediate') ||
      d.name.toLowerCase().includes('portal') ||
      d.name.toLowerCase().includes('maturity')
    );

    console.log(`📄 Found ${strategicDocs.length} strategic documents\n`);
    console.log('=' .repeat(70));

    // Trigger drift check for each
    for (const doc of strategicDocs) {
      console.log(`\n📋 Checking drift for: ${doc.name}`);
      console.log(`   Document ID: ${doc.id}`);

      try {
        const driftResponse = await fetch(`${API_URL}/drift/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            projectId,
            documentId: doc.id
          })
        });

        if (!driftResponse.ok) {
          const errorData: any = await driftResponse.json().catch(() => ({}));
          console.log(`   ❌ API Error: ${errorData.error || driftResponse.statusText}`);
          continue;
        }

        const driftData: any = await driftResponse.json();

        console.log(`   ✅ Drift Check Complete!`);
        console.log(`   Has Drift: ${driftData.driftDetected ? '🚨 YES' : '✅ NO'}`);
        console.log(`   Severity: ${driftData.severity}`);
        console.log(`   Drift Points: ${driftData.driftCount || 0}`);

        if (driftData.driftDetected && driftData.driftPoints) {
          console.log(`\n   🔍 Top Drift Points:`);
          driftData.driftPoints.slice(0, 5).forEach((dp: any, idx: number) => {
            console.log(`      ${idx + 1}. [${dp.entityType}] ${dp.driftType}`);
            if (dp.description) {
              console.log(`         ${dp.description.substring(0, 80)}...`);
            }
          });

          if (driftData.driftCount > 5) {
            console.log(`      ... and ${driftData.driftCount - 5} more`);
          }
        }

        console.log(`\n   📝 Summary: ${driftData.summary || 'No summary available'}`);

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

triggerDriftViaAPI();

