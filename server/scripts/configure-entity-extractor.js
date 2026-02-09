const { Pool } = require('pg');
require('dotenv').config();

async function configureEntityExtractor() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 Configuring Entity Extractor...\n');

        const edgeFunctionUrl = 'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor';

        // Get service role key from environment
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {
            console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables!');
            console.log('\n📝 Please restart the server to load the new .env variable\n');
            process.exit(1);
        }

        console.log('Setting configuration using set_config()...');

        // Use set_config() which works in a session
        await pool.query(`SELECT set_config('app.settings.entity_extractor_url', $1, false)`, [edgeFunctionUrl]);
        await pool.query(`SELECT set_config('app.settings.service_role_key', $1, false)`, [serviceRoleKey]);

        console.log(`✅ Edge Function URL: ${edgeFunctionUrl}`);
        console.log(`✅ Service Role Key: ***${serviceRoleKey.slice(-8)}`);

        // Verify configuration
        console.log('\n🔍 Verifying configuration...');
        const verifyResult = await pool.query(`
            SELECT 
                current_setting('app.settings.entity_extractor_url', true) AS extractor_url,
                CASE WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL 
                    THEN 'Set (' || LENGTH(current_setting('app.settings.service_role_key', true)) || ' chars)' 
                    ELSE 'Not set' 
                END AS key_status
        `);

        console.log('\n📊 Current Settings:');
        console.log(`   URL: ${verifyResult.rows[0].extractor_url || 'NOT SET'}`);
        console.log(`   Key: ${verifyResult.rows[0].key_status}`);

        console.log('\n⚠️  NOTE: These settings are session-level and will be lost on disconnect.');
        console.log('   For permanent configuration, you need to set them at the database level.');
        console.log('\n   Run this SQL in Supabase SQL Editor:');
        console.log(`   ALTER DATABASE postgres SET app.settings.entity_extractor_url = '${edgeFunctionUrl}';`);
        console.log(`   ALTER DATABASE postgres SET app.settings.service_role_key = '${serviceRoleKey}';`);

        console.log('\n✅ Entity Extractor configured for this session!');
        console.log('\n📝 Testing with a sample document...\n');

        // Test by inserting a document
        const testDoc = await pool.query(`
            INSERT INTO documents (content, title, name)
            VALUES ('Acme Corporation met with John Doe and Jane Smith in Paris to discuss Project Atlas.', 'Test Entity Extraction', 'test-entity-extraction.txt')
            RETURNING id, title
        `);

        console.log(`✅ Inserted test document: ${testDoc.rows[0].title} (${testDoc.rows[0].id})`);
        console.log('\n⏳ Waiting 3 seconds for entity extraction...\n');

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check for extracted entities
        const entities = await pool.query(`
            SELECT entity, type, score
            FROM document_entities
            WHERE document_id = $1
            ORDER BY score DESC
        `, [testDoc.rows[0].id]);

        if (entities.rows.length > 0) {
            console.log(`🎉 SUCCESS! Extracted ${entities.rows.length} entities:`);
            entities.rows.forEach(e => {
                console.log(`   - ${e.entity} (${e.type || 'unknown'}) - confidence: ${e.score || 'N/A'}`);
            });
        } else {
            console.log('⚠️  No entities extracted yet. Check:');
            console.log('   1. Edge Function logs in Supabase Dashboard');
            console.log('   2. Database trigger is enabled');
            console.log('   3. Service role key is correct');
        }

        await pool.end();

    } catch (error) {
        console.error('❌ Configuration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

configureEntityExtractor();
