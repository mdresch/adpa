
require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function cleanupStuck10Percent() {
    try {
        await db.initDb()
        const res = await db.query(
            "UPDATE jobs SET status = 'failed', error_message = 'Job was stuck at 10% (cleaned up to stop ghost notifications).', completed_at = CURRENT_TIMESTAMP WHERE (progress = 10 AND status = 'stuck') OR (id = '68035924-3332-4f34-a84e-113c6af4f8c9' AND status = 'pending')"
        );
        console.log(`Updated ${res.rowCount} jobs.`);
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

cleanupStuck10Percent();
