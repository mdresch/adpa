
const { Pool } = require('pg');
require('dotenv').config();

async function findPotentialToastJobs() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query(
            "SELECT id, type, status, progress, error_message, created_at FROM jobs WHERE progress = 10 OR status IN ('pending', 'processing', 'stuck') ORDER BY created_at DESC LIMIT 50"
        );
        console.log(`Found ${res.rows.length} relevant jobs.`);
        res.rows.forEach(r => {
            console.log(`- ID: ${r.id}, Type: ${r.type}, Status: ${r.status}, Progress: ${r.progress}%, Created: ${r.created_at}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findPotentialToastJobs();
