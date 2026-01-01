
const { Pool } = require('pg');
require('dotenv').config();

async function findProcessingJobs() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query("SELECT id, type, status, progress, created_at FROM jobs WHERE status = 'processing'");
        console.log(`Found ${res.rows.length} processing jobs.`);
        res.rows.forEach(r => {
            console.log(`- ID: ${r.id}, Status: ${r.status}, Progress: ${r.progress}%, Type: ${r.type}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findProcessingJobs();
