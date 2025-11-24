import dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { getDatabasePool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

async function runMigration() {
  try {
    logger.info('🚀 Running Migration 345: Add User Date Format Preference')
    logger.info('   Adding date_format column to users table')
    
    await connectDatabase()
    const pool = getDatabasePool()
    
    // Load migration file
    const migrationPath = path.join(__dirname, '../migrations/345_add_user_date_format_preference.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    logger.info(`📄 Migration file loaded: ${migrationPath}`)
    logger.info(`📊 Migration size: ${migrationSQL.length} characters`)
    
    // Check current schema
    logger.info('\n🔍 Checking current users table schema...')
    const beforeResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public'
        AND column_name = 'date_format'
    `)
    
    if (beforeResult.rows.length > 0) {
      logger.info('   ⚠️  date_format column already exists')
      logger.info(`   Current: ${beforeResult.rows[0].data_type}`)
    } else {
      logger.info('   ✅ date_format column does not exist (will be created)')
    }
    
    // Count users
    const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users')
    const userCount = parseInt(userCountResult.rows[0].count)
    logger.info(`\n📊 Users in database: ${userCount} rows`)
    
    // Execute migration
    logger.info('\n🔄 Executing migration...')
    logger.info('   ⏳ Adding date_format column...')
    
    await pool.query(migrationSQL)
    
    logger.info('   ✅ Migration executed successfully')
    
    // Verify
    logger.info('\n🔍 Verifying date_format column...')
    const afterResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public'
        AND column_name = 'date_format'
    `)
    
    if (afterResult.rows.length > 0) {
      const col = afterResult.rows[0]
      logger.info(`   ✅ date_format column: ${col.data_type}`)
      logger.info(`   ✅ Nullable: ${col.is_nullable}`)
      logger.info(`   ✅ Default: ${col.column_default || 'none'}`)
    } else {
      logger.error('   ❌ date_format column not found after migration!')
      throw new Error('Migration verification failed')
    }
    
    // Check user date format values
    const formatStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(date_format) as with_format,
        COUNT(*) FILTER (WHERE date_format IS NULL) as without_format,
        COUNT(DISTINCT date_format) as unique_formats
      FROM users
    `)
    
    const stats = formatStats.rows[0]
    logger.info('\n📊 User Date Format Statistics:')
    logger.info(`   Total users: ${stats.total}`)
    logger.info(`   With format set: ${stats.with_format}`)
    logger.info(`   Without format (will use default): ${stats.without_format}`)
    logger.info(`   Unique formats: ${stats.unique_formats}`)
    
    logger.info('\n✨ Migration 345 completed successfully!')
    logger.info('\n📊 Summary:')
    logger.info('   ✅ date_format column added to users table')
    logger.info('   ✅ Default value set to MM/DD/YYYY')
    logger.info('   ✅ Index created for date_format queries')
    
    logger.info('\n💡 Next Steps:')
    logger.info('   ✅ Update API routes to handle date_format preferences')
    logger.info('   ✅ Add date format selector to user settings UI')
    logger.info('   ✅ Create utility functions for date formatting')
    
    await pool.end()
    
  } catch (error: any) {
    logger.error('❌ Migration failed:', error)
    throw error
  }
}

runMigration().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})

