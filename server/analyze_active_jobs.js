
const { Pool } = require('pg');
require('dotenv').config();

async function analyzeJobs() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('--- All Active Jobs ---');
        const jobsRes = await pool.query(
            `SELECT id, type, status, progress, created_at, processing_started_at, worker_id, error_message, project_id, data
       FROM jobs 
       WHERE status = 'processing' 
       ORDER BY created_at DESC`
        );

        console.log(`Found ${jobsRes.rows.length} active jobs.\n`);

        jobsRes.rows.forEach(job => {
            console.log(`ID: ${job.id}`);
            console.log(`Type: ${job.type}`);
            console.log(`Progress: ${job.progress}%`);
            console.log(`Created: ${job.created_at}`);
            console.log(`Started: ${job.processing_started_at}`);
            console.log(`Worker: ${job.worker_id}`);
            console.log(`Project: ${job.project_id}`);
            if (job.data && job.data.parentJobId) {
                console.log(`Parent Job ID: ${job.data.parentJobId}`);
            }
            console.log('-------------------');
        });

        // Also check for jobs that might be "stuck" in pending
        console.log('\n--- Jobs Stuck in Pending (> 10 mins) ---');
        const pendingRes = await pool.query(
            `SELECT id, type, created_at 
       FROM jobs 
       WHERE status = 'pending' 
       AND created_at < NOW() - INTERVAL '10 minutes'`
        );
        pendingRes.rows.forEach(job => {
            console.log(`ID: ${job.id}, Type: ${job.type}, Created: ${job.created_at}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

analyzeJobs();
