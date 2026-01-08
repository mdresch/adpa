const db = require('../src/lib/db');
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Bypass SSL certificate validation for cloud databases
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function verifyAIAnalyticsIntegration() {
  console.log('🔍 Verifying AI Analytics Integration...\n');

  try {
    // 1. Check recent quality audits with token/cost data
    console.log('1️⃣ Checking Quality Audits:');
    const auditsResult = await db.query(`
      SELECT 
        id,
        document_id,
        overall_score,
        ai_provider,
        ai_model,
        analysis_tokens,
        analysis_cost,
        audited_at
      FROM quality_audits
      ORDER BY audited_at DESC
      LIMIT 5
    `);

    if (auditsResult.rows.length === 0) {
      console.log('   ⚠️  No quality audits found yet');
    } else {
      console.log(`   ✅ Found ${auditsResult.rows.length} recent quality audits:`);
      auditsResult.rows.forEach((audit, idx) => {
        console.log(`   ${idx + 1}. Audit ${audit.id.substring(0, 8)}...`);
        console.log(`      Score: ${audit.overall_score}%`);
        console.log(`      Provider: ${audit.ai_provider || 'N/A'}`);
        console.log(`      Model: ${audit.ai_model || 'N/A'}`);
        console.log(`      Tokens: ${audit.analysis_tokens || 0}`);
        console.log(`      Cost: $${parseFloat(audit.analysis_cost || 0).toFixed(4)}`);
        console.log(`      Date: ${audit.audited_at}`);
      });
    }

    // 2. Check template improvement suggestions with token/cost data
    console.log('\n2️⃣ Checking Template Improvement Suggestions:');
    const suggestionsResult = await db.query(`
      SELECT 
        id,
        template_id,
        priority,
        expected_quality_gain,
        analyzer_ai_provider,
        analyzer_ai_model,
        analysis_tokens,
        analysis_cost,
        status,
        created_at
      FROM template_improvement_suggestions
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (suggestionsResult.rows.length === 0) {
      console.log('   ⚠️  No template improvement suggestions found yet');
    } else {
      console.log(`   ✅ Found ${suggestionsResult.rows.length} recent suggestions:`);
      suggestionsResult.rows.forEach((suggestion, idx) => {
        console.log(`   ${idx + 1}. Suggestion ${suggestion.id.substring(0, 8)}...`);
        console.log(`      Priority: ${suggestion.priority}`);
        console.log(`      Expected Gain: ${suggestion.expected_quality_gain}%`);
        console.log(`      Provider: ${suggestion.analyzer_ai_provider || 'N/A'}`);
        console.log(`      Model: ${suggestion.analyzer_ai_model || 'N/A'}`);
        console.log(`      Tokens: ${suggestion.analysis_tokens || 0}`);
        console.log(`      Cost: $${parseFloat(suggestion.analysis_cost || 0).toFixed(4)}`);
        console.log(`      Status: ${suggestion.status}`);
      });
    }

    // 3. Check AI usage logs table
    console.log('\n3️⃣ Checking AI Usage Logs:');
    const usageResult = await db.query(`
      SELECT 
        provider_type,
        request_type,
        COUNT(*) as total_requests,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost
      FROM ai_usage_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY provider_type, request_type
      ORDER BY total_requests DESC
    `);

    if (usageResult.rows.length === 0) {
      console.log('   ⚠️  No AI provider usage tracked in last 24 hours');
    } else {
      console.log(`   ✅ AI Usage Logs (last 24 hours):`);
      usageResult.rows.forEach((usage, idx) => {
        console.log(`   ${idx + 1}. ${usage.provider_type} (${usage.request_type})`);
        console.log(`      Requests: ${usage.total_requests}`);
        console.log(`      Total Tokens: ${usage.total_tokens || 0}`);
        console.log(`      Total Cost: $${parseFloat(usage.total_cost || 0).toFixed(4)}`);
      });
    }

    // 4. Summary
    console.log('\n📊 Summary:');
    const withTokens = auditsResult.rows.filter(a => a.analysis_tokens > 0).length;
    const withCost = auditsResult.rows.filter(a => parseFloat(a.analysis_cost || 0) > 0).length;
    const suggWithTokens = suggestionsResult.rows.filter(s => s.analysis_tokens > 0).length;
    const suggWithCost = suggestionsResult.rows.filter(s => parseFloat(s.analysis_cost || 0) > 0).length;

    console.log(`   Quality Audits with tokens: ${withTokens}/${auditsResult.rows.length}`);
    console.log(`   Quality Audits with cost: ${withCost}/${auditsResult.rows.length}`);
    console.log(`   Template Suggestions with tokens: ${suggWithTokens}/${suggestionsResult.rows.length}`);
    console.log(`   Template Suggestions with cost: ${suggWithCost}/${suggestionsResult.rows.length}`);
    console.log(`   AI Usage Entries (24h): ${usageResult.rows.length}`);

    if (withTokens === auditsResult.rows.length && suggWithTokens === suggestionsResult.rows.length && auditsResult.rows.length > 0) {
      console.log('\n✅ AI Analytics Integration: FULLY OPERATIONAL');
    } else if (auditsResult.rows.length === 0 && suggestionsResult.rows.length === 0) {
      console.log('\n⚠️  AI Analytics Integration: NO DATA YET (need to run quality audit or template analysis)');
    } else {
      console.log('\n⚠️  AI Analytics Integration: PARTIAL (some entries missing token/cost data)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    try { await db.end() } catch (e) {}
  }
}

verifyAIAnalyticsIntegration();

