const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function inspectTriggers() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Inspecting Triggers on public.documents...\n');

        const res = await pool.query(`
            SELECT 
                trigger_name,
                event_manipulation,
                action_statement,
                action_timing
            FROM information_schema.triggers
            WHERE event_object_table = 'documents'
            AND event_object_schema = 'public'
        `);

        if (res.rows.length === 0) {
            console.log('   ❌ No triggers found.');
        } else {
            res.rows.forEach(t => {
                console.log(`   - ${t.trigger_name} (${t.action_timing} ${t.event_manipulation})`);
                console.log(`     Action: ${t.action_statement}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

inspectTriggers();
