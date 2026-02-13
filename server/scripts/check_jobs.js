require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function check() {
    try {
        await db.initDb()
        const res = await db.query("SELECT id, status, type, error_message, failed_at FROM jobs WHERE id = '4fe2f1e6-cd2a-4821-a351-79be27db3db1'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

check();
