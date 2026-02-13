const Bull = require('bull');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
console.log('Checking Redis URL:', redisUrl);

const queues = [
    'ai-processing',
    'document-processing',
    'pipeline-processing',
    'process-flow-processing',
    'project-data-extraction',
    'baseline-processing',
    'document-regeneration',
    'quality-audit'
];

async function checkQueues() {
    for (const name of queues) {
        try {
            const q = new Bull(name, redisUrl);
            const counts = await q.getJobCounts();
            console.log(`${name}:`, counts);

            if (counts.waiting > 0) {
                const waitingJobs = await q.getWaiting();
                console.log(`  Waiting Jobs (first 5):`, waitingJobs.slice(0, 5).map(j => ({ id: j.id, data: j.data })));
            }

            if (counts.active > 0) {
                const activeJobs = await q.getActive();
                console.log(`  Active Jobs:`, activeJobs.map(j => ({ id: j.id, data: j.data })));
            }

            await q.close();
        } catch (err) {
            console.error(`Error checking queue ${name}:`, err.message);
        }
    }
}

checkQueues();
