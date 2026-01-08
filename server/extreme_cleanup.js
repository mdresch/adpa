
require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function extremeCleanup() {
    try {
        await db.initDb()
        // Set ANY job that is not Terminal to Failed and clear progress
        const res = await db.query(
            "UPDATE jobs SET status = 'failed', progress = 0, error_message = 'Nuked by admin to resolve ghost toasts.' WHERE status NOT IN ('completed', 'failed', 'cancelled')"
        );
        console.log(`Updated ${res.rowCount} non-terminal jobs.`);

        // Specifically target any 10% progress jobs that are left
        const res2 = await db.query(
            "UPDATE jobs SET progress = 0, status = 'failed' WHERE progress = 10"
        );
        console.log(`Updated ${res2.rowCount} jobs that were at 10% progress.`);

    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

extremeCleanup();
