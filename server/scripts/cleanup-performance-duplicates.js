#!/usr/bin/env node

/**
 * Script: Clean up duplicate performance actuals
 * Description: Removes duplicate performance actuals entries, keeping the most recent one
 * Usage: node server/scripts/cleanup-performance-duplicates.js
 */

const path = require('path');
const { Pool } = require('pg');

// Load environment variables from server directory
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

// Create database pool using same logic as migration script
function createDatabasePool() {
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (databaseUrl) {
        const poolConfig = {
            connectionString: databaseUrl,
            ssl: databaseUrl.includes('supabase.co') || process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false
        };

        console.log('🔍 Using DATABASE_URL for connection');
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
        console.log('🔍 Using individual connection parameters');
        return new Pool(poolConfig);
    }
}

const pool = createDatabasePool();

async function cleanupDuplicates() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting cleanup of duplicate performance actuals...');
    
    await client.query('BEGIN');
    
    // Find and remove duplicates, keeping the most recent one (by created_at)
    const deleteQuery = `
      DELETE FROM performance_actuals 
      WHERE id NOT IN (
        SELECT DISTINCT ON (project_id, entity_type, entity_name, measurement_date) 
          id 
        FROM performance_actuals 
        ORDER BY project_id, entity_type, entity_name, measurement_date, created_at DESC
      )
    `;
    
    const result = await client.query(deleteQuery);
    
    await client.query('COMMIT');
    
    console.log(`✅ Cleanup completed! Removed ${result.rowCount} duplicate entries`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run cleanup
cleanupDuplicates();
