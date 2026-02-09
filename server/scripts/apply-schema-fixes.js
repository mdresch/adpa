#!/usr/bin/env node
/**
 * Apply Schema Fixes
 * Fixes missing columns and constraints in database tables
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyFixes() {
    console.log('🔧 Applying database schema fixes...\n');

    // Parse DATABASE_URL or use individual components
    let poolConfig;

    if (process.env.DATABASE_URL) {
        poolConfig = { connectionString: process.env.DATABASE_URL };
    } else {
        poolConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'adpa',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || ''
        };
    }

    const pool = new Pool(poolConfig);

    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✓ Database connected\n');

        // Read and execute the migration
        const migrationPath = path.join(__dirname, '..', 'migrations', 'fix_schema_issues.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await pool.query(sql);

        console.log('✅ Schema fixes applied successfully!\n');
        console.log('Fixed issues:');
        console.log('  ✓ Added response_action to risk_triggers');
        console.log('  ✓ Added availability_pct to resources');
        console.log('  ✓ Added resolution to resource_conflicts');
        console.log('  ✓ Made reported_date nullable in stakeholder_issues');
        console.log('  ✓ Expanded engagement_actions action_type constraint');
        console.log('  ✓ Created performance indexes\n');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error applying fixes:', error.message);
        console.error('\nFull error:', error);
        await pool.end();
        process.exit(1);
    }
}

applyFixes();
