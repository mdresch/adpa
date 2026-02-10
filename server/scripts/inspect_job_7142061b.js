const db = require('./src/lib/db');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function inspectData() {
    try {
        await db.initDb()
        const res = await db.query(
            "SELECT id, data FROM jobs WHERE id = '7142061b-...'"
        );
        console.log(res.rows[0]);
        await db.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

inspectData();
