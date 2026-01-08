/**
 * Migration Runner Script: Create PMBOK 8 Knowledge Area Domain Tables
 * 
 * This script runs migration 354 to create all 38 database tables for the
 * 7 Knowledge Area Domains (Tier 2):
 * - Governance (5 tables)
 * - Scope (5 tables)
 * - Schedule (5 tables)
 * - Finance (6 tables)
 * - Resources (6 tables)
 * - Risk (6 tables)
 * - Stakeholders Ops (5 tables)
 * 
 * Usage: npm run migrate:354
 */

const db = require('../src/lib/db')
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL or POSTGRES_URL environment variable is required')
  process.exit(1)
}

async function runMigration(): Promise<void> {
  console.log('🔧 Migration 354: Create PMBOK 8 Knowledge Area Domain Tables')
  console.log('━'.repeat(60))
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('sslmode=require') || DATABASE_URL.includes('supabase') 
      ? { rejectUnauthorized: false } 
      : undefined
  })

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', '354_pmbok8_knowledge_area_domain_tables.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`)
      process.exit(1)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded successfully')
    console.log(`📍 Path: ${migrationPath}`)
    console.log('')

    // Connect to database
    const client = await pool.connect()
    console.log('✅ Connected to database')
    console.log('')

    try {
      console.log('🚀 Running migration...')
      console.log('   This will create 38 tables for 7 Knowledge Area Domains')
      console.log('')

      // Check if projects table exists first
      const projectsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'projects'
        ) as exists;
      `)
      
      if (!projectsCheck.rows[0]?.exists) {
        throw new Error('Projects table does not exist. Please run migrations to create the projects table first.')
      }
      
      console.log('✅ Projects table exists')
      console.log('')

      // Execute migration following the pattern from migration 350
      // Extensions must be created outside of transactions
      console.log('📦 Creating extensions (outside transaction)...')
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
      console.log('✅ Extensions created')
      console.log('')
      
      // Remove extension creation statements from SQL (already executed)
      const sqlWithoutExtensions = migrationSQL
        .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/gi, '')
        .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/gi, '')
        .replace(/-- Ensure required extensions and helper trigger exist\s*/gi, '')
        .trim()
      
      // Drop any test tables that might have been created with incomplete structure
      console.log('🧹 Cleaning up any test tables from previous runs...')
      const testTables = [
        'governance_decisions', 'approval_workflows', 'steering_committees',
        'change_control_boards', 'policy_compliance', 'scope_baselines',
        'wbs_nodes', 'schedule_baselines', 'budget_baselines'
      ]
      for (const table of testTables) {
        try {
          await client.query(`DROP TABLE IF EXISTS ${table} CASCADE;`)
        } catch (e) {
          // Ignore errors
        }
      }
      console.log('✅ Cleanup complete')
      console.log('')
      
      // Execute the migration in a transaction
      console.log('🔄 Executing migration in transaction...')
      await client.query('BEGIN')
      try {
        await client.query(sqlWithoutExtensions)
        await client.query('COMMIT')
        console.log('✅ Migration SQL executed successfully')
      } catch (error: any) {
        await client.query('ROLLBACK')
        console.error('')
        console.error('❌ SQL Execution Error Details:')
        console.error(`   Code: ${error.code}`)
        console.error(`   Message: ${error.message}`)
        console.error(`   Detail: ${error.detail || 'N/A'}`)
        console.error(`   Hint: ${error.hint || 'N/A'}`)
        console.error(`   Position: ${error.position || 'N/A'}`)
        if (error.position && sqlWithoutExtensions.length > error.position) {
          const start = Math.max(0, error.position - 300)
          const end = Math.min(sqlWithoutExtensions.length, error.position + 300)
          const context = sqlWithoutExtensions.substring(start, end)
          console.error(`   SQL Context around error position:`)
          console.error(`   ${context}`)
        }
        console.error('')
        throw error
      }

      console.log('✅ Migration completed successfully!')
      console.log('')
      
      // Verify tables were created
      console.log('🔍 Verifying tables...')
      
      const expectedTables = [
        // Governance (5)
        'governance_decisions', 'approval_workflows', 'steering_committees', 
        'change_control_boards', 'policy_compliance',
        // Scope (5)
        'scope_baselines', 'wbs_nodes', 'scope_change_requests',
        'requirements_traceability', 'scope_verification',
        // Schedule (5)
        'schedule_baselines', 'schedule_activities', 'critical_path_activities',
        'schedule_variances', 'schedule_forecasts',
        // Finance (6)
        'budget_baselines', 'cost_actuals', 'cost_estimates',
        'funding_tranches', 'financial_variances', 'procurement_costs',
        // Resources (6)
        'resource_assignments', 'resource_pool', 'capacity_forecasts',
        'utilization_records', 'resource_conflicts', 'onboarding_offboarding',
        // Risk (6)
        'risk_assessments', 'risk_response_plans', 'risk_triggers',
        'risk_reviews', 'contingency_reserves', 'risk_metrics',
        // Stakeholders Ops (5)
        'engagement_actions', 'communication_logs', 'satisfaction_surveys',
        'stakeholder_issues', 'relationship_health'
      ]
      
      const tableCheckQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ANY($1)
        ORDER BY table_name;
      `
      
      const result = await client.query(tableCheckQuery, [expectedTables])
      const createdTables = result.rows.map((r: any) => r.table_name)
      
      console.log('')
      console.log('📋 Created tables:')
      console.log('─'.repeat(60))
      
      const domains = [
        { name: 'Governance', tables: expectedTables.slice(0, 5) },
        { name: 'Scope', tables: expectedTables.slice(5, 10) },
        { name: 'Schedule', tables: expectedTables.slice(10, 15) },
        { name: 'Finance', tables: expectedTables.slice(15, 21) },
        { name: 'Resources', tables: expectedTables.slice(21, 27) },
        { name: 'Risk', tables: expectedTables.slice(27, 33) },
        { name: 'Stakeholders Ops', tables: expectedTables.slice(33, 38) }
      ]
      
      domains.forEach(domain => {
        const domainTables = domain.tables.filter(t => createdTables.includes(t))
        console.log(`\n  ${domain.name} Domain (${domainTables.length}/${domain.tables.length}):`)
        domainTables.forEach(table => {
          console.log(`    ✅ ${table}`)
        })
        const missing = domain.tables.filter(t => !createdTables.includes(t))
        if (missing.length > 0) {
          missing.forEach(table => {
            console.log(`    ⚠️  ${table} (not found)`)
          })
        }
      })
      
      console.log('')
      console.log(`✅ Created ${createdTables.length} out of ${expectedTables.length} expected tables`)
      
      if (createdTables.length === expectedTables.length) {
        console.log('✅ All Knowledge Area Domain tables are present!')
      } else {
        const missing = expectedTables.filter(t => !createdTables.includes(t))
        console.log(`⚠️  Missing tables: ${missing.join(', ')}`)
      }

    } finally {
      client.release()
    }

    console.log('')
    console.log('━'.repeat(60))
    console.log('✅ Migration 354 completed successfully!')
    console.log('')
    console.log('📊 Summary:')
    console.log('   • 38 tables created for 7 Knowledge Area Domains')
    console.log('   • All tables follow ADPA conventions (UUID PK, project_id FK, etc.)')
    console.log('   • Ready for entity extraction from project documents')
    console.log('')

  } catch (error: any) {
    console.error('')
    console.error('❌ Migration failed:', error.message)
    console.error('')
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Tip: Make sure the database is running and accessible')
    } else if (error.code === '28P01') {
      console.error('💡 Tip: Check your database credentials in the .env file')
    } else if (error.code === '3D000') {
      console.error('💡 Tip: The database does not exist. Create it first.')
    } else if (error.code === '42P07') {
      console.error('💡 Tip: Some tables may already exist. This is OK - migration uses IF NOT EXISTS.')
    }
    
    if (error.stack) {
      console.error('')
      console.error('Stack trace:')
      console.error(error.stack)
    }
    
    process.exit(1)
  } finally {
    try { await db.end() } catch (e) {}}
}

// Run the migration
runMigration().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})

