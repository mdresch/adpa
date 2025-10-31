const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({ 
  connectionString,
  ssl: (connectionString?.includes('supabase.co') || connectionString?.includes('azure') || process.env.DB_SSL === 'true')
    ? { rejectUnauthorized: false }
    : false
});

async function checkDocumentSizes() {
  try {
    const projectId = '45083436-7e90-4ecf-aa42-e4a73c4b64b7'; // Non-Executive Portal project
    
    console.log('🔍 Checking document sizes for truncation analysis...\n');
    
    const result = await pool.query(`
      SELECT 
        name,
        word_count,
        character_count,
        LENGTH(content) as actual_chars,
        CASE 
          WHEN LENGTH(content) > 15000 THEN 'WILL BE TRUNCATED ⚠️'
          WHEN LENGTH(content) > 12000 THEN 'NEAR LIMIT 🟡'
          ELSE 'OK ✅'
        END as truncation_status,
        ROUND((LENGTH(content)::numeric / 15000) * 100, 1) as pct_of_limit
      FROM documents
      WHERE project_id = $1
      ORDER BY LENGTH(content) DESC
    `, [projectId]);
    
    console.log(`📊 Total Documents: ${result.rows.length}\n`);
    
    // Count by status
    const truncated = result.rows.filter(r => r.actual_chars > 15000);
    const nearLimit = result.rows.filter(r => r.actual_chars > 12000 && r.actual_chars <= 15000);
    const ok = result.rows.filter(r => r.actual_chars <= 12000);
    
    console.log('📈 Summary:');
    console.log(`   ✅ OK (< 12K chars):        ${ok.length} documents`);
    console.log(`   🟡 Near Limit (12-15K):     ${nearLimit.length} documents`);
    console.log(`   ⚠️  Will Be Truncated (>15K): ${truncated.length} documents\n`);
    
    console.log('📄 Top 20 Largest Documents:\n');
    
    result.rows.slice(0, 20).forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.name}`);
      console.log(`   Characters: ${doc.actual_chars?.toLocaleString()} (${doc.pct_of_limit}% of 15K limit)`);
      console.log(`   Words: ${doc.word_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Status: ${doc.truncation_status}`);
      
      if (doc.actual_chars > 15000) {
        const truncated = doc.actual_chars - 15000;
        const pctLost = ((truncated / doc.actual_chars) * 100).toFixed(1);
        console.log(`   ⚠️  Will lose: ${truncated.toLocaleString()} chars (${pctLost}% of document)`);
      }
      
      console.log('');
    });
    
    if (truncated.length > 0) {
      console.log('\n⚠️  TRUNCATION IMPACT:');
      console.log('Documents over 15K chars will have content truncated during AI extraction.');
      console.log('This may reduce extraction accuracy for those specific documents.');
      console.log('\n💡 Mitigation Options:');
      console.log('1. Increase truncation limit in code (e.g., 30K chars)');
      console.log('2. Use chunking strategy (split large docs into sections)');
      console.log('3. Extract from smaller, focused document subset');
      console.log('4. Use RAG semantic search (handles large docs automatically)');
    } else {
      console.log('\n✅ All documents are under the 15K character limit!');
      console.log('No truncation will occur during AI extraction.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.log('\n💡 Note: SSL certificate error - this is expected with Supabase.');
      console.log('The query itself is correct. Run it directly in Supabase SQL Editor:');
      console.log(`
SELECT 
  name,
  word_count,
  character_count,
  LENGTH(content) as actual_chars,
  CASE 
    WHEN LENGTH(content) > 15000 THEN 'WILL BE TRUNCATED ⚠️'
    WHEN LENGTH(content) > 12000 THEN 'NEAR LIMIT 🟡'
    ELSE 'OK ✅'
  END as truncation_status,
  ROUND((LENGTH(content)::numeric / 15000) * 100, 1) as pct_of_limit
FROM documents
WHERE project_id = '45083436-7e90-4ecf-aa42-e4a73c4b64b7'
ORDER BY LENGTH(content) DESC
LIMIT 20;
      `);
    }
  } finally {
    await pool.end();
  }
}

checkDocumentSizes();

