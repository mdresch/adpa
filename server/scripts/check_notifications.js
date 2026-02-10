
require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function checkNotifications() {
    try {
        await db.initDb()
        const res = await db.query("SELECT * FROM notifications WHERE status = 'unread' LIMIT 50");
        console.log(`Found ${res.rows.length} unread notifications.`);
        res.rows.forEach(r => {
            console.log(`- ID: ${r.id}, Type: ${r.type}, Message: ${r.message}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

checkNotifications();
