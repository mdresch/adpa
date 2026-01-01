
const { Pool } = require('pg');
require('dotenv').config();

async function analyzeChildren() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const parentIds = ['cfd90b2b-13f5-4d8b-aaa2-2b2cb9756203', '79930e1d-a595-4d20-940d-358c4097e84f'];

        for (const parentId of parentIds) {
            console.log(`\n=== Analyzing Parent Job: ${parentId} ===`);

            const childrenRes = await pool.query(
                `SELECT id, type, status, progress, error_message, processing_started_at
         FROM jobs 
         WHERE data->>'parentJobId' = $1 
         OR data->>'parent_job_id' = $1`,
                [parentId]
            );

            console.log(`Found ${childrenRes.rows.length} child jobs.`);

            const statusCounts = {};
            childrenRes.rows.forEach(child => {
                statusCounts[child.status] = (statusCounts[child.status] || 0) + 1;
            });
            console.log('Status counts:', statusCounts);

            if (statusCounts['processing'] > 0) {
                console.log('\nProcessing child jobs:');
                childrenRes.rows.filter(c => c.status === 'processing').forEach(c => {
                    console.log(`- ${c.id} (${c.type}) started at ${c.processing_started_at}`);
                });
            }

            if (statusCounts['pending'] > 0) {
                console.log('\nPending child jobs:');
                childrenRes.rows.filter(c => c.status === 'pending').forEach(c => {
                    console.log(`- ${c.id} (${c.type})`);
                });
            }

            if (statusCounts['failed'] > 0) {
                console.log('\nFailed child jobs (last 5):');
                childrenRes.rows.filter(c => c.status === 'failed').slice(0, 5).forEach(c => {
                    console.log(`- ${c.id} (${c.type}): ${c.error_message}`);
                });
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

analyzeChildren();
