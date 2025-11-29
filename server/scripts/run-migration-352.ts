/**
 * Migration Runner Script: Fix Risks Check Constraints
 * 
 * This script runs migration 352 to fix the risks table CHECK constraints.
 * Usage: npm run migrate:352
 */

import { Pool } from 'pg'
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
  console.log('🔧 Migration 352: Fix Risks Check Constraints')
  console.log('━'.repeat(50))
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('sslmode=require') || DATABASE_URL.includes('supabase') 
      ? { rejectUnauthorized: false } 
      : undefined
  })

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', '352_fix_risks_check_constraints.sql')
    
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
      console.log('')

      // Execute migration
      await client.query(migrationSQL)

      console.log('✅ Migration completed successfully!')
      console.log('')
      
      // Verify the constraints
      console.log('🔍 Verifying constraints...')
      
      const constraintQuery = `
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'risks'::regclass
        AND contype = 'c'
        ORDER BY conname;
      `
      
      const result = await client.query(constraintQuery)
      
      if (result.rows.length > 0) {
        console.log('')
        console.log('📋 Current CHECK constraints on risks table:')
        console.log('─'.repeat(50))
        result.rows.forEach((row: any) => {
          console.log(`  • ${row.conname}`)
          console.log(`    ${row.definition}`)
          console.log('')
        })
      } else {
        console.log('⚠️  No CHECK constraints found on risks table')
      }

      // Check for the specific constraint values
      const riskLevelCheck = result.rows.find((r: any) => r.conname === 'risks_risk_level_check')
      if (riskLevelCheck) {
        console.log('✅ risks_risk_level_check constraint is properly configured')
      } else {
        console.log('⚠️  risks_risk_level_check constraint not found - may need manual verification')
      }

    } finally {
      client.release()
    }

    console.log('')
    console.log('━'.repeat(50))
    console.log('✅ Migration 352 completed successfully!')
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
    }
    
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})

