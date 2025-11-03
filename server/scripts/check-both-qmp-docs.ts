import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function checkBothQMPDocs() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    const projectId = 'e2a51657-eb85-4d7a-b5bc-51316149a4ed'

    console.log('\n📊 All Quality Management Plan Documents:\n')

    const docs = await pool.query(
      `SELECT 
        id,
        name,
        semantic_version,
        version,
        status,
        is_regeneration,
        parent_document_id,
        created_at,
        updated_at,
        template_id,
        template_version
       FROM documents
       WHERE project_id = $1
       AND name LIKE '%Quality Management%'
       ORDER BY created_at ASC`,
      [projectId]
    )

    console.log(`Found ${docs.rows.length} document(s):\n`)

    docs.rows.forEach((doc, idx) => {
      console.log(`${idx + 1}. "${doc.name}"`)
      console.log(`   ID: ${doc.id}`)
      console.log(`   Version: ${doc.version} (${doc.semantic_version})`)
      console.log(`   Status: ${doc.status}`)
      console.log(`   Is Regeneration: ${doc.is_regeneration}`)
      console.log(`   Parent ID: ${doc.parent_document_id || 'None (root)'}`)
      console.log(`   Template ID: ${doc.template_id}`)
      console.log(`   Template Version: ${doc.template_version}`)
      console.log(`   Created: ${doc.created_at}`)
      console.log(`   Updated: ${doc.updated_at}`)
      console.log('')
    })

    // Check what the API would return
    console.log('\n🔍 What the API /projects/:id/documents returns:\n')
    
    const apiQuery = await pool.query(
      `SELECT 
        d.id,
        d.name,
        d.status,
        d.semantic_version as version,
        d.created_at,
        d.updated_at,
        t.name as template_name
       FROM documents d
       LEFT JOIN templates t ON d.template_id = t.id
       WHERE d.project_id = $1
       ORDER BY d.created_at DESC`,
      [projectId]
    )

    console.log(`API would return ${apiQuery.rows.length} total documents:\n`)
    
    const qmpDocs = apiQuery.rows.filter(d => d.name.includes('Quality Management'))
    console.log(`Quality Management Plan documents in API response: ${qmpDocs.length}\n`)
    
    qmpDocs.forEach((doc, idx) => {
      console.log(`${idx + 1}. "${doc.name}"`)
      console.log(`   Version: ${doc.version}`)
      console.log(`   Status: ${doc.status}`)
      console.log(`   Template: ${doc.template_name}`)
      console.log(`   ID: ${doc.id}`)
      console.log('')
    })

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkBothQMPDocs()

