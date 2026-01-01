
const { Pool } = require('pg');
require('dotenv').config();

async function checkNotifications() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query("SELECT * FROM notifications WHERE status = 'unread' LIMIT 50");
        console.log(`Found ${res.rows.length} unread notifications.`);
        res.rows.forEach(r => {
            console.log(`- ID: ${r.id}, Type: ${r.type}, Message: ${r.message}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkNotifications();
