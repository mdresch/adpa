/**
 * Run Migration 361: Redesign Portfolios to Portfolio Governance
 * 
 * Transforms the portfolios table into portfolio_governance to support
 * hybrid PMO model with strategic alignment, company linking, and governance configuration.
 * 
 * Features:
 * - Renames portfolios → portfolio_governance
 * - Adds company_id (1:1 unique constraint per company)
 * - Adds governance configuration JSONB fields
 * - Adds strategic alignment fields
 * - Adds hybrid PMO type blending support
 * 
 * Usage:
 *   npm run migrate:361
 *   npx tsx server/scripts/run-migration-361.ts
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
    console.log('🚀 Running Migration 361: Redesign Portfolios to Portfolio Governance\n')
    
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/361_redesign_portfolios_to_governance.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📊 Migration size:', migrationSQL.length, 'characters\n')
    
    // Check if portfolio_governance table exists
    console.log('🔍 Checking if portfolio_governance table exists...')
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'portfolio_governance'
      )
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Table portfolio_governance already exists')
      console.log('   Migration may have already been run.\n')
      
      // Check table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'portfolio_governance'
        ORDER BY ordinal_position
        LIMIT 25
      `)
      
      console.log('📋 Current table structure (first 25 columns):')
      columnsResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`)
      })
      
      console.log('\n💡 To re-run migration, rename table back to portfolios first:')
      console.log('   ALTER TABLE portfolio_governance RENAME TO portfolios;')
      console.log('   Then run this script again.\n')
      
      console.log('⚠️  Skipping migration - table already migrated')
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
      
      // Verify table was migrated
      console.log('🔍 Verifying table migration...')
      const verifyResult = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = 'portfolio_governance'
        ORDER BY ordinal_position
      `)
      
      if (verifyResult.rows.length > 0) {
        console.log('\n✅ Table portfolio_governance created/migrated with columns:')
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
        WHERE tablename = 'portfolio_governance'
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
        WHERE conrelid = 'portfolio_governance'::regclass
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
        })
      }
      
      console.log('\n✅ Migration 361 completed successfully!')
      console.log('\n📚 Next steps:')
      console.log('   1. Update backend routes: /portfolios → /portfolio-governance')
      console.log('   2. Update frontend pages: /portfolios → /portfolio-governance')
      console.log('   3. Create Portfolio Governance configuration UI')
      console.log('   4. Link programs to portfolio_governance via company')
      console.log('   5. Build hybrid PMO dashboard with governance controls')
      
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
