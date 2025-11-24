/**
 * Migration Runner for 208_tasks_scheduling_wbs_import.sql
 * 
 * This script applies the task scheduling and WBS import migration to the database.
 * 
 * Usage:
 *   npx tsx scripts/migrate-208.ts
 * 
 * The migration creates:
 * - project_tasks table (task planning and tracking)
 * - task_dependencies table (task relationships)
 * - task_assignments table (resource scheduling)
 * - time_entries enhancements (task linkage)
 * - Views: task_summary, resource_workload, task_variance_report
 * - Functions: update_task_assignment_actuals()
 * - Triggers: maintain task assignments when time entries are approved
 */

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { Pool } from 'pg'
import { logger } from '../src/utils/logger'

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL
const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = process.env.DB_PORT || '5432'
const DB_NAME = process.env.DB_NAME || 'adpa_db'
const DB_USER = process.env.DB_USER || 'postgres'
const DB_PASSWORD = process.env.DB_PASSWORD || 'password'

/**
 * Create database pool
 */
function createPool(): Pool {
  if (DATABASE_URL) {
    console.log('📦 Using DATABASE_URL for connection')
    return new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }

  console.log(`📦 Using individual connection parameters (host: ${DB_HOST})`)
  return new Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })
}

/**
 * Read and execute migration SQL
 * Uses a more robust statement splitting that handles PostgreSQL dollar-quoted strings
 */
