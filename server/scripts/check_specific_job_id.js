
require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function checkJob() {
    try {
        await db.initDb()
        const res = await db.query('SELECT id, status, progress, error_message, created_at FROM jobs WHERE id = $1', ['dc58bf1d-b3c3-4b68-87ef-21574bda154e']);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

checkJob();
