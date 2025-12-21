const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findProcessingJob() {
    try {
        const res = await pool.query("SELECT id, type, status, queued_at, data FROM jobs WHERE status = 'processing'");
        console.log('Current Processing Job:', JSON.stringify(res.rows, null, 2));
        await pool.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

findProcessingJob();
