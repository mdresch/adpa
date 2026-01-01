
const { Pool } = require('pg');
require('dotenv').config();

async function findProjectJobs() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const projectId = '511ecdde-f6aa-43d9-833c-1c94e8a51fcd';
        console.log(`Searching for all jobs for project: ${projectId}`);

        const res = await pool.query(
            "SELECT id, type, status, progress, created_at, started_at, worker_id FROM jobs WHERE project_id = $1 ORDER BY created_at DESC",
            [projectId]
        );

        console.log(`Found ${res.rows.length} jobs.`);

        const types = {};
        res.rows.forEach(r => {
            types[r.type] = (types[r.type] || 0) + 1;
        });
        console.log('Job types found:', types);

        // Look for extract-entity jobs specifically
        const entityJobs = res.rows.filter(r => r.type.startsWith('extract-entity-'));
        console.log(`\nFound ${entityJobs.length} extract-entity jobs.`);

        if (entityJobs.length > 0) {
            console.log('Sample extract-entity jobs (last 5):');
            entityJobs.slice(0, 5).forEach(r => {
                console.log(`- ${r.id} (${r.type}) status: ${r.status}, progress: ${r.progress}`);
            });
        }

        // Check if any of these have parentJobId in data
        const res2 = await pool.query(
            "SELECT id, type, data FROM jobs WHERE project_id = $1 AND (data->>'parentJobId' IS NOT NULL OR data->>'parent_job_id' IS NOT NULL)",
            [projectId]
        );
        console.log(`\nFound ${res2.rows.length} jobs with parent link in data.`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findProjectJobs();
