#!/usr/bin/env node

/**
 * Script: Verify unique constraint on performance_actuals
 * Description: Check if the unique constraint is properly applied
 * Usage: node server/scripts/verify-constraint.js
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

async function verifyConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying unique constraint on performance_actuals...\n');
    
    // Check constraints on the table
    const constraintQuery = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        tc.is_deferrable,
        tc.initially_deferred
      FROM information_schema.table_constraints tc
      WHERE tc.table_name = 'performance_actuals'
        AND tc.constraint_type = 'UNIQUE'
      ORDER BY tc.constraint_name
    `;
    
    const result = await client.query(constraintQuery);
    
    if (result.rows.length === 0) {
      console.log('❌ No unique constraints found on performance_actuals table');
    } else {
      console.log(`✅ Found ${result.rows.length} unique constraint(s):\n`);
      
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.constraint_name}`);
        console.log(`   Type: ${row.constraint_type}`);
        console.log('');
      });
    }
    
    // Try to manually insert a duplicate to test the constraint
    console.log('🧪 Testing unique constraint...');
    
    // Get a sample entity to test with
    const sampleQuery = `
      SELECT project_id, entity_type, entity_name 
      FROM performance_actuals 
      LIMIT 1
    `;
    
    const sampleResult = await client.query(sampleQuery);
    
    if (sampleResult.rows.length > 0) {
      const sample = sampleResult.rows[0];
      console.log(`   Testing with: ${sample.entity_name} (${sample.entity_type})`);
      
      try {
        const testInsert = `
          INSERT INTO performance_actuals 
          (project_id, entity_type, entity_name, measurement_date) 
          VALUES ($1, $2, $3, NOW())
        `;
        
        await client.query(testInsert, [sample.project_id, sample.entity_type, sample.entity_name]);
        console.log('   ❌ Constraint not working - duplicate inserted successfully!');
        
        // Clean up the test insert
        await client.query('DELETE FROM performance_actuals WHERE entity_name = $1 AND measurement_date >= NOW() - INTERVAL \'1 minute\'', [sample.entity_name]);
        
      } catch (error) {
        if (error.code === '23505') { // unique_violation
          console.log('   ✅ Constraint working - duplicate prevented!');
        } else {
          console.log(`   ⚠️ Unexpected error: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error verifying constraint:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run verification
verifyConstraint();
