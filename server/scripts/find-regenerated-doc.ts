import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function findRegeneratedDoc() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    const originalDocId = '2ba3d4be-c79e-4379-9844-e8570786b72d'

    console.log('\n🔍 Searching for regenerated documents...\n')

    // Find documents with this as parent
    const children = await pool.query(
      `SELECT id, name, semantic_version, is_regeneration, created_at, status
       FROM documents
       WHERE parent_document_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [originalDocId]
    )

    if (children.rows.length === 0) {
      console.log('❌ No child/regenerated documents found!')
      console.log('   The regeneration service should have created a new document')
      console.log('   with parent_document_id pointing to the original.\n')
      return
    }

    console.log(`✅ Found ${children.rows.length} regenerated document(s):\n`)
    children.rows.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.name}`)
      console.log(`   Version: ${doc.semantic_version}`)
      console.log(`   Status: ${doc.status}`)
      console.log(`   Is Regeneration: ${doc.is_regeneration}`)
      console.log(`   Created: ${doc.created_at}`)
      console.log(`   ID: ${doc.id}`)
      console.log('')
    })

    // Also check for documents with similar name
    const similarDocs = await pool.query(
      `SELECT id, name, semantic_version, is_regeneration, created_at
       FROM documents
       WHERE name LIKE '%Quality Management Plan%'
       AND project_id = (SELECT project_id FROM documents WHERE id = $1)
       ORDER BY created_at DESC`,
      [originalDocId]
    )

    console.log(`\n📋 All "Quality Management Plan" documents in project:\n`)
    similarDocs.rows.forEach((doc, idx) => {
      const isCurrent = doc.id === originalDocId ? ' ⭐ (CURRENT)' : ''
      console.log(`${idx + 1}. ${doc.name}${isCurrent}`)
      console.log(`   Version: ${doc.semantic_version}`)
      console.log(`   Created: ${doc.created_at}`)
      console.log(`   ID: ${doc.id}`)
      console.log('')
    })

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

findRegeneratedDoc()

