import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
})

async function checkDocumentCounts() {
  const projectId = 'd5396430-afde-466d-8240-9ff98e4cb419'
  
  try {
    console.log('Checking document counts for project:', projectId)
    console.log('─'.repeat(80))
    
    // Total documents (including deleted)
    const totalResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM documents
      WHERE project_id = $1
    `, [projectId])
    
    console.log('\n📊 Total Documents (including deleted):', totalResult.rows[0].count)
    
    // Active documents (excluding deleted)
    const activeResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM documents
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [projectId])
    
    console.log('📊 Active Documents (deleted_at IS NULL):', activeResult.rows[0].count)
    
    // Deleted documents
    const deletedResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM documents
      WHERE project_id = $1 AND deleted_at IS NOT NULL
    `, [projectId])
    
    console.log('📊 Deleted Documents (soft-deleted):', deletedResult.rows[0].count)
    
    // List all documents
    const docsResult = await pool.query(`
      SELECT 
        d.id,
        d.name,
        d.version,
        d.semantic_version,
        d.status,
        d.deleted_at,
        t.name as template_name
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1
      ORDER BY d.created_at DESC
    `, [projectId])
    
    console.log('\n📄 All Documents:')
    console.log('─'.repeat(80))
    docsResult.rows.forEach((doc, index) => {
      const deletedFlag = doc.deleted_at ? '❌ DELETED' : '✅ Active'
      console.log(`${index + 1}. ${doc.name} (v${doc.semantic_version || doc.version})`)
      console.log(`   Template: ${doc.template_name || 'None'}`)
      console.log(`   Status: ${doc.status} | ${deletedFlag}`)
      console.log(`   ID: ${doc.id}`)
      if (doc.deleted_at) {
        console.log(`   Deleted: ${doc.deleted_at}`)
      }
      console.log('─'.repeat(80))
    })
    
    // Count by status (active only)
    const statusResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM documents
      WHERE project_id = $1 AND deleted_at IS NULL
      GROUP BY status
      ORDER BY count DESC
    `, [projectId])
    
    console.log('\n📊 Documents by Status (active only):')
    console.log('─'.repeat(80))
    statusResult.rows.forEach(row => {
      console.log(`${row.status}: ${row.count}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkDocumentCounts()

