
require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function cleanupStuckJobs() {
    try {
        await db.initDb()
        const ids = ['cfd90b2b-13f5-4d8b-aaa2-2b2cb9756203', '79930e1d-a595-4d20-940d-358c4097e84f'];
        console.log(`Marking jobs as failed: ${ids.join(', ')}`);

        const res = await db.query(
            "UPDATE jobs SET status = 'failed', error_message = 'Job was stuck due to child job validation error (now fixed). Please retry.', completed_at = CURRENT_TIMESTAMP WHERE id = ANY($1)",
            [ids]
        );

        console.log(`Updated ${res.rowCount} jobs.`);

    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

cleanupStuckJobs();
