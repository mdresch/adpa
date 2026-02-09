const { Pool } = require('pg');
require('dotenv').config();

async function fixDocumentsRawTable() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    try {
        console.log('Fixing documents_raw table...');

        await pool.query(`
            ALTER TABLE documents_raw 
            ALTER COLUMN id SET DEFAULT gen_random_uuid();
        `);

        console.log('✅ Successfully added DEFAULT gen_random_uuid() to documents_raw.id');
        console.log('\nYou can now insert documents without providing an id!');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

fixDocumentsRawTable();
