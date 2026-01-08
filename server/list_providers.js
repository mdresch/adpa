const dotenv = require('dotenv');
const path = require('path');
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

dotenv.config({ path: path.join(__dirname, '.env') });

async function listProviders() {
    try {
        await db.initDb()
        const res = await db.query("SELECT name, provider_type, is_active FROM ai_providers");
        console.log('All Providers:', JSON.stringify(res.rows, null, 2));
        await db.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

listProviders();
