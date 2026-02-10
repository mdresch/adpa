const { addJob, initializeQueues } = require('./src/services/queueService');
const dotenv = require('dotenv');
const path = require('path');
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

dotenv.config({ path: path.join(__dirname, '.env') });

async function retrigger() {
    try {
        const jobId = '21ec6ed0-ce05-4fca-8d38-c002153687c0';
        console.log(`Retriggering job ${jobId}...`);

        await db.initDb()
        const res = await db.query("SELECT type, data FROM jobs WHERE id = $1", [jobId]);
        if (res.rows.length === 0) {
            console.error('Job not found in DB.');
            process.exit(1);
        }

        const { type, data } = res.rows[0];

        // Delete the old failed job to avoid conflicts with QueueService.addJob
        await db.query("DELETE FROM jobs WHERE id = $1", [jobId]);
        console.log('Deleted old failed job record.');

        // Wait for queues to be ready
        await initializeQueues();

        // Add job back (this will create a new DB record with a new/same ID depending on addJob implementation)
        // Actually addJob generates its own UUID if not provided in options, but here we want to re-trigger.
        // QueueService.addJob handles everything.

        // The job type was 'project-data-extraction' but the queueService expects 'extract-project-data'
        const newJobId = await addJob('extract-project-data', data);

        console.log(`Successfully re-triggered job. New Job ID: ${newJobId}`);
        await db.end();
        process.exit(0);
    } catch (err) {
        console.error('Retrigger error:', err);
        process.exit(1);
    }
}

retrigger();
