import { addJob, initializeQueues } from './src/services/queueService';
import dotenv from 'dotenv';
import path from 'path';
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

dotenv.config({ path: path.join(__dirname, '.env') });

async function retrigger() {
    try {
        const jobId = '21ec6ed0-ce05-4fca-8d38-c002153687c0';
        console.log(`Retriggering extraction for project b33e825c-1782-4973-8ac4-aea3d6aab701 using Moonshot...`);

        const data = {
            jobId: jobId,
            projectId: 'b33e825c-1782-4973-8ac4-aea3d6aab701',
            userId: '3ff9db0c-f239-4291-a61b-6a2800027106',
            domains: [
                "stakeholders", "team", "development_approach", "planning",
                "project_work", "delivery", "measurement", "uncertainty",
                "governance", "scope", "schedule", "finance", "resources",
                "risk", "stakeholders_ops"
            ],
            documentIds: ["d8b74a5f-eacd-48df-a10d-cf5ad52d24f0"],
            aiProvider: 'moonshot',
            aiModel: 'kimi-k2-0905-preview'
        };

        // Clean up DB for fresh start
        await db.initDb()
        await db.query("DELETE FROM jobs WHERE id = $1", [jobId]);
        console.log('Cleaned up previous job record.');

        // Initialize queues
        await initializeQueues();

        console.log('Adding job to queue with Moonshot...');
        const newJobId = await addJob('extract-project-data', data, { jobId });

        console.log(`Successfully re-triggered job. ID: ${newJobId}`);
        await db.end();
        process.exit(0);
    } catch (err) {
        console.error('Retrigger error:', err);
        process.exit(1);
    }
}

retrigger();
