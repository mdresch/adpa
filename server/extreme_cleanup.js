
const { Pool } = require('pg');
require('dotenv').config();

async function extremeCleanup() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        // Set ANY job that is not Terminal to Failed and clear progress
        const res = await pool.query(
            "UPDATE jobs SET status = 'failed', progress = 0, error_message = 'Nuked by admin to resolve ghost toasts.' WHERE status NOT IN ('completed', 'failed', 'cancelled')"
        );
        console.log(`Updated ${res.rowCount} non-terminal jobs.`);

        // Specifically target any 10% progress jobs that are left
        const res2 = await pool.query(
            "UPDATE jobs SET progress = 0, status = 'failed' WHERE progress = 10"
        );
        console.log(`Updated ${res2.rowCount} jobs that were at 10% progress.`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

extremeCleanup();
