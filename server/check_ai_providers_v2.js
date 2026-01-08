const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function checkAIProviders() {
    try {
        await db.initDb()
        const res = await db.query('SELECT id, name, provider_type, is_active FROM ai_providers ORDER BY name');
        console.log(res.rows);
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    } finally {
        await db.end();
    }
}

checkAIProviders();
