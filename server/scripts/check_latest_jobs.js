const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function check() {
    try {
        await db.initDb()
        const res = await db.query("SELECT id, status, type, queued_at, completed_at, error_message FROM jobs ORDER BY queued_at DESC LIMIT 10");
        console.log('Latest 10 Jobs:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

check();
