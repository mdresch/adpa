import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function checkDocumentVersions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    const documentId = '2ba3d4be-c79e-4379-9844-e8570786b72d'

    console.log('\n📊 Checking Document Versions...\n')

    // Check current document version
    const currentDoc = await pool.query(
      `SELECT id, name, version, semantic_version, template_id, template_version, updated_at
       FROM documents
       WHERE id = $1`,
      [documentId]
    )

    if (currentDoc.rows.length === 0) {
      console.log('❌ Document not found!')
      return
    }

    const doc = currentDoc.rows[0]
    console.log('📄 Current Document:')
    console.log(`   Name: ${doc.name}`)
    console.log(`   Version: ${doc.version}`)
    console.log(`   Semantic Version: ${doc.semantic_version}`)
    console.log(`   Template ID: ${doc.template_id}`)
    console.log(`   Template Version: ${doc.template_version}`)
    console.log(`   Last Updated: ${doc.updated_at}`)
    console.log('')

    // Check version history
    const versions = await pool.query(
      `SELECT id, version, semantic_version, change_type, created_at
       FROM document_versions
       WHERE document_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [documentId]
    )

    console.log(`📚 Version History (${versions.rows.length} versions):\n`)
    versions.rows.forEach((v, idx) => {
      console.log(`${idx + 1}. v${v.semantic_version}`)
      console.log(`   Change Type: ${v.change_type}`)
      console.log(`   Created: ${v.created_at}`)
      console.log('')
    })

    // Check recent jobs
    const jobs = await pool.query(
      `SELECT id, status, data->>'documentId' as doc_id, created_at, completed_at
       FROM job_queue
       WHERE data->>'documentId' = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [documentId]
    )

    console.log(`🔧 Recent Jobs (${jobs.rows.length}):\n`)
    jobs.rows.forEach((j, idx) => {
      console.log(`${idx + 1}. Job ID: ${j.id}`)
      console.log(`   Status: ${j.status}`)
      console.log(`   Created: ${j.created_at}`)
      console.log(`   Completed: ${j.completed_at || 'N/A'}`)
      console.log('')
    })

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkDocumentVersions()

