import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function debugVersionHistory() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    const documentId = '2ba3d4be-c79e-4379-9844-e8570786b72d'

    console.log('\n📊 CURRENT DOCUMENT STATE:\n')

    const current = await pool.query(
      `SELECT id, name, version, semantic_version, template_id, template_version, 
              word_count, updated_at, is_regeneration
       FROM documents
       WHERE id = $1`,
      [documentId]
    )

    if (current.rows.length === 0) {
      console.log('❌ Document not found!')
      return
    }

    const doc = current.rows[0]
    console.log('Current Document:')
    console.log(`  Name: ${doc.name}`)
    console.log(`  Version (int): ${doc.version}`)
    console.log(`  Semantic Version: ${doc.semantic_version}`)
    console.log(`  Template Version: ${doc.template_version}`)
    console.log(`  Word Count: ${doc.word_count}`)
    console.log(`  Is Regeneration: ${doc.is_regeneration}`)
    console.log(`  Updated At: ${doc.updated_at}`)
    console.log('')

    console.log('\n📚 VERSION SNAPSHOTS (document_versions table):\n')

    const snapshots = await pool.query(
      `SELECT id, version, semantic_version, change_type, change_description, 
              created_at, author_id
       FROM document_versions
       WHERE document_id = $1
       ORDER BY created_at ASC`,
      [documentId]
    )

    console.log(`Found ${snapshots.rows.length} snapshot(s):\n`)
    snapshots.rows.forEach((v, idx) => {
      console.log(`${idx + 1}. Version: ${v.version} (${v.semantic_version})`)
      console.log(`   Change Type: ${v.change_type}`)
      console.log(`   Description: ${v.change_description}`)
      console.log(`   Created: ${v.created_at}`)
      console.log(`   Author ID: ${v.author_id}`)
      console.log(`   ID: ${v.id}`)
      console.log('')
    })

    console.log('\n🔍 WHAT get_document_versions() RETURNS:\n')

    const functionResult = await pool.query(
      `SELECT * FROM get_document_versions($1)`,
      [documentId]
    )

    console.log(`Function returns ${functionResult.rows.length} row(s):\n`)
    functionResult.rows.forEach((v, idx) => {
      console.log(`${idx + 1}. ${v.semantic_version} ${v.is_current ? '(CURRENT)' : ''}`)
      console.log(`   Name: ${v.name}`)
      console.log(`   Word Count: ${v.word_count}`)
      console.log(`   Author: ${v.author_name}`)
      console.log(`   Created: ${v.created_at}`)
      console.log(`   Is Regeneration: ${v.is_regeneration}`)
      console.log('')
    })

    console.log('\n🔬 RECENT REGENERATION JOBS:\n')

    const jobs = await pool.query(
      `SELECT id, status, created_at, completed_at, data
       FROM regeneration_jobs
       WHERE original_document_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [documentId]
    )

    if (jobs.rows.length === 0) {
      console.log('❌ No regeneration jobs found in regeneration_jobs table\n')
    } else {
      console.log(`Found ${jobs.rows.length} regeneration job(s):\n`)
      jobs.rows.forEach((j, idx) => {
        console.log(`${idx + 1}. Job ID: ${j.id}`)
        console.log(`   Status: ${j.status}`)
        console.log(`   Created: ${j.created_at}`)
        console.log(`   Completed: ${j.completed_at || 'N/A'}`)
        console.log('')
      })
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

debugVersionHistory()

