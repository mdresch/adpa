const db = require('../src/lib/db')
import * as dotenv from 'dotenv'

dotenv.config()

async function cleanupOrphanedRegenerations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    console.log('\n🧹 Cleaning up orphaned regenerated documents...\n')

    // Find all regenerated documents (parent_document_id IS NOT NULL)
    const orphanedDocs = await db.query(
      `SELECT id, name, semantic_version, parent_document_id, created_at, project_id
       FROM documents
       WHERE parent_document_id IS NOT NULL
       AND is_regeneration = true
       ORDER BY created_at DESC`
    )

    console.log(`Found ${orphanedDocs.rows.length} orphaned regeneration(s):\n`)

    if (orphanedDocs.rows.length === 0) {
      console.log('✅ No orphaned documents to clean up!\n')
      return
    }

    orphanedDocs.rows.forEach((doc, idx) => {
      console.log(`${idx + 1}. "${doc.name}"`)
      console.log(`   Version: ${doc.semantic_version}`)
      console.log(`   Parent: ${doc.parent_document_id}`)
      console.log(`   Created: ${doc.created_at}`)
      console.log(`   ID: ${doc.id}`)
      console.log('')
    })

    console.log('⚠️  These documents were created by the old branching system.')
    console.log('   They should have been version updates, not new documents.\n')
    console.log('🗑️  Deleting orphaned regenerations (cascading from leaves to roots)...\n')

    // Use recursive CTE to delete in the right order (children first)
    const deleteResult = await db.query(
      `WITH RECURSIVE doc_tree AS (
        -- Find leaf nodes (documents with no children)
        SELECT d.id, d.name, d.parent_document_id, 0 as depth
        FROM documents d
        WHERE d.parent_document_id IS NOT NULL
        AND d.is_regeneration = true
        AND NOT EXISTS (
          SELECT 1 FROM documents child 
          WHERE child.parent_document_id = d.id
        )
        
        UNION ALL
        
        -- Find parents of already-found nodes
        SELECT d.id, d.name, d.parent_document_id, dt.depth + 1
        FROM documents d
        INNER JOIN doc_tree dt ON d.id = dt.parent_document_id
        WHERE d.parent_document_id IS NOT NULL
        AND d.is_regeneration = true
      )
      DELETE FROM documents
      WHERE id IN (SELECT id FROM doc_tree)
      RETURNING id, name, semantic_version`
    )

    console.log(`✅ Deleted ${deleteResult.rows.length} orphaned document(s):\n`)
    deleteResult.rows.forEach((doc, idx) => {
      console.log(`${idx + 1}. "${doc.name}" (${doc.id})`)
    })

    console.log('\n✨ Cleanup complete! Future regenerations will update in-place.\n')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    try { await db.end() } catch (e) {}}
}

cleanupOrphanedRegenerations()

