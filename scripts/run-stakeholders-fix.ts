/**
 * Script to fix stakeholders table schema
 */

import { pool } from '../server/src/database/connection'
import { logger } from '../server/src/utils/logger'
import * as fs from 'fs'
import * as path from 'path'

async function fixStakeholdersTable() {
  try {
    logger.info('🔧 Starting stakeholders table fix...')

    // Read the SQL fix script
    const sqlPath = path.join(__dirname, 'fix-stakeholders-table.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Execute the SQL
    await pool.query(sql)

    logger.info('✅ Stakeholders table has been fixed successfully')
    
    // Verify the table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'stakeholders'
      ORDER BY ordinal_position
    `)
    
    logger.info('\n📋 Stakeholders table structure:')
    result.rows.forEach(row => {
      logger.info(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
    })

  } catch (error) {
    logger.error('❌ Error fixing stakeholders table:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the script
fixStakeholdersTable()
  .then(() => {
    logger.info('✅ Stakeholders table fix completed')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('❌ Stakeholders table fix failed:', error)
    process.exit(1)
  })

