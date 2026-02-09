const { Pool } = require('pg');
require('dotenv').config();

async function checkEntityExtraction() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Checking Entity Extraction Setup...\n');

        // Check documents count
        const docsResult = await pool.query('SELECT COUNT(*) as count FROM documents');
        console.log(`📄 Total Documents: ${docsResult.rows[0].count}`);

        // Check recent documents
        const recentDocs = await pool.query(`
            SELECT id, title, created_at 
            FROM documents 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.log('\n📋 Recent Documents:');
        recentDocs.rows.forEach(doc => {
            console.log(`  - ${doc.title} (${doc.id}) - ${doc.created_at}`);
        });

        // Check entities count
        const entitiesResult = await pool.query('SELECT COUNT(*) as count FROM document_entities');
        console.log(`\n🏷️  Total Entities: ${entitiesResult.rows[0].count}`);

        // Check if trigger exists
        const triggerCheck = await pool.query(`
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'documents'
            AND trigger_name LIKE '%entity%'
        `);

        console.log('\n⚙️  Entity Extraction Triggers:');
        if (triggerCheck.rows.length === 0) {
            console.log('  ❌ NO TRIGGERS FOUND! This is the problem.');
        } else {
            triggerCheck.rows.forEach(trigger => {
                console.log(`  ✅ ${trigger.trigger_name} (${trigger.event_manipulation})`);
            });
        }

        // Check if entity extraction function exists
        const functionCheck = await pool.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name LIKE '%entity%'
        `);

        console.log('\n🔧 Entity Extraction Functions:');
        if (functionCheck.rows.length === 0) {
            console.log('  ❌ NO FUNCTIONS FOUND!');
        } else {
            functionCheck.rows.forEach(func => {
                console.log(`  ✅ ${func.routine_name}`);
            });
        }

        // Check settings table for entity extractor URL
        const settingsCheck = await pool.query(`
            SELECT key, value 
            FROM settings 
            WHERE key IN ('entity_extractor_url', 'service_role_key')
        `);

        console.log('\n⚙️  Settings Configuration:');
        if (settingsCheck.rows.length === 0) {
            console.log('  ❌ NO SETTINGS FOUND! Entity extractor not configured.');
        } else {
            settingsCheck.rows.forEach(setting => {
                const value = setting.key === 'service_role_key'
                    ? '***' + setting.value.slice(-4)
                    : setting.value;
                console.log(`  ${setting.key}: ${value}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkEntityExtraction();
