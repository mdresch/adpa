import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function checkAIUsage() {
  try {
    // Check ai_usage_logs
    const logsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM ai_usage_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    console.log('\n📊 AI Usage Tracking (Last 24 Hours):\n');
    console.log(`ai_usage_logs entries: ${logsResult.rows[0].count}`);
    
    // Check quality audits
    const auditsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ai_provider IS NOT NULL THEN 1 END) as with_provider,
        SUM(analysis_tokens) as total_tokens,
        SUM(analysis_cost) as total_cost
      FROM quality_audits
      WHERE audited_at > NOW() - INTERVAL '24 hours'
    `);
    
    console.log(`\nQuality Audits (24h):`);
    console.log(`  Total: ${auditsResult.rows[0].total}`);
    console.log(`  With AI Provider: ${auditsResult.rows[0].with_provider}`);
    console.log(`  Total Tokens: ${auditsResult.rows[0].total_tokens || 0}`);
    console.log(`  Total Cost: $${parseFloat(auditsResult.rows[0].total_cost || 0).toFixed(4)}`);
    
    // Check template improvements
    const improvementsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN analyzer_ai_provider IS NOT NULL THEN 1 END) as with_provider,
        SUM(analysis_tokens) as total_tokens,
        SUM(analysis_cost) as total_cost
      FROM template_improvement_suggestions
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    console.log(`\nTemplate Improvements (24h):`);
    console.log(`  Total: ${improvementsResult.rows[0].total}`);
    console.log(`  With AI Provider: ${improvementsResult.rows[0].with_provider}`);
    console.log(`  Total Tokens: ${improvementsResult.rows[0].total_tokens || 0}`);
    console.log(`  Total Cost: $${parseFloat(improvementsResult.rows[0].total_cost || 0).toFixed(4)}`);
    
    console.log('\n🔍 ANALYSIS:\n');
    
    const totalAIUsage = parseInt(logsResult.rows[0].count);
    const qualityAuditsWithAI = parseInt(auditsResult.rows[0].with_provider);
    const improvementsWithAI = parseInt(improvementsResult.rows[0].with_provider);
    const qualityTokens = parseInt(auditsResult.rows[0].total_tokens || 0);
    const improvementTokens = parseInt(improvementsResult.rows[0].total_tokens || 0);
    
    if (qualityAuditsWithAI > 0 || improvementsWithAI > 0) {
      console.log(`✅ Quality audits and template improvements ARE using AI:`);
      console.log(`   - ${qualityAuditsWithAI} quality audits with AI`);
      console.log(`   - ${improvementsWithAI} template improvements with AI`);
      console.log(`   - ${qualityTokens + improvementTokens} total tokens used`);
      
      if (totalAIUsage === 0) {
        console.log('\n❌ BUT: ai_usage_logs table is empty');
        console.log('   Quality audit AI usage is NOT being tracked in centralized analytics');
        console.log('\n💡 TODO (from memories):');
        console.log('   "Integrate AI extraction jobs into AI analytics dashboard"');
        console.log('   Need to add tracking to qualityAuditService, templateImprovementService');
      } else {
        console.log('\n✅ AND: ai_usage_logs has entries');
        console.log(`   ${totalAIUsage} AI calls tracked in central analytics`);
        console.log('   Need to verify if quality audits are included');
      }
    } else {
      console.log('⚠️  No quality audits or template improvements with AI found');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkAIUsage();

