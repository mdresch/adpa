/**
 * Enhance Integration Management Plan Template
 * Updates the template with comprehensive structure for high-quality document generation
 */

import { pool } from '../src/database/connection'
import { logger } from '../src/utils/logger'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function enhanceTemplate() {
  logger.info('🚀 Starting Integration Management Plan template enhancement...')
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../migrations/enhance-integration-management-template.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    
    // Execute the update
    logger.info('📝 Applying template enhancements...')
    await pool.query(sql)
    
    // Verify the update
    const result = await pool.query(`
      SELECT 
        id,
        name,
        framework,
        category,
        description,
        (content::jsonb -> 'metadata' ->> 'version') as version,
        jsonb_array_length(content::jsonb -> 'sections') as section_count,
        updated_at
      FROM templates
      WHERE name = 'Project Integration Management Plan'
        AND framework = 'PMBOK'
    `)
    
    if (result.rows.length > 0) {
      const template = result.rows[0]
      logger.info('✅ Template enhanced successfully!')
      logger.info('📊 Template Details:', {
        id: template.id,
        name: template.name,
        version: template.version,
        sectionCount: template.section_count,
        updatedAt: template.updated_at
      })
      logger.info('📝 Description:', template.description)
    } else {
      logger.warn('⚠️  Template not found. It may not exist yet.')
    }
    
    logger.info('✨ Enhancement complete!')
    
  } catch (error) {
    logger.error('❌ Enhancement failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the enhancement
enhanceTemplate()
  .then(() => {
    console.log('\n✅ Template enhancement completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Enhancement failed:', error)
    process.exit(1)
  })

