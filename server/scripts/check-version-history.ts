/**
 * Check version history for a specific document
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

async function checkVersions() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const documentId = '27776e27-675d-4038-b153-d3794ba1f4ff'
    
    console.log(`🔍 Checking version history for document: ${documentId}\n`)
    
    // Check current document
    const currentDoc = await pool.query(`
      SELECT id, name, version, semantic_version, updated_at
      FROM documents
      WHERE id = $1
    `, [documentId])
    
    console.log('📄 Current Document (documents table):')
    if (currentDoc.rows.length > 0) {
      const doc = currentDoc.rows[0]
      console.log(`   Name: ${doc.name}`)
      console.log(`   Version: ${doc.version}`)
      console.log(`   Semantic Version: ${doc.semantic_version}`)
      console.log(`   Updated: ${doc.updated_at}`)
    } else {
      console.log('   ❌ Not found!')
    }
    
    // Check version history
    console.log('\n📚 Version History (document_versions table):')
    const versions = await pool.query(`
      SELECT id, version, semantic_version, change_type, change_description, created_at
      FROM document_versions
      WHERE document_id = $1
      ORDER BY created_at DESC
    `, [documentId])
    
    if (versions.rows.length > 0) {
      versions.rows.forEach((v, i) => {
        console.log(`   ${i + 1}. v${v.semantic_version} (version ${v.version})`)
        console.log(`      Type: ${v.change_type}`)
        console.log(`      Description: ${v.change_description}`)
        console.log(`      Created: ${v.created_at}`)
        console.log('')
      })
    } else {
      console.log('   ⚠️  No version history found!')
      console.log('   This means snapshots are not being saved.')
    }
    
    console.log(`\n📊 Total Versions: ${versions.rows.length} historical + 1 current = ${versions.rows.length + 1} total\n`)
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkVersions()
