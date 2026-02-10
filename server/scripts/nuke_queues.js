
const Bull = require('bull');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

async function nukeAllQueues() {
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

        // Get active and waiting jobs
        const active = await queue.getActive();
        const waiting = await queue.getWaiting();
        const stalled = await queue.getJobs(['stalled']);

        const all = [...active, ...waiting, ...stalled];

        if (all.length > 0) {
            console.log(`Cleaning ${all.length} jobs from queue: ${name}`);
            for (const job of all) {
                console.log(`  - Removing job ${job.id} (${job.queue.name})`);
                try {
                    // Try to fail it first so it's recorded as failed if possible, then remove
                    await job.remove();
                } catch (e) {
                    console.error(`    Failed to remove job ${job.id}: ${e.message}`);
                }
            }
        } else {
            console.log(`Queue ${name} is clean.`);
        }

        await queue.close();
    }
}

nukeAllQueues().then(() => console.log('All queues nuked.'));
