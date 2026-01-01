
const { Pool } = require('pg');
require('dotenv').config();

async function findAnyEntityJobs() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query(
            "SELECT id, type, project_id, status, created_at FROM jobs WHERE type LIKE 'extract-entity-%' ORDER BY created_at DESC LIMIT 50"
        );

        console.log(`Found ${res.rows.length} entity extraction jobs in total.`);
        res.rows.forEach(r => {
            console.log(`- ${r.id} (${r.type}) status: ${r.status}, project: ${r.project_id}, created: ${r.created_at}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findAnyEntityJobs();