async function runMigration(pool: Pool, migrationPath: string): Promise<void> {
  try {
    // Read migration file
    const sql = fs.readFileSync(migrationPath, 'utf-8')
    
    if (!sql.trim()) {
      throw new Error('Migration file is empty')
    }

    console.log(`📄 Migration file size: ${sql.length} bytes`)
    console.log(`⏳ Executing migration...`)

    // More robust approach: split statements while tracking all quote types
    const statements: string[] = []
    let i = 0

    while (i < sql.length) {
      // Skip whitespace and comments
      while (i < sql.length && /\s/.test(sql[i])) {
        i++
      }
      
      // Skip line comments
      if (sql[i] === '-' && sql[i + 1] === '-') {
        while (i < sql.length && sql[i] !== '\n') {
          i++
        }
        continue
      }

      if (i >= sql.length) break

      // Start of a statement
      let statement = ''
      let foundEnd = false

      while (i < sql.length && !foundEnd) {
        const char = sql[i]

        // Check for start of dollar quote
        if (char === '$' && !statement.includes("'")) {
          // Try to match dollar quote pattern: $tagname$
          const remaining = sql.substring(i)
          const dollarMatch = remaining.match(/^\$([a-zA-Z_][a-zA-Z0-9_]*)?\$/)
          
          if (dollarMatch) {
            const dollarTag = dollarMatch[0]
            const tagName = dollarMatch[1] || ''
            
            // Add the opening dollar tag
            statement += dollarTag
            i += dollarTag.length
            
            // Find the closing dollar tag
            const closeTag = '$' + tagName + '$'
            while (i < sql.length) {
              const nextChar = sql[i]
              statement += nextChar
              
              // Check if we found the closing tag
              if (nextChar === '$' && sql.substring(i).startsWith(closeTag)) {
                statement += closeTag.substring(1) // Add rest of close tag (we already added first $)
                i += closeTag.length
                break
              }
              i++
            }
            continue // Skip the normal increment at the end
          }
        }
        
        statement += char

        // Check for single quoted string
        if (char === "'") {
          i++
          while (i < sql.length) {
            statement += sql[i]
            if (sql[i] === "'") {
              if (sql[i + 1] === "'") {
                // Escaped quote
                statement += sql[++i]
              } else {
                // End of string
                break
              }
            }
            i++
          }
        }
        // Check for double quoted identifier
        else if (char === '"') {
          i++
          while (i < sql.length) {
            statement += sql[i]
            if (sql[i] === '"') {
              if (sql[i + 1] === '"') {
                // Escaped quote
                statement += sql[++i]
              } else {
                // End of identifier
                break
              }
            }
            i++
          }
        }
        // Check for statement end
        else if (char === ';') {
          foundEnd = true
        }

        i++
      }

      const stmt = statement.trim()
      if (stmt.length > 0 && !stmt.startsWith('--')) {
        statements.push(stmt)
      }
    }

    console.log(`📋 Found ${statements.length} SQL statements`)

    let executedCount = 0
    let skippedCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      
      // Skip comments and empty lines
      if (!statement || statement.startsWith('--')) {
        continue
      }

      try {
        console.log(`\n[${i + 1}/${statements.length}] Executing statement...`)
        const preview = statement.replace(/\s+/g, ' ').substring(0, 80)
        console.log(`  Preview: ${preview}...`)

        await pool.query(statement)
        
        executedCount++
        console.log(`  ✅ Statement executed successfully`)
      } catch (error: any) {
        // Some statements might fail if they're idempotent (CREATE IF NOT EXISTS)
        // This is expected and we should continue
        if (error.code === '42P07' || error.code === '42P06') {
          // Object already exists
          console.log(`  ⚠️  Object already exists (expected): ${error.message}`)
          skippedCount++
        } else if (error.message.includes('already exists')) {
          console.log(`  ⚠️  Already exists (expected): ${error.message}`)
          skippedCount++
        } else {
          console.error(`  ❌ Error executing statement:`, error.message)
          console.error(`     Full statement:\n${statement}`)
          throw error
        }
      }
    }

    console.log(`\n✅ Migration completed!`)
    console.log(`   Executed: ${executedCount} statements`)
    console.log(`   Skipped: ${skippedCount} statements (already exist)`)
    console.log(`   Total: ${executedCount + skippedCount} statements processed`)
  } catch (error: any) {
    console.error(`❌ Migration failed:`, error.message)
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`)
    }
    if (error.code) {
      console.error(`   Code: ${error.code}`)
    }
    throw error
  }
}

/**
 * Verify migration was successful
 */
async function verifyMigration(pool: Pool): Promise<void> {
  try {
    console.log(`\n🔍 Verifying migration...`)

    // Check if project_tasks table exists
    const projectTasksCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'project_tasks'
      )
    `)

    if (!projectTasksCheck.rows[0].exists) {
      throw new Error('project_tasks table not found after migration')
    }
    console.log(`   ✅ project_tasks table exists`)

    // Check if task_assignments table exists
    const taskAssignmentsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'task_assignments'
      )
    `)

    if (!taskAssignmentsCheck.rows[0].exists) {
      throw new Error('task_assignments table not found after migration')
    }
    console.log(`   ✅ task_assignments table exists`)

    // Check if task_summary view exists
    const taskSummaryCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' AND table_name = 'task_summary'
      )
    `)

    if (!taskSummaryCheck.rows[0].exists) {
      throw new Error('task_summary view not found after migration')
    }
    console.log(`   ✅ task_summary view exists`)

    // Get row counts
    const projectTasksCount = await pool.query('SELECT COUNT(*) as count FROM project_tasks')
    const taskAssignmentsCount = await pool.query('SELECT COUNT(*) as count FROM task_assignments')

    console.log(`\n📊 Migration Statistics:`)
    console.log(`   project_tasks: ${projectTasksCount.rows[0].count} rows`)
    console.log(`   task_assignments: ${taskAssignmentsCount.rows[0].count} rows`)

    console.log(`\n✅ Migration verified successfully!`)
  } catch (error: any) {
    console.error(`❌ Verification failed:`, error.message)
    throw error
  }
}

/**
 * Main entry point
 */
async function main() {
  let pool: Pool | null = null

  try {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Migration 208: Tasks Scheduling & WBS Import                  ║
║  Applying to database...                                        ║
╚════════════════════════════════════════════════════════════════╝
    `)

    // Create database pool
    pool = createPool()

    // Test connection
    console.log(`🔌 Testing database connection...`)
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    console.log(`✅ Database connection successful`)

    // Find and run migration
    const migrationPath = path.join(__dirname, '../migrations/208_tasks_scheduling_wbs_import.sql')

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }

    console.log(`📁 Migration file: ${migrationPath}`)

    // Run migration
    await runMigration(pool, migrationPath)

    // Verify migration
    await verifyMigration(pool)

    console.log(`\n✨ All done! The migration has been successfully applied.`)
    process.exit(0)
  } catch (error: any) {
    console.error(`\n❌ Migration failed:`, error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    if (pool) {
      await pool.end()
      console.log(`\n🔌 Database connection closed`)
    }
  }
}

// Run the migration
main()
