const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
        const res = await pool.query(sql);
        console.log('Stuck Processing Jobs:', res.rows);
        await pool.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

findStuckJobs();
