const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function checkAIProviders() {
    try {
        await db.initDb()
        const res = await db.query("SELECT name, status, model_name FROM ai_providers");
        console.log('AI Providers:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    } finally {
        await db.end();
    }
}

checkAIProviders();
