import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkLatestAudit() {
  try {
    await db.initDb()
    const result = await db.query(`
      SELECT 
        id,
        overall_score,
        ai_provider,
        ai_model,
        analysis_tokens,
        analysis_cost,
        audited_at
      FROM quality_audits
      ORDER BY audited_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('No audits found');
    } else {
      const audit = result.rows[0];
      console.log('Latest Quality Audit:');
      console.log('  ID:', audit.id);
      console.log('  Score:', audit.overall_score + '%');
      console.log('  Provider:', audit.ai_provider);
      console.log('  Model:', audit.ai_model);
      console.log('  Tokens:', audit.analysis_tokens);
      console.log('  Cost (raw):', audit.analysis_cost);
      console.log('  Cost (parsed):', parseFloat(audit.analysis_cost));
      console.log('  Cost (formatted $):', `$${parseFloat(audit.analysis_cost).toFixed(6)}`);
      console.log('  Date:', audit.audited_at);

      if (audit.analysis_tokens > 0 && parseFloat(audit.analysis_cost) > 0) {
        console.log('\n✅ AI Analytics Integration: FULLY WORKING!');
        console.log('   Both tokens and cost are being captured correctly.');
      } else if (audit.analysis_tokens > 0) {
        console.log('\n⚠️  Tokens captured but cost is 0');
      } else {
        console.log('\n❌ Neither tokens nor cost captured');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

checkLatestAudit();

