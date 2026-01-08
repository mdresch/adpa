
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function run() {
    try {
        await db.initDb()
        const res = await db.query('SELECT DISTINCT change_type FROM document_versions');
        console.log('Distinct change_type values:', res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
