/**
 * Recalculate word counts for existing document versions
 * This fixes versions created before word_count calculation was added
 */
import { pool, connectDatabase } from '../src/database/connection'

async function recalculate() {
  try {
    console.log('📊 Connecting...')
    await connectDatabase()
    
    console.log('🔍 Finding versions with 0 or NULL word_count...')
    
    const updateSQL = `
      UPDATE document_versions
      SET word_count = COALESCE(
        array_length(
          regexp_split_to_array(trim(content), E'\\s+'), 
          1
        ), 
        0
      )
      WHERE word_count IS NULL OR word_count = 0
      AND content IS NOT NULL
      AND trim(content) != '';
    `
    
    const result = await pool.query(updateSQL)
    
    console.log(`✅ Updated ${result.rowCount} version(s) with recalculated word counts`)
    
    // Show updated versions
    const checkSQL = `
      SELECT id, version, document_id, word_count, 
             length(content) as content_length
      FROM document_versions
      ORDER BY created_at DESC
      LIMIT 10;
    `
    
    const check = await pool.query(checkSQL)
    console.log('\n📋 Recent versions:')
    check.rows.forEach(row => {
      console.log(`   v${row.version}: ${row.word_count} words (${row.content_length} chars)`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

recalculate()

