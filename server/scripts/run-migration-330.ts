/**
 * Run Migration 330: Fix team_agreements.project_id column type
 * 
 * This migration converts the project_id column from TEXT to UUID
 * if it's currently TEXT, fixing the "operator does not exist: text = uuid" error
 */

import dotenv from "dotenv"
import { readFileSync } from "fs"
import { join } from "path"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function runMigration() {
  try {
    // Connect to database first
    logger.info('Connecting to database...')
    await connectDatabase()
    
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error('Failed to connect to database:', error)
    throw error
  }
  
  const pool = getDatabasePool()
  const client = await pool.connect()
  
  try {
    console.log('🚀 Running Migration 330: Fix team_agreements.project_id column type')
    
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/330_fix_team_agreements_project_id_type.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📊 Migration size:', migrationSQL.length, 'characters')
    
    // Check current column type
    console.log('🔍 Checking current project_id column type...')
    const typeCheck = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'team_agreements' 
      AND column_name = 'project_id'
    `)
    
    if (typeCheck.rows.length > 0) {
      const currentType = typeCheck.rows[0].data_type
      console.log(`📋 Current project_id type: ${currentType}`)
      
      if (currentType === 'uuid') {
        console.log('✅ Column is already UUID type - migration not needed')
        return
      }
    }
    
    // Execute migration
    console.log('🔄 Executing migration...')
    await client.query('BEGIN')
    await client.query(migrationSQL)
    await client.query('COMMIT')
    
    // Verify migration
    console.log('✅ Verifying migration...')
    const verifyCheck = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'team_agreements' 
      AND column_name = 'project_id'
    `)
    
    if (verifyCheck.rows.length > 0) {
      const newType = verifyCheck.rows[0].data_type
      console.log(`📋 New project_id type: ${newType}`)
      
      if (newType === 'uuid') {
        console.log('✅ Migration 330 completed successfully!')
        console.log('✅ project_id column is now UUID type')
      } else {
        console.error('❌ Migration failed - column type is still:', newType)
        process.exit(1)
      }
    }
    
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('❌ Migration failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  } finally {
    client.release()
  }
}

runMigration().catch(console.error)

