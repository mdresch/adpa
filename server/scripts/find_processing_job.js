const dotenv = require('dotenv');
const path = require('path');
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

dotenv.config({ path: path.join(__dirname, '.env') });

async function findProcessingJob() {
    try {
        await db.initDb()
        const res = await db.query("SELECT id, type, status, queued_at, data FROM jobs WHERE status = 'processing'");
        console.log('Current Processing Job:', JSON.stringify(res.rows, null, 2));
        await db.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

findProcessingJob();
