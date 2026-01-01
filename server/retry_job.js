const Bull = require('bull');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const jobId = '5e99cb61-c57e-43fb-918c-dd0f3c607b86';

async function retry() {
    console.log(`Retrying job ${jobId} on ai-processing queue...`);
    const q = new Bull('ai-processing', redisUrl);

    const job = await q.getJob(jobId);
    if (job) {
        try {
            await job.retry();
            console.log('✅ Job retried successfully');
        } catch (err) {
            console.error('❌ Failed to retry job:', err.message);
        }
    } else {
        console.error('❌ Job not found in queue');
    }

    await q.close();
}

retry();
