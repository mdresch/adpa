#!/usr/bin/env node

/**
 * List all tables in the Supabase database
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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

        console.log('🔍 Using DATABASE_URL for connection');
        return new Pool(poolConfig);
    } else {
        console.error('❌ DATABASE_URL not found');
        process.exit(1);
    }
}

async function listTables() {
    const pool = createDatabasePool();
    const client = await pool.connect();

    try {
        console.log('📋 Listing all tables in your Supabase database...\n');

        // Get all tables
        const result = await client.query(`
            SELECT 
                table_schema,
                table_name,
                table_type
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        if (result.rows.length === 0) {
            console.log('No tables found in public schema');
            return;
        }

        console.log(`Found ${result.rows.length} tables:\n`);

        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.table_name} (${row.table_type})`);
        });

        console.log('\n🔍 Getting table details...\n');

        // Get detailed information for each table
        for (const row of result.rows) {
            try {
                const countResult = await client.query(`
                    SELECT COUNT(*) as row_count
                    FROM "${row.table_name}"
                `);
                
                const rowCount = countResult.rows[0].row_count;
                console.log(`📊 ${row.table_name}: ${rowCount} rows`);
            } catch (err) {
                console.log(`📊 ${row.table_name}: Unable to count rows (${err.message})`);
            }
        }

    } catch (error) {
        console.error('❌ Error listing tables:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

// Execute the function
listTables();
