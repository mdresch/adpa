
require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function findProgress10Jobs() {
    try {
        await db.initDb()
        const res = await db.query('SELECT id, type, status, progress, error_message FROM jobs WHERE progress = 10');
        console.log(`Found ${res.rows.length} jobs with progress 10.`);
        res.rows.forEach(r => {
            console.log(`- ID: ${r.id}, Status: ${r.status}, Type: ${r.type}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

findProgress10Jobs();
