
const { Pool } = require('pg');
require('dotenv').config();

async function findProgress10Jobs() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query('SELECT id, type, status, progress, error_message FROM jobs WHERE progress = 10');
        console.log(`Found ${res.rows.length} jobs with progress 10.`);
        res.rows.forEach(r => {
            console.log(`- ID: ${r.id}, Status: ${r.status}, Type: ${r.type}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findProgress10Jobs();
