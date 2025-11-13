/**
 * Run Migration 326: Development Approach Metadata (TASK-90)
 * 
 * This script creates the development_approach table for PMBOK 8 Domain 3
 * Project-level metadata: ONE record per project storing methodology selection,
 * justification, context factors, and tailoring decisions.
 * 
 * Usage:
 *   npm run migrate:326
 *   npx tsx server/scripts/run-migration-326.ts
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
    console.log('🚀 Running Migration 326: Development Approach Metadata (TASK-90)\n')
    
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/326_development_approach_metadata.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📊 Migration size:', migrationSQL.length, 'characters\n')
    
    // Check if table already exists
    console.log('🔍 Checking if development_approach table exists...')
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'development_approach'
      )
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Table development_approach already exists')
      console.log('   Migration may have already been run.\n')
      
      // Check table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'development_approach'
        ORDER BY ordinal_position
      `)
      
      console.log('📋 Current table structure:')
      columnsResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`)
      })
      
      console.log('\n💡 To re-run migration, drop the table first:')
      console.log('   DROP TABLE IF EXISTS development_approach CASCADE;')
      console.log('   Then run this script again.\n')
      
      // Ask if user wants to continue
      console.log('⚠️  Skipping migration - table already exists')
      return
    }
    
    // Check if old development_approaches table exists (plural)
    console.log('🔍 Checking for existing development_approaches table (plural)...')
    const oldTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'development_approaches'
      )
    `)
    
    if (oldTableCheck.rows[0].exists) {
      console.log('✅ Found development_approaches table (plural)')
      console.log('   Note: This migration creates development_approach (singular)')
      console.log('   Both tables can coexist - old table for backward compatibility\n')
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
        WHERE table_name = 'development_approach'
        ORDER BY ordinal_position
      `)
      
      if (verifyResult.rows.length > 0) {
        console.log('\n✅ Table development_approach created with columns:')
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
        WHERE tablename = 'development_approach'
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
        WHERE conrelid = 'development_approach'::regclass
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
      
      // Verify trigger
      console.log('\n🔍 Verifying trigger...')
      const triggerResult = await client.query(`
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers
        WHERE event_object_table = 'development_approach'
      `)
      
      if (triggerResult.rows.length > 0) {
        console.log('\n✅ Triggers:')
        triggerResult.rows.forEach(row => {
          console.log(`   - ${row.trigger_name}: ${row.action_timing} ${row.event_manipulation}`)
        })
      }
      
      console.log('\n✅ Migration 326 completed successfully!')
      console.log('\n📚 Next steps:')
      console.log('   1. Run AI extraction to populate development_approach for existing projects')
      console.log('   2. Test extraction with: npm run extract:single development_approaches <projectId>')
      console.log('   3. Verify data in development_approach table')
      console.log('   4. Update frontend to display development approach metadata')
      
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

