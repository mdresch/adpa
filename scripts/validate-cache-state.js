const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
});

async function validateCacheState() {
  try {
    console.log('🔍 Validating Summary Cache State\n');
    console.log('=' .repeat(60));
    
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM document_summaries');
    const totalCount = parseInt(countResult.rows[0].count);
    
    console.log(`\n📊 Total Cached Summaries: ${totalCount}\n`);
    
    if (totalCount === 0) {
      console.log('❌ No summaries in cache yet');
      await pool.end();
      return;
    }
    
    // Get breakdown by compression level
    const levelBreakdown = await pool.query(`
      SELECT 
        compression_level,
        COUNT(*) as count,
        AVG(compression_ratio) as avg_ratio
      FROM document_summaries
      GROUP BY compression_level
      ORDER BY compression_level DESC
    `);
    
    console.log('📈 Breakdown by Compression Level:');
    levelBreakdown.rows.forEach(row => {
      const level = (row.compression_level * 100).toFixed(0);
      console.log(`  ${level}% compression: ${row.count} summaries (avg ratio: ${(row.avg_ratio * 100).toFixed(1)}%)`);
    });
    
    // Get breakdown by AI provider
    const providerBreakdown = await pool.query(`
      SELECT 
        ai_provider,
        COUNT(*) as count,
        SUM(times_reused) as total_reuses
      FROM document_summaries
      GROUP BY ai_provider
      ORDER BY count DESC
    `);
    
    console.log('\n🤖 Breakdown by AI Provider:');
    providerBreakdown.rows.forEach(row => {
      console.log(`  ${row.ai_provider}: ${row.count} summaries, ${row.total_reuses} reuses`);
    });
    
    // Get recent summaries with reuse info
    const recentSummaries = await pool.query(`
      SELECT 
        ds.id,
        d.name as document_name,
        ds.compression_method,
        ds.compression_level,
        ds.ai_provider,
        ds.times_reused,
        ds.last_reused_at,
        ds.created_at
      FROM document_summaries ds
      LEFT JOIN documents d ON ds.document_id = d.id
      ORDER BY ds.created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📄 Recent Summaries (Top 10):');
    console.log('─'.repeat(60));
    recentSummaries.rows.forEach((row, i) => {
      const level = (row.compression_level * 100).toFixed(0);
      const reused = row.times_reused > 0 ? `✅ Reused ${row.times_reused}x` : '⏳ Not yet reused';
      console.log(`${i + 1}. ${row.document_name || 'Unknown'}`);
      console.log(`   Method: ${row.compression_method} @ ${level}% | Provider: ${row.ai_provider}`);
      console.log(`   ${reused} | Created: ${new Date(row.created_at).toLocaleString()}`);
      if (row.last_reused_at) {
        console.log(`   Last reused: ${new Date(row.last_reused_at).toLocaleString()}`);
      }
      console.log('');
    });
    
    // Check for any summaries that have been reused
    const reusedCount = await pool.query(
      'SELECT COUNT(*) as count FROM document_summaries WHERE times_reused > 0'
    );
    const reusedTotal = parseInt(reusedCount.rows[0].count);
    
    console.log('─'.repeat(60));
    console.log(`\n💡 Cache Performance:`);
    console.log(`   Total summaries: ${totalCount}`);
    console.log(`   Summaries reused: ${reusedTotal} (${((reusedTotal / totalCount) * 100).toFixed(1)}%)`);
    console.log(`   Fresh summaries: ${totalCount - reusedTotal}\n`);
    
    if (reusedTotal === 0) {
      console.log('💡 Tip: Run another process-flow job with the same project/documents');
      console.log('   to test cache reuse. "Times Reused" should increment!');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

validateCacheState();

