/**
 * Add Template Metadata to Documents
 * Migrates the database to store comprehensive template metadata with each document
 */

import { pool } from '../src/database/connection'
import { logger } from '../src/utils/logger'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  logger.info('🚀 Adding template metadata tracking to documents...')
  
  try {
    // Read the migration SQL
    const sqlPath = path.join(__dirname, '../migrations/add-template-metadata-to-documents.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    
    // Execute the migration
    logger.info('📝 Running migration...')
    await pool.query(sql)
    
    logger.info('✅ Migration completed successfully!')
    
    // Verify the changes
    const columnCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name IN ('template_version', 'template_author', 'template_metadata', 'generation_metadata')
      ORDER BY column_name
    `)
    
    logger.info('📊 New columns added:', {
      columns: columnCheck.rows.map(r => `${r.column_name} (${r.data_type})`)
    })
    
    // Check if template_usage table was created
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'template_usage'
    `)
    
    if (tableCheck.rows.length > 0) {
      logger.info('✅ template_usage table created successfully')
    }
    
    // Check if view was created
    const viewCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name = 'template_statistics'
    `)
    
    if (viewCheck.rows.length > 0) {
      logger.info('✅ template_statistics view created successfully')
    }
    
    logger.info('🎉 Template metadata tracking is now enabled!')
    
  } catch (error) {
    logger.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✅ Template metadata tracking enabled!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })

