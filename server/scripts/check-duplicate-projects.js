#!/usr/bin/env node

/**
 * Script: Check if remaining duplicates are from different projects
 * Description: Shows project IDs for entities that appear to be duplicates
 * Usage: node server/scripts/check-duplicate-projects.js
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

async function checkDuplicateProjects() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking project IDs for entities with multiple entries...\n');
    
    // Get entities that appear multiple times and show their project IDs
    const duplicateQuery = `
      SELECT 
        entity_name, 
        entity_type,
        COUNT(*) as total_count,
        COUNT(DISTINCT project_id) as distinct_projects,
        STRING_AGG(DISTINCT project_id::text, ', ') as project_ids,
        STRING_AGG(DISTINCT measurement_date::text, ', ') as measurement_dates
      FROM performance_actuals 
      GROUP BY entity_name, entity_type 
      HAVING COUNT(*) > 1 
      ORDER BY entity_name, entity_type
    `;
    
    const result = await client.query(duplicateQuery);
    
    if (result.rows.length === 0) {
      console.log('✅ No entities with multiple entries found!');
    } else {
      console.log(`📋 Found ${result.rows.length} entities with multiple entries:\n`);
      
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.entity_name} (${row.entity_type})`);
        console.log(`   Total Count: ${row.total_count}`);
        console.log(`   Distinct Projects: ${row.distinct_projects}`);
        console.log(`   Project IDs: ${row.project_ids}`);
        console.log(`   Measurement Dates: ${row.measurement_dates}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking duplicate projects:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run check
checkDuplicateProjects();
