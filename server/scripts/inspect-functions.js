const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function inspectFunctions() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Inspecting Function Definitions...\n');

        const functions = ['http_post'];

        for (const funcName of functions) {
            console.log(`\n📋 Function: ${funcName}`);
            // Search in extensions schema specifically
            const res = await pool.query(`
                SELECT pg_get_functiondef(oid) as definition
                FROM pg_proc
                WHERE proname = $1
            `, [funcName]);

            if (res.rows.length === 0) {
                console.log('   ❌ Function not found.');
            } else {
                console.log(res.rows[0].definition);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

inspectFunctions();
