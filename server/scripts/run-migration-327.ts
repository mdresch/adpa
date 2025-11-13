/**
 * Run Migration 327: Performance Actuals (TASK-184)
 * 
 * This script creates the performance_actuals table for PMBOK 8 Measurement Domain
 * Tracks actual vs. planned performance across schedule, cost, scope, and quality
 * Automatically calculates variances (schedule, cost, progress)
 * 
 * Usage:
 *   npm run migrate:327
 *   npx tsx server/scripts/run-migration-327.ts
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
    console.log('🚀 Running Migration 327: Performance Actuals (TASK-184)\n')
    
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/327_performance_actuals.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📊 Migration size:', migrationSQL.length, 'characters\n')
    
    // Check if table already exists
    console.log('🔍 Checking if performance_actuals table exists...')
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'performance_actuals'
      )
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Table performance_actuals already exists')
      console.log('   Migration may have already been run.\n')
      
      // Check table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'performance_actuals'
        ORDER BY ordinal_position
      `)
      
      console.log('📋 Current table structure:')
      columnsResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`)
      })
      
      console.log('\n💡 To re-run migration, drop the table first:')
      console.log('   DROP TABLE IF EXISTS performance_actuals CASCADE;')
      console.log('   Then run this script again.\n')
      
      // Ask if user wants to continue
      console.log('⚠️  Skipping migration - table already exists')
      return
    }
    
    // Execute migration
    console.log('🔄 Executing migration...')
    await client.query('BEGIN')
    
    try {
      // Execute the migration SQL
      await client.query(migrationSQL)
      await client.query('COMMIT')
      
      console.log('✅ Migration executed successfully\n')
      
      // Verify table was created
      console.log('🔍 Verifying table creation...')
      const verifyResult = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = 'performance_actuals'
        ORDER BY ordinal_position
      `)
      
      if (verifyResult.rows.length > 0) {
        console.log('\n✅ Table performance_actuals created with columns:')
        verifyResult.rows.forEach(row => {
          const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'
          const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : ''
          console.log(`   - ${row.column_name}: ${row.data_type} ${nullable}${defaultVal}`)
        })
      }
      
      // Verify indexes
      console.log('\n🔍 Verifying indexes...')
      const indexResult = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'performance_actuals'
        ORDER BY indexname
      `)
      
      if (indexResult.rows.length > 0) {
        console.log('\n✅ Indexes created:')
        indexResult.rows.forEach(row => {
          console.log(`   - ${row.indexname}`)
        })
      }
      
      // Verify constraints
      console.log('\n🔍 Verifying constraints...')
      const constraintResult = await client.query(`
        SELECT 
          conname as constraint_name,
          contype as constraint_type,
          pg_get_constraintdef(oid) as constraint_definition
        FROM pg_constraint
        WHERE conrelid = 'performance_actuals'::regclass
        ORDER BY contype, conname
      `)
      
      if (constraintResult.rows.length > 0) {
        console.log('\n✅ Constraints:')
        constraintResult.rows.forEach(row => {
          const typeMap: Record<string, string> = {
            'p': 'PRIMARY KEY',
            'u': 'UNIQUE',
            'f': 'FOREIGN KEY',
            'c': 'CHECK'
          }
          const type = typeMap[row.constraint_type] || row.constraint_type
          console.log(`   - ${row.constraint_name}: ${type}`)
          if (row.constraint_type === 'c') {
            console.log(`     ${row.constraint_definition}`)
          }
        })
      }
      
      // Verify triggers
      console.log('\n🔍 Verifying triggers...')
      const triggerResult = await client.query(`
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers
        WHERE event_object_table = 'performance_actuals'
      `)
      
      if (triggerResult.rows.length > 0) {
        console.log('\n✅ Triggers:')
        triggerResult.rows.forEach(row => {
          console.log(`   - ${row.trigger_name}: ${row.action_timing} ${row.event_manipulation}`)
        })
      }
      
      // Verify variance calculation function
      console.log('\n🔍 Verifying variance calculation function...')
      const functionResult = await client.query(`
        SELECT routine_name, routine_type
        FROM information_schema.routines
        WHERE routine_name = 'calculate_performance_variances'
        AND routine_schema = 'public'
      `)
      
      if (functionResult.rows.length > 0) {
        console.log('\n✅ Variance calculation function created:')
        functionResult.rows.forEach(row => {
          console.log(`   - ${row.routine_name} (${row.routine_type})`)
        })
      }
      
      console.log('\n✅ Migration 327 completed successfully!')
      console.log('\n📚 Next steps:')
      console.log('   1. Add performance_actuals to ENTITY_TYPES in queueService.ts')
      console.log('   2. Implement extraction logic in projectDataExtractionService.ts')
      console.log('   3. Create API routes for performance actuals')
      console.log('   4. Add frontend UI components for performance dashboard')
      console.log('   5. Test extraction with: npm run extract:single performance_actuals <projectId>')
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
    
  } catch (error) {
    logger.error('Migration failed:', error)
    console.error('\n❌ Migration failed:', error instanceof Error ? error.message : error)
    console.error('\nStack trace:', error instanceof Error ? error.stack : 'N/A')
    process.exit(1)
  } finally {
    client.release()
    // Don't close the pool - let it stay open for other operations
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Migration interrupted by user')
  const pool = getDatabasePool()
  await pool.end()
  process.exit(1)
})

process.on('SIGTERM', async () => {
  logger.info('Migration terminated')
  const pool = getDatabasePool()
  await pool.end()
  process.exit(1)
})

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

