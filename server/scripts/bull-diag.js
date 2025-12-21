const { Pool } = require('pg');
const Queue = require('bull');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Initialize Bull queue connection
const extractionQueue = new Queue('project-data-extraction', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

async function diagnose() {
    console.log('🔍 Bull Queue Analysis for Extraction Pipeline\n');

    try {
        // 1. Check Bull queue counts
        console.log('[1] Bull Queue Status:');
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            extractionQueue.getWaitingCount(),
            extractionQueue.getActiveCount(),
            extractionQueue.getCompletedCount(),
            extractionQueue.getFailedCount(),
            extractionQueue.getDelayedCount()
        ]);

        console.log(`   Waiting: ${waiting}`);
        console.log(`   Active: ${active}`);
        console.log(`   Completed: ${completed}`);
        console.log(`   Failed: ${failed}`);
        console.log(`   Delayed: ${delayed}\n`);

        // 2. Get active jobs from Bull
        console.log('[2] Active Jobs in Bull:');
        const activeJobs = await extractionQueue.getActive();
        console.log(`   Found ${activeJobs.length} active jobs in Bull`);
        if (activeJobs.length > 0) {
            activeJobs.forEach(job => {
                console.log(`   - Job ${job.id}: ${job.name}`);
                console.log(`     Data:`, JSON.stringify(job.data, null, 2).substring(0, 200));
            });
        }

        // 3. Get some failed jobs for inspection
        console.log('\n[3] Recent Failed Jobs in Bull:');
        const failedJobs = await extractionQueue.getFailed(0, 5);
        console.log(`   Found ${failedJobs.length} recent failed jobs`);
        failedJobs.forEach(job => {
            console.log(`   - Job ${job.id}: ${job.name}`);
            console.log(`     Error: ${job.failedReason?.substring(0, 150)}`);
        });

        // 4. Get waiting jobs
        console.log('\n[4] Waiting Jobs in Bull:');
        const waitingJobs = await extractionQueue.getWaiting(0, 10);
        console.log(`   Found ${waitingJobs.length} waiting jobs`);
        waitingJobs.forEach(job => {
            console.log(`   - Job ${job.id}: ${job.name}`);
        });

        console.log('\n✅ Bull queue diagnostic complete');

    } catch (error) {
        console.error('❌ Diagnosis failed:', error.message);
        console.error(error);
    } finally {
        await extractionQueue.close();
        await pool.end();
    }
}

diagnose();
