const dotenv = require('dotenv');
const path = require('path');
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

dotenv.config({ path: path.join(__dirname, '.env') });

async function findUser() {
    try {
        await db.initDb()
        const res = await db.query("SELECT id FROM users LIMIT 1");
        console.log('Valid User ID:', res.rows[0]?.id);
        await db.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

findUser();
