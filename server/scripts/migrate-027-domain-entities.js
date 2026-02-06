#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : false
});

async function runMigration() {
    const client = await pool.connect();
    try {
        const migrationPath = path.join(__dirname, '../src/database/migrations/027_domain_entities.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('Successfully applied migration 027_domain_entities.sql');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
