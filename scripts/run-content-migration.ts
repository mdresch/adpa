import { pool } from '../server/src/database/connection'
import { logger } from '../server/src/utils/logger'
import * as fs from 'fs'
import * as path from 'path'

async function migrateContentToText() {
  try {
    logger.info('🔧 Starting content column migration from JSONB to TEXT...')
    
    // Check current state
    const beforeResult = await pool.query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN content IS NOT NULL THEN 1 END) as with_content
      FROM documents
    `)
    logger.info(`Found ${beforeResult.rows[0].total} documents, ${beforeResult.rows[0].with_content} with content`)
    
    // Read and execute the migration SQL
    const sqlPath = path.join(__dirname, 'migrate-content-to-text.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    await pool.query(sql)
    
    logger.info('✅ Migration completed successfully!')
    
    // Verify the new schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name = 'content'
    `)
    
    logger.info(`Content column type is now: ${schemaResult.rows[0].data_type}`)
    
    // Sample a document to verify
    const sampleResult = await pool.query(`
      SELECT id, name, 
             LEFT(content, 100) as content_preview,
             LENGTH(content) as content_length
      FROM documents
      WHERE content IS NOT NULL
      LIMIT 1
    `)
    
    if (sampleResult.rows.length > 0) {
      const sample = sampleResult.rows[0]
      logger.info('\n📄 Sample document:')
      logger.info(`  ID: ${sample.id}`)
      logger.info(`  Name: ${sample.name}`)
      logger.info(`  Content Length: ${sample.content_length} characters`)
      logger.info(`  Content Preview: ${sample.content_preview}...`)
    }
    
  } catch (error) {
    logger.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrateContentToText()
  .then(() => {
    logger.info('✅ Content migration completed')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('❌ Content migration failed:', error)
    process.exit(1)
  })

