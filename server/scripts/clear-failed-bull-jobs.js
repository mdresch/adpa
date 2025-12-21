const Queue = require('bull');
require('dotenv').config();

const extractionQueue = new Queue('project-data-extraction', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

async function clearFailedJobs() {
    console.log('🧹 Clearing failed jobs from Bull queue...\n');

    try {
        const failedJobs = await extractionQueue.getFailed();
        console.log(`Found ${failedJobs.length} failed jobs to clear`);

        let cleared = 0;
        for (const job of failedJobs) {
            try {
                await job.remove();
                cleared++;
            } catch (err) {
                console.error(`   Failed to remove job ${job.id}:`, err.message);
            }
        }

        console.log(`\n✅ Cleared ${cleared} failed jobs from Bull queue`);

    } catch (error) {
        console.error('❌ Failed to clear jobs:', error.message);
    } finally {
        await extractionQueue.close();
    }
}

clearFailedJobs();
