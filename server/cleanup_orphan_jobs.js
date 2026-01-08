const Bull = require('bull');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

const typeToQueue = {
    'ai-generate': 'ai-processing',
    'document-convert': 'document-processing',
    'pipeline-processing': 'pipeline-processing',
    'baseline-extract': 'baseline-processing',
    'process-flow': 'process-flow-processing',
    'document-regeneration': 'document-regeneration',
    'quality-audit': 'quality-audit',
    'extract-project-data': 'project-data-extraction',
    'project-data-extraction': 'project-data-extraction' // Added second mapping
};

async function cleanupOrphans() {
    try {
        await db.initDb()
        const res = await db.query("SELECT id, type, status FROM jobs WHERE status IN ('pending', 'processing')");
        console.log(`Found ${res.rows.length} jobs in DB to check.`);

        let cleanedCount = 0;
        let syncedCount = 0;

        for (const row of res.rows) {
            const queueName = typeToQueue[row.type];
            if (!queueName) {
                console.warn(`No queue mapping for type: ${row.type}, marking job ${row.id} as failed (unknown type)`);
                await db.query(
                    "UPDATE jobs SET status = 'failed', error_message = 'Unknown job type: marked as failed during cleanup.', completed_at = CURRENT_TIMESTAMP WHERE id = $1",
                    [row.id]
                );
                cleanedCount++;
                continue;
            }

            const q = new Bull(queueName, redisUrl);
            let job = await q.getJob(row.id);

            // Special check for extraction jobs which might use job.data.jobId
            if (!job && (row.type === 'extract-project-data' || row.type === 'project-data-extraction')) {
                const waiting = await q.getWaiting();
                const active = await q.getActive();
                const failed = await q.getFailed();
                const completed = await q.getCompleted();
                job = [...waiting, ...active, ...failed, ...completed].find(j => j.data?.jobId === row.id);
            }

            if (!job) {
                console.log(`Cleaning up orphan job ${row.id} (${row.type}) - missing from ${queueName}`);
                await db.query(
                    "UPDATE jobs SET status = 'failed', error_message = 'Orphaned job: present in DB but missing from queue.', completed_at = CURRENT_TIMESTAMP WHERE id = $1",
                    [row.id]
                );
                cleanedCount++;
            } else {
                const state = await job.getState();
                console.log(`Job ${row.id} (${row.type}) exists in Bull with state: ${state}`);

                // Sync status if Bull says it's done but DB says it's pending/processing
                if (state === 'failed' || state === 'completed') {
                    console.log(`  Syncing DB status to ${state} for job ${row.id}`);
                    await db.query(
                        "UPDATE jobs SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2",
                        [state, row.id]
                    );
                    syncedCount++;
                }
            }

            await q.close();
        }

        console.log(`Cleanup complete.`);
        console.log(`- Marked ${cleanedCount} orphaned jobs as failed.`);
        console.log(`- Synced ${syncedCount} jobs with Bull status.`);

        await db.end();
    } catch (err) {
        console.error('Cleanup error:', err.message);
        process.exit(1);
    }
}

cleanupOrphans();
