import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function checkAnalytics() {
  try {
    // Check total AI usage in last 24 hours
    const totalResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM ai_provider_usage
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    // Check if we have request_type column
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ai_provider_usage'
      AND column_name = 'request_type'
    `);
    
    console.log('\n📊 AI Provider Usage Tracking:\n');
    console.log(`Total AI calls (24h): ${totalResult.rows[0].count}`);
    console.log(`Has request_type column: ${columnsResult.rows.length > 0 ? 'YES ✅' : 'NO ❌'}`);
    
    // Get recent quality audit AI calls
    const auditsResult = await pool.query(`
      SELECT 
        qa.id,
        qa.document_id,
        qa.ai_provider,
        qa.ai_model,
        qa.analysis_tokens,
        qa.analysis_cost,
        qa.audited_at
      FROM quality_audits qa
      WHERE qa.audited_at > NOW() - INTERVAL '24 hours'
      ORDER BY qa.audited_at DESC
      LIMIT 5
    `);
    
    console.log(`\n🔍 Quality Audits (24h): ${auditsResult.rows.length}`);
    if (auditsResult.rows.length > 0) {
      console.log('\nRecent audits:');
      auditsResult.rows.forEach((audit, i) => {
        console.log(`${i+1}. Provider: ${audit.ai_provider}, Tokens: ${audit.analysis_tokens}, Cost: $${audit.analysis_cost}`);
      });
    }
    
    // Check template improvement suggestions
    const suggestionsResult = await pool.query(`
      SELECT 
        tis.id,
        tis.analyzer_ai_provider,
        tis.analyzer_ai_model,
        tis.analysis_tokens,
        tis.analysis_cost,
        tis.created_at
      FROM template_improvement_suggestions tis
      WHERE tis.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY tis.created_at DESC
      LIMIT 5
    `);
    
    console.log(`\n💡 Template Improvements (24h): ${suggestionsResult.rows.length}`);
    if (suggestionsResult.rows.length > 0) {
      console.log('\nRecent suggestions:');
      suggestionsResult.rows.forEach((sug, i) => {
        console.log(`${i+1}. Provider: ${sug.analyzer_ai_provider}, Tokens: ${sug.analysis_tokens || 'N/A'}, Cost: $${sug.analysis_cost || 'N/A'}`);
      });
    }
    
    console.log('\n🔍 ANALYSIS:\n');
    const totalAICalls = parseInt(totalResult.rows[0].count);
    const qualityAuditAICalls = auditsResult.rows.filter(a => a.ai_provider).length;
    const templateAICalls = suggestionsResult.rows.filter(s => s.analyzer_ai_provider).length;
    
    console.log(`Total AI calls tracked in ai_provider_usage: ${totalAICalls}`);
    console.log(`Quality audit AI usage tracked in quality_audits: ${qualityAuditAICalls}`);
    console.log(`Template improvement AI usage tracked in suggestions: ${templateAICalls}`);
    
    console.log('\n💡 RECOMMENDATION:\n');
    if (qualityAuditAICalls > 0 && totalAICalls === 0) {
      console.log('❌ Quality audits are using AI but NOT recording in ai_provider_usage table');
      console.log('   This means they won\'t show up in AI Analytics dashboard');
      console.log('\n✅ FIX: Add explicit tracking after AI calls in:');
      console.log('   - qualityAuditService.ts');
      console.log('   - templateImprovementService.ts');
      console.log('   - templateOptimizationService.ts');
    } else if (qualityAuditAICalls > 0 && totalAICalls > 0) {
      console.log('✅ AI usage is being tracked!');
      console.log('   Quality audits should appear in AI Analytics dashboard');
    } else {
      console.log('⚠️  No quality audits or template improvements found in last 24 hours');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkAnalytics();

