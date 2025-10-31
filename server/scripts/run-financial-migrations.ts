/**
 * Financial Management Migrations Runner
 * 
 * Runs migrations 203, 204, and 205 for Phase 3A Financial Management
 * 
 * Usage:
 *   npm run migrate:financial
 *   OR
 *   npx tsx server/scripts/run-financial-migrations.ts
 */

import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

const migrations = [
  {
    number: '203',
    name: 'program_financial_management',
    description: 'Budget development, funding, and cash flow tracking'
  },
  {
    number: '204',
    name: 'program_evm_performance',
    description: 'EVM metrics and performance tracking'
  },
  {
    number: '205',
    name: 'program_financial_analysis',
    description: 'ROI, NPV, IRR, and benefits tracking'
  }
]

interface MigrationResult {
  number: string
  name: string
  status: 'success' | 'failed' | 'skipped'
  message: string
  duration?: number
}

async function createMigrationTrackingTable(pool: Pool): Promise<void> {
  console.log('📋 Checking migration tracking table...')
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_number VARCHAR(10) NOT NULL UNIQUE,
      migration_name VARCHAR(255) NOT NULL,
      description TEXT,
      applied_at TIMESTAMP DEFAULT NOW(),
      checksum VARCHAR(64)
    );
    
    COMMENT ON TABLE schema_migrations IS 'Tracks which migrations have been applied';
  `)
  
  console.log('✅ Migration tracking table ready\n')
}

async function isMigrationApplied(pool: Pool, migrationNumber: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM schema_migrations WHERE migration_number = $1',
    [migrationNumber]
  )
  return result.rows.length > 0
}

async function recordMigration(
  pool: Pool, 
  migrationNumber: string, 
  migrationName: string,
  description: string
): Promise<void> {
  await pool.query(
    `INSERT INTO schema_migrations (migration_number, migration_name, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (migration_number) DO NOTHING`,
    [migrationNumber, migrationName, description]
  )
}

async function runMigration(
  pool: Pool,
  migration: typeof migrations[0]
): Promise<MigrationResult> {
  const startTime = Date.now()
  const migrationFile = path.join(
    __dirname,
    '../migrations',
    `${migration.number}_${migration.name}.sql`
  )

  try {
    // Check if already applied
    const isApplied = await isMigrationApplied(pool, migration.number)
    if (isApplied) {
      return {
        number: migration.number,
        name: migration.name,
        status: 'skipped',
        message: 'Migration already applied',
        duration: Date.now() - startTime
      }
    }

    // Check if file exists
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`)
    }

    // Read migration SQL
    const sql = fs.readFileSync(migrationFile, 'utf-8')

    console.log(`📦 Running migration ${migration.number}: ${migration.name}`)
    console.log(`   ${migration.description}`)

    // Execute migration in a transaction
    await pool.query('BEGIN')
    
    try {
      // Execute the migration SQL
      await pool.query(sql)
      
      // Record successful migration
      await recordMigration(pool, migration.number, migration.name, migration.description)
      
      await pool.query('COMMIT')
      
      const duration = Date.now() - startTime
      console.log(`✅ Migration ${migration.number} completed successfully (${duration}ms)\n`)
      
      return {
        number: migration.number,
        name: migration.name,
        status: 'success',
        message: 'Migration applied successfully',
        duration
      }
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`❌ Migration ${migration.number} failed:`, error.message)
    
    return {
      number: migration.number,
      name: migration.name,
      status: 'failed',
      message: error.message,
      duration
    }
  }
}

async function verifyMigrations(pool: Pool): Promise<void> {
  console.log('🔍 Verifying migrations...\n')

  // Check if tables exist
  const tables = [
    'program_budgets',
    'program_funding',
    'program_cash_flow',
    'program_forecasts',
    'program_cost_performance',
    'program_financial_transactions',
    'program_financial_analysis',
    'program_benefits'
  ]

  for (const table of tables) {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [table])
    
    const exists = result.rows[0].exists
    if (exists) {
      console.log(`✅ Table '${table}' exists`)
    } else {
      console.log(`❌ Table '${table}' NOT FOUND`)
    }
  }

  console.log('')

  // Check if functions exist
  const functions = [
    'calculate_program_budget',
    'calculate_evm_metrics',
    'update_project_earned_value',
    'calculate_roi',
    'calculate_npv',
    'calculate_payback_period',
    'update_program_financial_metrics'
  ]

  for (const func of functions) {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = $1
      );
    `, [func])
    
    const exists = result.rows[0].exists
    if (exists) {
      console.log(`✅ Function '${func}' exists`)
    } else {
      console.log(`❌ Function '${func}' NOT FOUND`)
    }
  }

  console.log('')

  // Check if views exist
  const views = [
    'program_benefits_summary',
    'program_evm_summary',
    'program_financial_dashboard'
  ]

  for (const view of views) {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [view])
    
    const exists = result.rows[0].exists
    if (exists) {
      console.log(`✅ View '${view}' exists`)
    } else {
      console.log(`❌ View '${view}' NOT FOUND`)
    }
  }

  console.log('')
}

async function main() {
  console.log('🚀 Financial Management Migrations Runner\n')
  console.log('=' .repeat(60))
  console.log('Phase 3A: Financial Management & EVM Dashboard')
  console.log('=' .repeat(60))
  console.log('')

  // Create database connection
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  
  if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL or POSTGRES_URL not found in environment')
    console.error('   Please ensure your .env file is configured correctly')
    process.exit(1)
  }

  console.log(`🔌 Connecting to database...`)
  console.log(`   ${connectionString.substring(0, 30)}...`)
  console.log('')

  const pool = new Pool({
    connectionString,
    ssl: (connectionString.includes('supabase.co') || connectionString.includes('neon.tech') || connectionString.includes('azure') || process.env.DB_SSL === 'true')
      ? { rejectUnauthorized: false }
      : undefined
  })

  try {
    // Test connection
    await pool.query('SELECT NOW()')
    console.log('✅ Database connection successful\n')

    // Create migration tracking table
    await createMigrationTrackingTable(pool)

    // Run migrations
    console.log('📦 Running migrations...\n')
    const results: MigrationResult[] = []

    for (const migration of migrations) {
      const result = await runMigration(pool, migration)
      results.push(result)
    }

    // Summary
    console.log('=' .repeat(60))
    console.log('📊 Migration Summary')
    console.log('=' .repeat(60))
    console.log('')

    const successful = results.filter(r => r.status === 'success').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const failed = results.filter(r => r.status === 'failed').length

    console.log(`✅ Successful: ${successful}`)
    console.log(`⏭️  Skipped:    ${skipped}`)
    console.log(`❌ Failed:     ${failed}`)
    console.log('')

    if (failed > 0) {
      console.log('❌ Some migrations failed:\n')
      results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`   Migration ${r.number} (${r.name}):`)
          console.log(`   ${r.message}\n`)
        })
      process.exit(1)
    }

    // Verify migrations
    await verifyMigrations(pool)

    console.log('=' .repeat(60))
    console.log('🎉 All migrations completed successfully!')
    console.log('=' .repeat(60))
    console.log('')
    console.log('Next steps:')
    console.log('1. Restart your backend server: npm run dev')
    console.log('2. Navigate to a program page in the UI')
    console.log('3. Click the "Finances" tab to see the dashboard')
    console.log('4. Add budget data to projects to see metrics')
    console.log('')

  } catch (error: any) {
    console.error('\n❌ Migration runner failed:', error.message)
    console.error('\nStack trace:')
    console.error(error.stack)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run migrations
main()

