require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function check() {
    try {
        await db.initDb()
        const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'jobs'");
        console.log('Columns:');
        res.rows.forEach(r => console.log(r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

check();
