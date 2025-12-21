const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectJob() {
    try {
        const res = await pool.query("SELECT data FROM jobs WHERE id = '7142061b-ffcf-4dd8-b3c6-5d470e4adfe9'");
        if (res.rows.length > 0) {
            console.log('Job Data:', JSON.stringify(res.rows[0].data, null, 2));
        } else {
            console.log('Job not found.');
        }
        await pool.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

inspectJob();
