const Bull = require('bull');
const dotenv = require('dotenv');
const path = require('path');
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

dotenv.config({ path: path.join(__dirname, '.env') });

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const typeToQueue = {
    'ai-generate': 'ai-processing',
    'document-convert': 'document-processing',
    'pipeline-processing': 'pipeline-processing',
    'baseline-extract': 'baseline-processing',
    'process-flow': 'process-flow-processing',
    'document-regeneration': 'document-regeneration',
    'quality-audit': 'quality-audit',
    'extract-project-data': 'project-data-extraction'
};

async function verifyJobs() {
    try {
        await db.initDb()
        const res = await db.query("SELECT id, type, status FROM jobs WHERE status = 'pending' LIMIT 5");
        console.log(`Found ${res.rows.length} pending jobs in DB to check.`);

        for (const row of res.rows) {
            const queueName = typeToQueue[row.type];
            if (!queueName) {
                console.log(`No queue mapping for type: ${row.type}`);
                continue;
            }

            const q = new Bull(queueName, redisUrl);
            const job = await q.getJob(row.id);

            if (job) {
                const state = await job.getState();
                console.log(`Job ${row.id} (${row.type}) FOUND in ${queueName}. Bull State: ${state}`);
            } else {
                console.log(`Job ${row.id} (${row.type}) MISSING in ${queueName}.`);

                // Also check if it might be under a different ID in Bull
                const waiting = await q.getWaiting();
                const foundInWaiting = waiting.find(j => j.data?.jobId === row.id);
                if (foundInWaiting) {
                    console.log(`  Found job in waiting with jobId ${row.id} (Bull ID: ${foundInWaiting.id})`);
                }
            }
            await q.close();
        }

        await db.end();
    } catch (err) {
        console.error('Verification error:', err.message);
    }
}

verifyJobs();
