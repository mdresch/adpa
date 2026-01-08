/**
 * Check project_tasks status constraint
 * Determines which status values are allowed in the database
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') })

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!connectionString) {
  console.error('❌ No database connection string found!')
  console.error('Set DATABASE_URL or POSTGRES_URL in server/.env')
  process.exit(1)
}

async function checkStatusConstraint() {
  console.log('🔍 Checking project_tasks status constraint...\n')

  try {
    // Query the constraint definition
    const constraintQuery = `
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conname LIKE '%project_tasks%status%'
      OR (conrelid = 'project_tasks'::regclass AND contype = 'c' AND consrc LIKE '%status%')
    `

    await db.initDb()
    const result = await db.query(constraintQuery)

    if (result.rows.length > 0) {
      console.log('✅ Found status constraint(s):\n')
      result.rows.forEach(row => {
        console.log(`Constraint Name: ${row.constraint_name}`)
        console.log(`Definition: ${row.constraint_definition}`)
        console.log('')
      })
    } else {
      console.log('⚠️ No status constraint found. Checking all project_tasks constraints...\n')
      
      // Get all constraints on project_tasks
      const allConstraintsQuery = `
        SELECT 
          conname as constraint_name,
          contype as constraint_type,
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'project_tasks'::regclass
        ORDER BY conname
      `
      
      const allConstraints = await db.query(allConstraintsQuery)
      
      console.log(`Found ${allConstraints.rows.length} constraints on project_tasks:\n`)
      allConstraints.rows.forEach(row => {
        const type = {
          'c': 'CHECK',
          'f': 'FOREIGN KEY',
          'p': 'PRIMARY KEY',
          'u': 'UNIQUE'
        }[row.constraint_type] || row.constraint_type
        
        console.log(`${type}: ${row.constraint_name}`)
        console.log(`  ${row.definition}`)
        console.log('')
      })
    }

    // Also check the status column directly
    console.log('📋 Checking status column definition:\n')
    const columnQuery = `
      SELECT 
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'project_tasks'
      AND column_name = 'status'
    `
    
    const columnResult = await db.query(columnQuery)
    
    if (columnResult.rows.length > 0) {
      const col = columnResult.rows[0]
      console.log(`Column: ${col.column_name}`)
      console.log(`Type: ${col.data_type}`)
      console.log(`Default: ${col.column_default}`)
      console.log(`Nullable: ${col.is_nullable}`)
      console.log('')
    }

    // Check what status values currently exist in the table
    console.log('📊 Current status values in use:\n')
    const statusValuesQuery = `
      SELECT DISTINCT status, COUNT(*) as count
      FROM project_tasks
      GROUP BY status
      ORDER BY count DESC
    `
    
    const statusValues = await db.query(statusValuesQuery)
    
    if (statusValues.rows.length > 0) {
      console.log('Status values currently in database:')
      statusValues.rows.forEach(row => {
        console.log(`  "${row.status}": ${row.count} tasks`)
      })
      console.log('')
    } else {
      console.log('No tasks in project_tasks table yet.\n')
    }

    // Check activities table status values for comparison
    console.log('📊 Comparing with activities table:\n')
    const activitiesStatusQuery = `
      SELECT DISTINCT status, COUNT(*) as count
      FROM activities
      GROUP BY status
      ORDER BY count DESC
    `
    
    const activitiesStatus = await db.query(activitiesStatusQuery)
    
    if (activitiesStatus.rows.length > 0) {
      console.log('Status values in activities table:')
      activitiesStatus.rows.forEach(row => {
        console.log(`  "${row.status}": ${row.count} activities`)
      })
      console.log('')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await db.end()
  }
}

// Run the check
checkStatusConstraint()
  .then(() => {
    console.log('✅ Check complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

