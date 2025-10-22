import { Pool } from 'pg'

async function checkSummaries() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
  })

  try {
    console.log('🔍 Checking document_summaries table...\n')
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'document_summaries'
      ) as exists
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table does NOT exist yet')
      console.log('💡 Will be created on next server restart\n')
      return
    }
    
    console.log('✅ Table exists!\n')
    
    // Get table structure
    console.log('📋 Table structure:')
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_summaries' 
      ORDER BY ordinal_position
    `)
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`)
    })
    console.log('')
    
    // Check for data
    const count = await pool.query('SELECT COUNT(*) as count FROM document_summaries')
    console.log(`📊 Total summaries: ${count.rows[0].count}\n`)
    
    if (parseInt(count.rows[0].count) > 0) {
      // Show sample data
      const samples = await pool.query(`
        SELECT 
          document_id,
          compression_method,
          compression_level,
          compressed_tokens,
          ai_provider,
          times_reused,
          created_at
        FROM document_summaries 
        ORDER BY created_at DESC 
        LIMIT 5
      `)
      
      console.log('📝 Recent summaries:')
      samples.rows.forEach(s => {
        console.log(`   Doc: ${s.document_id.substring(0, 8)}... | ${(s.compression_level * 100).toFixed(0)}% | ${s.ai_provider} | ${s.compressed_tokens} tokens | Reused: ${s.times_reused}x`)
      })
    } else {
      console.log('⚠️  No summaries saved yet')
      console.log('💡 They will be saved when process-flow jobs run')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

checkSummaries()

