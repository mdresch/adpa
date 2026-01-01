
const { Pool } = require('pg');
require('dotenv').config();

async function checkJob() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query('SELECT id, status, progress, error_message, created_at FROM jobs WHERE id = $1', ['dc58bf1d-b3c3-4b68-87ef-21574bda154e']);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkJob();
