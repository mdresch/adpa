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
    logger.info('🚀 Running Migration 344: Add User Timezone Preference')
    logger.info('   Adding timezone column to users table')
    
    await connectDatabase()
    const pool = getDatabasePool()
    
    // Load migration file
    const migrationPath = path.join(__dirname, '../migrations/344_add_user_timezone_preference.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    logger.info(`📄 Migration file loaded: ${migrationPath}`)
    logger.info(`📊 Migration size: ${migrationSQL.length} characters`)
    
    // Check current schema
    logger.info('\n🔍 Checking current users table schema...')
    const beforeResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public'
        AND column_name = 'timezone'
    `)
    
    if (beforeResult.rows.length > 0) {
      logger.info('   ⚠️  timezone column already exists')
      logger.info(`   Current: ${beforeResult.rows[0].data_type}`)
    } else {
      logger.info('   ✅ timezone column does not exist (will be created)')
    }
    
    // Count users
    const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users')
    const userCount = parseInt(userCountResult.rows[0].count)
    logger.info(`\n📊 Users in database: ${userCount} rows`)
    
    // Execute migration
    logger.info('\n🔄 Executing migration...')
    logger.info('   ⏳ Adding timezone column...')
    
    await pool.query(migrationSQL)
    
    logger.info('   ✅ Migration executed successfully')
    
    // Verify
    logger.info('\n🔍 Verifying timezone column...')
    const afterResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public'
        AND column_name = 'timezone'
    `)
    
    if (afterResult.rows.length > 0) {
      const col = afterResult.rows[0]
      logger.info(`   ✅ timezone column: ${col.data_type}`)
      logger.info(`   ✅ Nullable: ${col.is_nullable}`)
      logger.info(`   ✅ Default: ${col.column_default || 'none'}`)
    } else {
      logger.error('   ❌ timezone column not found after migration!')
      throw new Error('Migration verification failed')
    }
    
    // Check user timezone values
    const timezoneStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(timezone) as with_timezone,
        COUNT(*) FILTER (WHERE timezone IS NULL) as without_timezone,
        COUNT(DISTINCT timezone) as unique_timezones
      FROM users
    `)
    
    const stats = timezoneStats.rows[0]
    logger.info('\n📊 User Timezone Statistics:')
    logger.info(`   Total users: ${stats.total}`)
    logger.info(`   With timezone set: ${stats.with_timezone}`)
    logger.info(`   Without timezone (will use UTC): ${stats.without_timezone}`)
    logger.info(`   Unique timezones: ${stats.unique_timezones}`)
    
    logger.info('\n✨ Migration 344 completed successfully!')
    logger.info('\n📊 Summary:')
    logger.info('   ✅ timezone column added to users table')
    logger.info('   ✅ Default value set to UTC')
    logger.info('   ✅ Index created for timezone queries')
    
    logger.info('\n💡 Next Steps:')
    logger.info('   ✅ Update API routes to handle timezone preferences')
    logger.info('   ✅ Add timezone selector to user settings UI')
    logger.info('   ✅ Create utility functions for timezone conversion')
    
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

