#!/usr/bin/env node

/**
 * List Tables with Location Tracking Fields
 * Shows all tables and indicates which have source document highlighting fields
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

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
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
        };
        return new Pool(poolConfig);
    }
}

async function listTablesWithLocationFields() {
    const pool = createDatabasePool();
    
    try {
        console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? '***' : 'Not set');
        console.log('🔍 DB_HOST:', process.env.DB_HOST || 'localhost');
        console.log('');

        // Get all tables
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        console.log('📊 Tables Analysis for Source Document Highlighting');
        console.log('='.repeat(80));
        
        let totalTables = 0;
        let tablesWithLocationFields = 0;
        let totalEntities = 0;

        for (const table of tablesResult.rows) {
            const tableName = table.table_name;
            totalTables++;

            // Check if table has location tracking fields
            const columnsResult = await pool.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = $1
                AND table_schema = 'public'
                ORDER BY ordinal_position
            `, [tableName]);

            const hasLocationFields = columnsResult.rows.some(col => 
                col.column_name.includes('source_document') || 
                col.column_name.includes('source_text') ||
                col.column_name.includes('source_line')
            );

            // Get row count estimate
            let rowCount = 0;
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
                rowCount = parseInt(countResult.rows[0].count);
            } catch (error) {
                // Table might not exist or have permission issues
            }

            const locationFields = columnsResult.rows.filter(col => 
                col.column_name.includes('source_document') || 
                col.column_name.includes('source_text') ||
                col.column_name.includes('source_line') ||
                col.column_name.includes('source_context') ||
                col.column_name.includes('source_snippet') ||
                col.column_name.includes('entity_markdown_tag')
            );

            if (hasLocationFields) {
                tablesWithLocationFields++;
                totalEntities += rowCount;
                console.log(`✅ ${tableName.padEnd(35)} | Rows: ${rowCount.toString().padEnd(8)} | Location Fields: ${locationFields.length}`);
                if (locationFields.length > 0) {
                    console.log(`   └─ Fields: ${locationFields.map(f => f.column_name).join(', ')}`);
                }
            } else {
                console.log(`⭕ ${tableName.padEnd(35)} | Rows: ${rowCount.toString().padEnd(8)} | No location tracking`);
            }
        }

        console.log('='.repeat(80));
        console.log(`📈 Summary:`);
        console.log(`   Total Tables: ${totalTables}`);
        console.log(`   Tables with Location Fields: ${tablesWithLocationFields}`);
        console.log(`   Total Entities Ready for Highlighting: ${totalEntities.toLocaleString()}`);
        console.log('');
        console.log('🎯 Location Tracking Fields Added:');
        console.log('   - source_document_id (UUID REFERENCES documents(id))');
        console.log('   - source_text_start (INTEGER)');
        console.log('   - source_text_end (INTEGER)');
        console.log('   - source_line_start (INTEGER)');
        console.log('   - source_line_end (INTEGER)');
        console.log('   - source_context (TEXT)');
        console.log('   - source_snippet (TEXT)');
        console.log('   - entity_markdown_tag (VARCHAR(10))');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

// Execute the function
listTablesWithLocationFields();
