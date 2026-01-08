#!/usr/bin/env node

/**
 * Check existing table schemas to understand what needs to be migrated
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function checkTables() {
    await db.initDb()
    const pool = db.getPool()
    const client = await pool.connect();
    try {
        const tables = ['lessons_learned', 'improvement_suggestions', 'entity_extractions', 'project_entity_baselines'];
        
        for (const tableName of tables) {
            console.log(`\n📋 Table: ${tableName}`);
            const exists = await client.query(`
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = $1
                ) AS table_exists;
            `, [tableName]);
            
            if (exists.rows[0].table_exists) {
                const columns = await client.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = $1
                    ORDER BY ordinal_position;
                `, [tableName]);
                
                console.log(`  ✅ Exists with ${columns.rows.length} columns:`);
                columns.rows.forEach(col => {
                    console.log(`     - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
                });
            } else {
                console.log(`  ❌ Does not exist`);
            }
        }
    } finally {
        client.release();
        await db.end();
    }
}

checkTables().catch(console.error);

