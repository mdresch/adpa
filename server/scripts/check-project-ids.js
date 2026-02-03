#!/usr/bin/env node

/**
 * Script: Check project IDs for remaining duplicates
 * Description: Shows if duplicates are from different projects
 * Usage: node server/scripts/check-project-ids.js
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

async function checkProjectIds() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking project IDs for remaining duplicates...\n');
    
    // Check duplicates with project IDs
    const duplicateQuery = `
      SELECT 
        entity_name, 
        entity_type, 
        project_id,
        COUNT(*) as duplicate_count,
        STRING_AGG(DISTINCT measurement_date::text, ', ') as measurement_dates
      FROM performance_actuals 
      WHERE entity_name IN (
        SELECT entity_name 
        FROM performance_actuals 
        GROUP BY entity_name, entity_type 
        HAVING COUNT(*) > 1
      )
      GROUP BY entity_name, entity_type, project_id 
      HAVING COUNT(*) > 1 
      ORDER BY entity_name, entity_type, project_id
    `;
    
    const result = await client.query(duplicateQuery);
    
    if (result.rows.length === 0) {
      console.log('✅ No duplicates found across projects!');
    } else {
      console.log(`📋 Found duplicates across projects:\n`);
      
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.entity_name} (${row.entity_type})`);
        console.log(`   Project ID: ${row.project_id}`);
        console.log(`   Count: ${row.duplicate_count}`);
        console.log(`   Measurement Dates: ${row.measurement_dates}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking project IDs:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run check
checkProjectIds();
