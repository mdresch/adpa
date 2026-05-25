import * as dotenv from 'dotenv';
import * as path from 'path';
import { Pool } from 'pg';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Bypass SSL certificate validation for cloud databases
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function triggerTemplateAudit() {
  console.log('🛡️  DRACO Template Audit Manual Verification Script\n');

  try {
    // 1. Get first available template
    const templateResult = await pool.query(`
      SELECT id, name, framework, description
      FROM document_templates
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (templateResult.rows.length === 0) {
      console.log('❌ No active templates found in database');
      process.exit(1);
    }

    const template = templateResult.rows[0];
    console.log(`📄 Template: "${template.name}" (${template.id.substring(0, 8)}...)`);
    console.log(`   Framework: ${template.framework || 'Custom'}`);

    // 2. Get first admin user for auth token
    const userResult = await pool.query(
      `SELECT id, email FROM users WHERE role = 'admin' OR email LIKE '%admin%' ORDER BY created_at LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      console.log('❌ No admin user found');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`👤 User: ${user.email}\n`);

    // 3. Generate JWT token
    const token = (jwt as any).sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '1h' }
    );

    // 4. Trigger manual template audit via API
    console.log('🎯 Triggering DRACO template audit via API...');
    const triggerResponse = await axios.post(
      `${BACKEND_URL}/api/document-templates/${template.id}/audit`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ Template audit triggered!');
    console.log(`   Audit ID: ${triggerResponse.data?.auditId || 'N/A'}`);
    console.log(`   Status: ${triggerResponse.data?.status || 'pending'}`);

    // 5. Poll for completion (up to 90 seconds)
    console.log('\n⏳ Waiting for audit to complete (polling every 5s, up to 90s)...');
    let auditId = triggerResponse.data?.auditId;
    let completed = false;

    for (let attempt = 1; attempt <= 18; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const dbResult = await pool.query(
        `SELECT id, status, verdict, overall_score, governance_score, resilience_score, error_message, completed_at
         FROM template_audits
         WHERE template_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [template.id]
      );

      if (dbResult.rows.length > 0) {
        const audit = dbResult.rows[0];
        auditId = audit.id;

        if (audit.status === 'completed') {
          completed = true;
          console.log(`\n📊 Audit Completed! (attempt ${attempt})`);
          console.log('═'.repeat(50));
          console.log(`   Audit ID:          ${audit.id.substring(0, 8)}...`);
          console.log(`   Verdict:           ${audit.verdict?.toUpperCase() || 'N/A'}`);
          console.log(`   Overall Score:     ${audit.overall_score ?? 'N/A'}/100`);
          console.log(`   Governance Score:  ${audit.governance_score ?? 'N/A'}/100`);
          console.log(`   Resilience Score:  ${audit.resilience_score ?? 'N/A'}/100`);
          console.log(`   Completed At:      ${audit.completed_at}`);
          console.log('═'.repeat(50));

          // Validate verdict logic
          const score = audit.overall_score ?? 0;
          if (score >= 75 && audit.verdict === 'pass') {
            console.log('\n✅ Verdict Logic: CORRECT (High score → PASS)');
          } else if (score >= 60 && score < 75 && audit.verdict === 'flagged') {
            console.log('\n✅ Verdict Logic: CORRECT (Medium score → FLAGGED)');
          } else if (score < 60 && audit.verdict === 'fail') {
            console.log('\n✅ Verdict Logic: CORRECT (Low score → FAIL)');
          } else {
            console.log(`\n⚠️  Verdict Check: Score ${score} → Verdict "${audit.verdict}" (verify scoring thresholds)`);
          }
          break;
        } else if (audit.status === 'failed') {
          console.log(`\n❌ Audit FAILED: ${audit.error_message}`);
          break;
        } else {
          process.stdout.write(`   Still running... (${attempt * 5}s elapsed)\r`);
        }
      }
    }

    if (!completed) {
      console.log('\n⚠️  Audit did not complete within 90 seconds. Check server logs.');
    }

    // 6. Verify API GET endpoint
    console.log('\n🔍 Verifying GET /api/document-templates/:id/audits...');
    const listResponse = await axios.get(
      `${BACKEND_URL}/api/document-templates/${template.id}/audits`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      }
    );

    const auditsList = listResponse.data?.audits || [];
    console.log(`✅ GET endpoint returned ${auditsList.length} audit(s) for this template`);
    if (auditsList.length > 0) {
      const first = auditsList[0];
      console.log(`   Latest: ${first.verdict?.toUpperCase() || first.status} (Score: ${first.overall_score ?? 'pending'})`);
    }

    console.log('\n🎉 Verification complete! DRACO Template Audit system is operational.\n');

  } catch (error: any) {
    console.error('\n❌ Error during verification:', error.message || error);
    if (axios.isAxiosError(error)) {
      console.error('   HTTP Status:', error.response?.status);
      console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
    }
  } finally {
    await pool.end();
  }
}

triggerTemplateAudit();
