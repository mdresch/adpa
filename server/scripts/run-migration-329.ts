/**
 * Migration Script: 329_redesign_portfolios_to_governance.sql
 * 
 * Transforms the portfolios table into portfolio_governance to support
 * hybrid PMO model with strategic alignment and governance configuration
 * 
 * Usage:
 *   npm run migrate:329
 *   npx tsx server/scripts/run-migration-329.ts
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
    console.log('🚀 Running Migration 329: Team Agreements (TASK-138)\n')
    
    // Check if table exists - if so, use ALTER migration, otherwise CREATE migration
    console.log('🔍 Checking if team_agreements table exists...')
    const tableExistsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'team_agreements'
      )
    `)
    
    const tableExists = tableExistsCheck.rows[0].exists
    
    const migrationFile = tableExists 
      ? '329_alter_team_agreements.sql'
      : '329_create_team_agreements.sql'
    
    // Read migration file
    const migrationPath = join(__dirname, `../migrations/${migrationFile}`)
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📊 Migration size:', migrationSQL.length, 'characters\n')
    
    if (tableExists) {
      console.log('ℹ️  team_agreements table already exists - will use ALTER migration to update structure')
      
      // Check current table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'team_agreements'
        ORDER BY ordinal_position
      `)
      
      console.log(`📋 Current team_agreements structure (${columnsResult.rows.length} columns):`)
      columnsResult.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`)
      })
      console.log()
    } else {
      console.log('✅ team_agreements table does not exist - will create new table')
    }
    
    // Execute migration
    console.log('🔄 Executing migration...')
    await client.query('BEGIN')
    
    try {
      // Execute the migration SQL
      await client.query(migrationSQL)
      await client.query('COMMIT')
      
      console.log('✅ Migration executed successfully\n')
      
      // Verify tables were created
      console.log('🔍 Verifying table creation...')
      const verifyTables = ['team_agreements', 'team_agreement_adherence_log']
      
      for (const tableName of verifyTables) {
        const verifyResult = await client.query(`
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName])
        
        if (verifyResult.rows.length > 0) {
          console.log(`\n✅ Table ${tableName} created with columns:`)
          verifyResult.rows.forEach(row => {
            const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'
            const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : ''
            console.log(`   - ${row.column_name}: ${row.data_type} ${nullable}${defaultVal}`)
          })
        }
      }
      
      // Verify indexes
      console.log('\n🔍 Verifying indexes...')
      const indexResult = await client.query(`
        SELECT tablename, indexname
        FROM pg_indexes
        WHERE tablename IN ('team_agreements', 'team_agreement_adherence_log')
        ORDER BY tablename, indexname
      `)
      
      if (indexResult.rows.length > 0) {
        console.log('\n✅ Indexes created:')
        let currentTable = ''
        indexResult.rows.forEach(row => {
          if (row.tablename !== currentTable) {
            currentTable = row.tablename
            console.log(`   ${currentTable}:`)
          }
          console.log(`     - ${row.indexname}`)
        })
      }
      
      // Verify constraints
      console.log('\n🔍 Verifying constraints...')
      const constraintResult = await client.query(`
        SELECT 
          conrelid::regclass::text as table_name,
          conname as constraint_name,
          contype as constraint_type,
          pg_get_constraintdef(oid) as constraint_definition
        FROM pg_constraint
        WHERE conrelid::regclass::text IN ('team_agreements', 'team_agreement_adherence_log')
        ORDER BY conrelid::regclass::text, contype, conname
      `)
      
      if (constraintResult.rows.length > 0) {
        console.log('\n✅ Constraints:')
        let currentTable = ''
        constraintResult.rows.forEach(row => {
          if (row.table_name !== currentTable) {
            currentTable = row.table_name
            console.log(`   ${currentTable}:`)
          }
          const typeMap: Record<string, string> = {
            'p': 'PRIMARY KEY',
            'u': 'UNIQUE',
            'f': 'FOREIGN KEY',
            'c': 'CHECK'
          }
          const type = typeMap[row.constraint_type] || row.constraint_type
          console.log(`     - ${row.constraint_name}: ${type}`)
          if (row.constraint_type === 'c') {
            console.log(`       ${row.constraint_definition}`)
          }
        })
      }
      
      // Verify triggers
      console.log('\n🔍 Verifying triggers...')
      const triggerResult = await client.query(`
        SELECT 
          event_object_table as table_name,
          trigger_name, 
          event_manipulation, 
          action_timing
        FROM information_schema.triggers
        WHERE event_object_table = 'team_agreements'
        ORDER BY event_object_table, trigger_name
      `)
      
      if (triggerResult.rows.length > 0) {
        console.log('\n✅ Triggers:')
        let currentTable = ''
        triggerResult.rows.forEach(row => {
          if (row.table_name !== currentTable) {
            currentTable = row.table_name
            console.log(`   ${currentTable}:`)
          }
          console.log(`     - ${row.trigger_name}: ${row.action_timing} ${row.event_manipulation}`)
        })
      }
      
      // Test insert
      console.log('\n🧪 Testing table structure...')
      const testProjectResult = await client.query(`SELECT id FROM projects LIMIT 1`)
      
      if (testProjectResult.rows.length > 0) {
        const testProjectId = testProjectResult.rows[0].id
        
        const testInsert = await client.query(`
          INSERT INTO team_agreements (
            project_id,
            title,
            description,
            category,
            effective_date,
            status
          ) VALUES (
            $1,
            'Test Agreement',
            'This is a test agreement',
            'communication',
            NOW(),
            'draft'
          )
          RETURNING id, title, category, status
        `, [testProjectId])
        
        const testId = testInsert.rows[0].id
        console.log(`✅ Test insert successful: ${testId}`)
        
        // Clean up test data
        await client.query('DELETE FROM team_agreements WHERE id = $1', [testId])
        console.log('🧹 Test data cleaned up')
      } else {
        console.log('⚠️  No projects found - skipping test insert')
      }
      
      console.log('\n✅ Migration 329 completed successfully!')
      console.log('\n📚 Next steps:')
      console.log('   1. Verify AI extraction includes team_agreements')
      console.log('   2. Create API routes for team agreements (GET/POST /api/team-agreements)')
      console.log('   3. Create API routes for adherence tracking (POST /api/team-agreements/:id/adherence)')
      console.log('   4. Frontend already displays agreements (TASK-143 complete)')
      console.log('   5. Add manual add/edit functionality')
      
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

