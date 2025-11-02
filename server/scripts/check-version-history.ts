import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
})

async function checkVersionHistory() {
  const documentId = '5775ebe4-78c5-4005-888b-8fca43439c32'
  
  try {
    console.log('Checking version history for document:', documentId)
    
    const result = await pool.query(`
      SELECT id, document_id, version, semantic_version, created_at, author_id, change_type
      FROM document_versions 
      WHERE document_id = $1 
      ORDER BY created_at DESC
    `, [documentId])
    
    console.log('\n📚 Version History:')
    console.log('─'.repeat(80))
    if (result.rows.length === 0) {
      console.log('No versions found in document_versions table')
    } else {
      result.rows.forEach(row => {
        console.log(`Version: ${row.semantic_version} (${row.version})`)
        console.log(`  Created: ${row.created_at}`)
        console.log(`  Type: ${row.change_type}`)
        console.log(`  Author ID: ${row.author_id}`)
        console.log('─'.repeat(80))
      })
    }
    
    // Also check current document version
    const docResult = await pool.query(`
      SELECT id, name, version, semantic_version, updated_at
      FROM documents
      WHERE id = $1
    `, [documentId])
    
    console.log('\n📄 Current Document:')
    console.log('─'.repeat(80))
    if (docResult.rows.length > 0) {
      const doc = docResult.rows[0]
      console.log(`Name: ${doc.name}`)
      console.log(`Current Version: ${doc.semantic_version} (${doc.version})`)
      console.log(`Updated: ${doc.updated_at}`)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkVersionHistory()

