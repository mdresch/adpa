const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findUser() {
    try {
        const res = await pool.query("SELECT id FROM users LIMIT 1");
        console.log('Valid User ID:', res.rows[0]?.id);
        await pool.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

findUser();
