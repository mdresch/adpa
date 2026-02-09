const { Pool } = require('pg');
require('dotenv').config();

async function inspectTables() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Inspecting Tables...\n');

        const tables = ['documents', 'documents_raw'];

        for (const table of tables) {
            console.log(`\n📋 Table: ${table}`);
            const res = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);

            if (res.rows.length === 0) {
                console.log('   ❌ Table not found');
            } else {
                res.rows.forEach(col => {
                    console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
                });

                // key counts
                const count = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`   📊 Row count: ${count.rows[0].count}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

inspectTables();
