
require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function checkFailedJobs() {
    try {
        await db.initDb()
        const res = await db.query(
            "SELECT id, type, status, error_message, created_at FROM jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 20"
        );
        console.log('--- Recently Failed Jobs ---');
        res.rows.forEach(r => {
            console.log(`ID: ${r.id}, Type: ${r.type}, Error: ${r.error_message?.substring(0, 100)}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

checkFailedJobs();
