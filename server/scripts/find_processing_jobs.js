
require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function findProcessingJobs() {
    try {
        await db.initDb()
        const res = await db.query("SELECT id, type, status, progress, created_at FROM jobs WHERE status = 'processing'");
        console.log(`Found ${res.rows.length} processing jobs.`);
        res.rows.forEach(r => {
            console.log(`- ID: ${r.id}, Status: ${r.status}, Progress: ${r.progress}%, Type: ${r.type}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

findProcessingJobs();
