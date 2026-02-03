#!/usr/bin/env node

/**
 * Script: Analyze remaining performance actual duplicates
 * Description: Shows duplicate entries with their measurement dates
 * Usage: node server/scripts/analyze-duplicates.js
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

async function analyzeDuplicates() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Analyzing remaining performance actual duplicates...\n');
    
    // Find entities that appear multiple times
    const duplicateQuery = `
      SELECT 
        entity_name, 
        entity_type, 
        COUNT(*) as duplicate_count,
        STRING_AGG(DISTINCT measurement_date::text, ', ') as measurement_dates,
        STRING_AGG(id::text, ', ') as ids
      FROM performance_actuals 
      GROUP BY entity_name, entity_type 
      HAVING COUNT(*) > 1 
      ORDER BY entity_name, entity_type
    `;
    
    const result = await client.query(duplicateQuery);
    
    if (result.rows.length === 0) {
      console.log('✅ No duplicates found!');
    } else {
      console.log(`📋 Found ${result.rows.length} entities with duplicates:\n`);
      
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.entity_name} (${row.entity_type})`);
        console.log(`   Count: ${row.duplicate_count}`);
        console.log(`   Measurement Dates: ${row.measurement_dates}`);
        console.log(`   IDs: ${row.ids}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error analyzing duplicates:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run analysis
analyzeDuplicates();
