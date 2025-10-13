import { pool } from '../server/src/database/connection'
import { logger } from '../server/src/utils/logger'

async function checkDocumentsSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `)
    
    logger.info('Documents table schema:')
    result.rows.forEach(row => {
      logger.info(`  ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`)
    })
    
    // Check specifically for content column
    const contentCol = result.rows.find(r => r.column_name === 'content')
    if (contentCol) {
      logger.info(`\nContent column type: ${contentCol.data_type}`)
      
      if (contentCol.data_type === 'jsonb' || contentCol.data_type === 'json') {
        logger.warn('⚠️  WARNING: Content column is JSON type, should be TEXT for Markdown storage!')
      } else if (contentCol.data_type === 'text') {
        logger.info('✅ Content column is TEXT - correct for Markdown storage')
      }
    }
    
  } catch (error) {
    logger.error('Error checking schema:', error)
  } finally {
    await pool.end()
  }
}

checkDocumentsSchema()

