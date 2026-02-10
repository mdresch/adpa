
const Bull = require('bull');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

async function checkQueues() {
    const queues = [
        'ai-processing',
        'document-processing',
        'pipeline-processing',
        'baseline-processing',
        'process-flow-processing',
        'document-regeneration',
        'quality-audit',
        'project-data-extraction',
        'confluence-publishing'
    ];

    for (const name of queues) {
        const queue = new Bull(name, redisUrl);
        const counts = await queue.getJobCounts();
        console.log(`Queue: ${name}`);
        console.log(JSON.stringify(counts, null, 2));

        if (counts.active > 0) {
            const active = await queue.getActive();
            active.forEach(j => console.log(`  - Active Job: ${j.id} (${j.name})`));
        }
        await queue.close();
    }
}

checkQueues();
