const dotenv = require('dotenv');
const path = require('path');
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

dotenv.config({ path: path.join(__dirname, '.env') });

async function listRecentFailed() {
    try {
        await db.initDb()
        const res = await db.query("SELECT id, type, status, queued_at, completed_at, error_message FROM jobs WHERE status = 'failed' ORDER BY queued_at DESC LIMIT 10");
        console.log('Recent Failed Jobs:', JSON.stringify(res.rows, null, 2));
        await db.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

listRecentFailed();
