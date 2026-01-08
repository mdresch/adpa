const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function checkDatabaseJobs() {
    try {
        await db.initDb()
        const res = await db.query("SELECT id, type, status, queued_at FROM jobs WHERE status = 'pending' ORDER BY queued_at ASC LIMIT 10");
        console.log('Pending Jobs in DB:', res.rows);

        const statusCounts = await db.query("SELECT status, count(*) FROM jobs GROUP BY status");
        console.log('Global Status Counts:', statusCounts.rows);

        await db.end();
    } catch (err) {
        console.error('Database query error:', err.message);
    }
}

checkDatabaseJobs();
