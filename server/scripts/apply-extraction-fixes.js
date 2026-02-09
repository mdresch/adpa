const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function applyMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const sql = fs.readFileSync('migrations/fix_extraction_errors_2026_02_07.sql', 'utf8');

        console.log('Applying migration...');
        await pool.query(sql);
        console.log('✅ Migration applied successfully!');

        // Verify the changes
        const result = await pool.query(`
            SELECT 
                table_name,
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns
            WHERE table_name IN (
                'satisfaction_surveys',
                'resource_conflicts',
                'resources',
                'onboarding_offboarding'
            )
            AND column_name IN (
                'sentiment',
                'resolution_date',
                'cost_rate',
                'end_date'
            )
            ORDER BY table_name, column_name
        `);

        console.log('\n✅ Verified new columns:');
        result.rows.forEach(row => {
            console.log(`  ${row.table_name}.${row.column_name} (${row.data_type})`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyMigration();
