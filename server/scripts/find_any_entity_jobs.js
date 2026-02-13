
require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function findAnyEntityJobs() {
    try {
        await db.initDb()
        const res = await db.query(
            "SELECT id, type, project_id, status, created_at FROM jobs WHERE type LIKE 'extract-entity-%' ORDER BY created_at DESC LIMIT 50"
        );

        console.log(`Found ${res.rows.length} entity extraction jobs in total.`);
        res.rows.forEach(r => {
            console.log(`- ${r.id} (${r.type}) status: ${r.status}, project: ${r.project_id}, created: ${r.created_at}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

findAnyEntityJobs();
