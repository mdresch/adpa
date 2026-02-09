const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runFix() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 Applying fix for entity extractor trigger...');
        const sql = fs.readFileSync(path.resolve(__dirname, '../migrations/fix_entity_extractor_trigger.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Fix applied successfully.');
    } catch (error) {
        console.error('❌ Error applying fix:', error.message);
    } finally {
        await pool.end();
    }
}

runFix();
