const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkAIProviders() {
    try {
        const res = await pool.query("SELECT name, status, model_name FROM ai_providers");
        console.log('AI Providers:', JSON.stringify(res.rows, null, 2));
        await pool.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

checkAIProviders();
