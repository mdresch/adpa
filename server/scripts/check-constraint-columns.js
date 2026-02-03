#!/usr/bin/env node

/**
 * Script: Check constraint columns
 * Description: Shows what columns the unique constraint covers
 * Usage: node server/scripts/check-constraint-columns.js
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

async function checkConstraintColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking constraint columns...\n');
    
    // Check constraint columns
    const constraintQuery = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'performance_actuals'
        AND tc.constraint_type = 'UNIQUE'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `;
    
    const result = await client.query(constraintQuery);
    
    if (result.rows.length === 0) {
      console.log('❌ No unique constraints found');
    } else {
      console.log(`✅ Unique constraint columns:\n`);
      
      let currentConstraint = '';
      result.rows.forEach((row) => {
        if (row.constraint_name !== currentConstraint) {
          if (currentConstraint) console.log('');
          console.log(`${row.constraint_name}:`);
          currentConstraint = row.constraint_name;
        }
        console.log(`   ${row.ordinal_position}. ${row.column_name}`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking constraint columns:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run check
checkConstraintColumns();
