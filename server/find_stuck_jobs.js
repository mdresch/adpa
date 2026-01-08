const dotenv = require('dotenv');
const path = require('path');
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

dotenv.config({ path: path.join(__dirname, '.env') });

async function findStuckJobs() {
    try {
        const sql = `
      SELECT id, type, status, started_at, processing_started_at 
      FROM jobs 
      WHERE status = 'processing' 
      AND (
        started_at < NOW() - INTERVAL '1 hour' 
        OR processing_started_at < NOW() - INTERVAL '1 hour'
      )
    `;
        await db.initDb()
        const res = await db.query(sql);
        console.log('Stuck Processing Jobs:', res.rows);
        await db.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

findStuckJobs();
