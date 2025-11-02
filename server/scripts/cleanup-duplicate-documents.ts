import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
})

async function cleanupDuplicates() {
  const projectId = 'd5396430-afde-466d-8240-9ff98e4cb419'
  
  try {
    console.log('🧹 Cleaning up duplicate version documents...')
    console.log('─'.repeat(80))
    
    // For each template, keep only the LATEST version and soft-delete older ones
    const result = await pool.query(`
      WITH ranked_docs AS (
        SELECT 
          d.id,
          d.name,
          d.template_id,
          d.semantic_version,
          d.version,
          ROW_NUMBER() OVER (
            PARTITION BY d.template_id 
            ORDER BY d.created_at DESC
          ) as rn
        FROM documents d
        WHERE d.project_id = $1 
          AND d.deleted_at IS NULL
          AND d.template_id IS NOT NULL
      )
      SELECT id, name, semantic_version
      FROM ranked_docs
      WHERE rn > 1  -- All except the latest version
      ORDER BY name, semantic_version
    `, [projectId])
    
    console.log(`Found ${result.rows.length} duplicate version documents to clean up:\n`)
    
    if (result.rows.length === 0) {
      console.log('✅ No duplicates found - library is clean!')
      return
    }
    
    result.rows.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.name} (v${doc.semantic_version})`)
      console.log(`   ID: ${doc.id}`)
    })
    
    console.log('\n❓ These will be soft-deleted (can be restored later)')
    console.log('─'.repeat(80))
    
    // Soft delete the duplicates
    const deleteResult = await pool.query(`
      WITH ranked_docs AS (
        SELECT 
          d.id,
          ROW_NUMBER() OVER (
            PARTITION BY d.template_id 
            ORDER BY d.created_at DESC
          ) as rn
        FROM documents d
        WHERE d.project_id = $1 
          AND d.deleted_at IS NULL
          AND d.template_id IS NOT NULL
      )
      UPDATE documents
      SET deleted_at = NOW()
      WHERE id IN (
        SELECT id FROM ranked_docs WHERE rn > 1
      )
      RETURNING id, name, semantic_version
    `, [projectId])
    
    console.log(`\n✅ Soft-deleted ${deleteResult.rowCount} duplicate documents`)
    
    // Show what remains
    const remainingResult = await pool.query(`
      SELECT 
        d.id,
        d.name,
        d.semantic_version,
        t.name as template_name
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1 
        AND d.deleted_at IS NULL
      ORDER BY d.created_at DESC
    `, [projectId])
    
    console.log(`\n📚 Remaining Active Documents: ${remainingResult.rowCount}`)
    console.log('─'.repeat(80))
    remainingResult.rows.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.name} (v${doc.semantic_version})`)
      console.log(`   Template: ${doc.template_name}`)
    })
    console.log('─'.repeat(80))
    
    console.log('\n🎉 Cleanup complete! Document library is now clean.')
    console.log('💡 Note: Deleted documents can be restored from trash if needed.')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

cleanupDuplicates()

