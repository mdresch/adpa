
const { Pool } = require('pg');
require('dotenv').config();

async function checkFailedJobs() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query(
            "SELECT id, type, status, error_message, created_at FROM jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 20"
        );
        console.log('--- Recently Failed Jobs ---');
        res.rows.forEach(r => {
            console.log(`ID: ${r.id}, Type: ${r.type}, Error: ${r.error_message?.substring(0, 100)}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkFailedJobs();
