import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function fixDuplicateVersions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    const documentId = '2ba3d4be-c79e-4379-9844-e8570786b72d'

    console.log('\n🔍 Finding duplicate version snapshots...\n')

    const duplicates = await pool.query(
      `SELECT id, version, semantic_version, change_type, created_at
       FROM document_versions
       WHERE document_id = $1
       ORDER BY created_at ASC`,
      [documentId]
    )

    console.log(`Found ${duplicates.rows.length} snapshot(s):\n`)
    duplicates.rows.forEach((v, idx) => {
      console.log(`${idx + 1}. v${v.semantic_version} (int: ${v.version})`)
      console.log(`   Change Type: ${v.change_type}`)
      console.log(`   Created: ${v.created_at}`)
      console.log(`   ID: ${v.id}`)
      console.log('')
    })

    // Find the duplicate v1.0.1 snapshot (the one that failed to update the document)
    const duplicate = await pool.query(
      `SELECT id FROM document_versions
       WHERE document_id = $1
       AND semantic_version = '1.0.1'
       AND change_type = 'template_change'
       LIMIT 1`,
      [documentId]
    )

    if (duplicate.rows.length > 0) {
      const duplicateId = duplicate.rows[0].id
      console.log(`\n🗑️  Deleting failed snapshot: ${duplicateId}\n`)
      
      await pool.query(
        'DELETE FROM document_versions WHERE id = $1',
        [duplicateId]
      )
      
      console.log('✅ Duplicate removed!\n')
      console.log('This was the snapshot saved before a failed UPDATE.')
      console.log('Since the document wasn\'t actually updated, this snapshot shouldn\'t exist.\n')
    } else {
      console.log('\n✅ No duplicate v1.0.1 found to clean up.\n')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

fixDuplicateVersions()

