const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function inspectExtensions() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Inspecting Extensions & Schemas...\n');

        // 1. List Extensions
        console.log('📋 Installed Extensions:');
        const extRes = await pool.query('SELECT * FROM pg_extension');
        extRes.rows.forEach(row => {
            console.log(`   - ${row.extname} (v${row.extversion})`);
        });

        // 2. List Schemas
        console.log('\n📋 Available Schemas:');
        const schemaRes = await pool.query('SELECT nspname FROM pg_namespace');
        schemaRes.rows.forEach(row => {
            console.log(`   - ${row.nspname}`);
        });

        // 3. Check for http_post function location
        console.log('\n📋 Searching for http_post function:');
        const funcRes = await pool.query(`
            SELECT n.nspname, p.proname 
            FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE p.proname = 'http_post'
        `);
        funcRes.rows.forEach(row => {
            console.log(`   - Found at: ${row.nspname}.${row.proname}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

inspectExtensions();
