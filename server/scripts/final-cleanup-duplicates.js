#!/usr/bin/env node

/**
 * Script: Final cleanup of duplicate performance actuals
 * Description: Removes all duplicate entries, keeping only the most recent one
 * Usage: node server/scripts/final-cleanup-duplicates.js
 */

const path = require('path');
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

// Create database pool
function createDatabasePool() {
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (databaseUrl) {
        const poolConfig = {
            connectionString: databaseUrl,
            ssl: databaseUrl.includes('supabase.co') || process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false
        };
        return new Pool(poolConfig);
    } else {
        const poolConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'adpa_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || undefined,
            ssl: process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false
        };
        return new Pool(poolConfig);
    }
}

const pool = createDatabasePool();

async function finalCleanup() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting final cleanup of all duplicate performance actuals...');
    
    await client.query('BEGIN');
    
    // Remove all duplicates, keeping only the most recent one (by created_at)
    const deleteQuery = `
      DELETE FROM performance_actuals 
      WHERE id NOT IN (
        SELECT DISTINCT ON (project_id, entity_type, entity_name) 
          id 
        FROM performance_actuals 
        ORDER BY project_id, entity_type, entity_name, created_at DESC
      )
    `;
    
    const result = await client.query(deleteQuery);
    
    await client.query('COMMIT');
    
    console.log(`✅ Final cleanup completed! Removed ${result.rowCount} duplicate entries`);
    
    // Show remaining count
    const countResult = await client.query('SELECT COUNT(*) as total FROM performance_actuals');
    console.log(`📊 Remaining performance actuals: ${countResult.rows[0].total}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during final cleanup:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run cleanup
finalCleanup();
