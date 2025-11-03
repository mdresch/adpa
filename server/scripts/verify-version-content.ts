import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

async function verifyContent() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const documentId = '51d1309c-1b8f-4679-be7e-b4365d53463e'
    
    console.log('\n🔍 Checking version content lengths...\n')
    
    // Check snapshot v1.0.0
    const snapshot = await pool.query(`
      SELECT 
        semantic_version,
        LENGTH(content) as content_length,
        LEFT(content, 200) as content_preview,
        RIGHT(content, 200) as content_end
      FROM document_versions
      WHERE document_id = $1
      ORDER BY created_at ASC
      LIMIT 1
    `, [documentId])
    
    if (snapshot.rows.length > 0) {
      console.log('📸 v1.0.0 (Snapshot in document_versions):')
      console.log(`   Content Length: ${snapshot.rows[0].content_length} characters`)
      console.log(`   Approx Word Count: ${Math.round(snapshot.rows[0].content_length / 5)} words`)
      console.log(`   First 200 chars: ${snapshot.rows[0].content_preview}`)
      console.log(`   Last 200 chars: ${snapshot.rows[0].content_end}`)
      console.log('')
    } else {
      console.log('❌ No snapshot found!\n')
    }
    
    // Check current v1.0.1
    const current = await pool.query(`
      SELECT 
        semantic_version,
        LENGTH(content) as content_length,
        LEFT(content, 200) as content_preview,
        RIGHT(content, 200) as content_end
      FROM documents
      WHERE id = $1
    `, [documentId])
    
    if (current.rows.length > 0) {
      console.log('📄 v1.0.1 (Current in documents):')
      console.log(`   Content Length: ${current.rows[0].content_length} characters`)
      console.log(`   Approx Word Count: ${Math.round(current.rows[0].content_length / 5)} words`)
      console.log(`   First 200 chars: ${current.rows[0].content_preview}`)
      console.log(`   Last 200 chars: ${current.rows[0].content_end}`)
      console.log('')
    }
    
    // Check if content was truncated
    if (snapshot.rows.length > 0 && current.rows.length > 0) {
      const originalLength = snapshot.rows[0].content_length
      const currentLength = current.rows[0].content_length
      const percentChange = ((currentLength - originalLength) / originalLength * 100).toFixed(1)
      
      console.log(`\n📊 Content Change Analysis:`)
      console.log(`   Original (v1.0.0): ${originalLength} chars`)
      console.log(`   Current (v1.0.1):  ${currentLength} chars`)
      console.log(`   Change: ${percentChange}%`)
      
      if (currentLength < originalLength * 0.6) {
        console.log(`\n⚠️ WARNING: Content was reduced by more than 40%!`)
        console.log(`   This suggests the document may have been truncated during edit.`)
      } else {
        console.log(`\n✅ Content change looks reasonable for a manual edit.`)
      }
    }
    
  } catch (error: any) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

verifyContent()

