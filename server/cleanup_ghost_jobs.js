
const { Pool } = require('pg');
require('dotenv').config();

async function cleanupStuck10Percent() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query(
            "UPDATE jobs SET status = 'failed', error_message = 'Job was stuck at 10% (cleaned up to stop ghost notifications).', completed_at = CURRENT_TIMESTAMP WHERE (progress = 10 AND status = 'stuck') OR (id = '68035924-3332-4f34-a84e-113c6af4f8c9' AND status = 'pending')"
        );
        console.log(`Updated ${res.rowCount} jobs.`);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

cleanupStuck10Percent();
