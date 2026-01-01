
const Bull = require('bull');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

async function obliterateQueues() {
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
        console.log(`Obliterating queue: ${name}...`);
        try {
            // Obliterate clears all jobs and metadata
            await queue.obliterate({ force: true });
            console.log(`  - Obliterated ${name}`);
        } catch (e) {
            console.error(`  - Failed to obliterate ${name}: ${e.message}`);
        }
        await queue.close();
    }
}

obliterateQueues().then(() => console.log('All queues obliterated.'));
