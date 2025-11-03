import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Bypass SSL certificate validation for cloud databases
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function triggerTestQualityAudit() {
  console.log('🚀 Triggering test quality audit...\n');

  try {
    // 1. Get a recent document
    const docResult = await pool.query(`
      SELECT d.id, d.title, p.id as project_id, u.id as user_id
      FROM documents d
      JOIN projects p ON d.project_id = p.id
      JOIN users u ON p.created_by = u.id OR p.owner_id = u.id
      WHERE d.content IS NOT NULL
      ORDER BY d.created_at DESC
      LIMIT 1
    `);

    if (docResult.rows.length === 0) {
      console.log('❌ No documents found');
      process.exit(1);
    }

    const doc = docResult.rows[0];
    console.log(`📄 Document: ${doc.title} (${doc.id.substring(0, 8)}...)`);

    // 2. Get user token for API call
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [doc.user_id]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`👤 User: ${user.email}`);

    // 3. Generate JWT token (simple version for testing)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    console.log('\n🎯 Triggering quality audit via API...');

    // 4. Trigger quality audit via API
    const response = await axios.post(
      `http://localhost:5000/api/quality-audits/trigger`,
      {
        documentId: doc.id
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Quality audit triggered!');
    console.log('Job ID:', response.data.jobId);

    console.log('\n⏳ Waiting 30 seconds for audit to complete...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // 5. Check audit result
    const auditResult = await pool.query(`
      SELECT 
        id,
        overall_score,
        ai_provider,
        ai_model,
        analysis_tokens,
        analysis_cost,
        audited_at
      FROM quality_audits
      WHERE document_id = $1
      ORDER BY audited_at DESC
      LIMIT 1
    `, [doc.id]);

    if (auditResult.rows.length === 0) {
      console.log('⚠️  No audit found yet. Check backend logs.');
    } else {
      const audit = auditResult.rows[0];
      console.log('\n📊 Audit Result:');
      console.log(`   Audit ID: ${audit.id.substring(0, 8)}...`);
      console.log(`   Score: ${audit.overall_score}%`);
      console.log(`   Provider: ${audit.ai_provider}`);
      console.log(`   Model: ${audit.ai_model}`);
      console.log(`   Tokens: ${audit.analysis_tokens}`);
      console.log(`   Cost: $${parseFloat(audit.analysis_cost).toFixed(4)}`);

      if (audit.analysis_tokens > 0 && parseFloat(audit.analysis_cost) > 0) {
        console.log('\n✅ AI Analytics Integration: WORKING!');
      } else {
        console.log('\n❌ AI Analytics Integration: Still showing 0 tokens/cost');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
    }
  } finally {
    await pool.end();
  }
}

triggerTestQualityAudit();

