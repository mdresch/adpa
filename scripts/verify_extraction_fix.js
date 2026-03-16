
const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkCounts() {
    try {
        const tables = ['utilization_records', 'capacity_forecasts', 'resource_conflicts'];
        
        console.log('--- Extraction Verification ---');
        for (const table of tables) {
            const res = await pool.query(`SELECT count(*) FROM ${table}`);
            console.log(`${table}: ${res.rows[0].count} records`);
        }
        
        // Also check if we have any recent errors in the logs (simulated by checking if we can see any failed jobs in DB if we had a jobs table, but let's stick to the entities for now)
        
    } catch (err) {
        console.error('Error querying database:', err.message);
    } finally {
        await pool.end();
    }
}

checkCounts();
