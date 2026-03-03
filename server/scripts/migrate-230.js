#!/usr/bin/env node

/**
 * Migration Runner for Semantic Search Setup
 * Applies migration 230: Semantic Search and Knowledge Base Optimization
 * 
 * Usage:
 *   npm run migrate:230
 *   or
 *   node scripts/migrate-230.js
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { Pool } from 'pg'
import chalk from 'chalk'
import dotenv from 'dotenv'

// Load .env file
dotenv.config({ path: join(process.cwd(), '.env') })

const __dirname = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '')
const projectRoot = join(__dirname, '..')

// Initialize database connection - prefer DATABASE_URL for Supabase
let connectionConfig
if (process.env.DATABASE_URL) {
  // Use Supabase connection string with proper ssl configuration
  connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Supabase PgBouncer requires this
  }
} else {
  // Fallback to individual environment variables
  connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  }
}

const pool = new Pool(connectionConfig)

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [MIGRATE-230]`
  
  switch (type) {
    case 'success':
      console.log(`${chalk.green(prefix)} ${chalk.green('✓')} ${message}`)
      break
    case 'error':
      console.log(`${chalk.red(prefix)} ${chalk.red('✗')} ${message}`)
      break
    case 'warn':
      console.log(`${chalk.yellow(prefix)} ${chalk.yellow('⚠')} ${message}`)
      break
    case 'info':
    default:
      console.log(`${chalk.blue(prefix)} ${chalk.cyan('ℹ')} ${message}`)
      break
  }
}

async function runMigration() {
  let client
  
  try {
    log('Starting migration 230: Semantic Search and Knowledge Base Optimization')
    
    // Read migration file
    const migrationPath = join(projectRoot, 'migrations', '230_semantic_search_and_knowledge_base_optimization.sql')
    log(`Reading migration file: ${migrationPath}`)
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    if (!migrationSQL) {
      throw new Error('Migration file is empty')
    }
    log(`Migration file loaded (${migrationSQL.length} bytes)`)
    
    // Connect to database
    log('Connecting to database...')
    client = await pool.connect()
    log('Database connection established', 'success')
    
    // Check if migration already applied
    log('Checking if migration already applied...')
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_base_entries' 
        AND column_name = 'embedding'
      ) as embedding_exists
    `)
    
    if (checkResult.rows[0].embedding_exists) {
      log('Migration 230 already applied! Skipping...', 'warn')
      console.log('')
      await client.query(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embeddings
        FROM knowledge_base_entries
      `).then(res => {
        const { total, with_embeddings } = res.rows[0]
        log(`Current status: ${total} KB entries, ${with_embeddings || 0} with embeddings`, 'info')
      })
      return true
    }
    
    // Execute migration
    log('Executing migration SQL...')
    log('This may take a few seconds...', 'warn')
    
    const startTime = Date.now()
    await client.query(migrationSQL)
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    log(`Migration completed successfully in ${duration}s`, 'success')
    
    // Verify migration
    log('Verifying migration...')
    
    // Check new columns
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_base_entries' 
      AND column_name IN ('embedding', 'embedding_model', 'embedding_generated_at', 'semantic_keywords')
      ORDER BY column_name
    `)
    
    if (columnCheck.rows.length === 4) {
      log(`✓ All new columns created (${columnCheck.rows.map(r => r.column_name).join(', ')})`, 'success')
    } else {
      log(`Warning: Only ${columnCheck.rows.length}/4 columns found`, 'warn')
    }
    
    // Check new table
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'knowledge_base_entry_relationships'
      ) as exists
    `)
    
    if (tableCheck.rows[0].exists) {
      log('✓ New table knowledge_base_entry_relationships created', 'success')
    } else {
      log('Warning: knowledge_base_entry_relationships table not found', 'warn')
    }
    
    // Check indexes
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'knowledge_base_entries' 
      AND indexname LIKE '%embedding%'
    `)
    
    log(`✓ Found ${indexCheck.rows.length} embedding indexes`, 'success')
    
    // Check KB entries
    const kbCheck = await client.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embeddings
      FROM knowledge_base_entries
    `)
    
    const { total, with_embeddings } = kbCheck.rows[0]
    log(`✓ Knowledge base: ${total} entries (${with_embeddings || 0} with embeddings)`, 'success')
    
    console.log('')
    log('═══════════════════════════════════════════════════════════════════')
    log('Migration 230 completed successfully!', 'success')
    log('═══════════════════════════════════════════════════════════════════')
    console.log('')
    log('Next steps:')
    log('1. Verify environment variable: export VOYAGE_API_KEY=<your-key>')
    log('2. Start server: npm run dev')
    log('3. Generate embeddings: npm run semantic-search:generate')
    log('4. Test: npm run semantic-search:test')
    
    return true
    
  } catch (error) {
    log(`Migration failed: ${error.message}`, 'error')
    if (error.detail) {
      log(`Details: ${error.detail}`, 'error')
    }
    console.log('')
    log('Troubleshooting:')
    log('- Check database connection parameters in .env')
    log('- Ensure database is running and accessible')
    log('- Verify migration file exists: server/migrations/230_*.sql')
    log('- Check for syntax errors in migration file')
    console.log('')
    throw error
    
  } finally {
    if (client) {
      await client.release()
    }
    await pool.end()
  }
}

// Run migration
runMigration()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('')
    console.error(chalk.red('MIGRATION FAILED'))
    console.error(error)
    process.exit(1)
  })
