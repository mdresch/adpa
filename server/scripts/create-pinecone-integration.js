require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function createPineconeIntegration() {
    const client = await pool.connect();

    try {
        console.log('Creating Pinecone integration...');

        // Get the first admin user
        const userResult = await client.query(
            "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
        );

        if (userResult.rows.length === 0) {
            console.error('❌ No admin user found. Please create an admin user first.');
            return;
        }

        const userId = userResult.rows[0].id;

        // Check if Pinecone integration already exists
        const existingResult = await client.query(
            "SELECT id, name FROM integrations WHERE type = 'pinecone'"
        );

        if (existingResult.rows.length > 0) {
            console.log('✅ Pinecone integration already exists:');
            console.log('   ID:', existingResult.rows[0].id);
            console.log('   Name:', existingResult.rows[0].name);
            return;
        }

        // Create Pinecone integration
        const integrationId = uuidv4();
        const configuration = {
            indexName: process.env.PINECONE_INDEX_NAME || 'adpa-integrated-embeddings',
            environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
            dimension: 1024
        };

        const result = await client.query(
            `INSERT INTO integrations 
       (id, name, type, configuration, is_active, sync_status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, name, type`,
            [
                integrationId,
                'Pinecone Vector Database',
                'pinecone',
                JSON.stringify(configuration),
                true,
                'idle',
                userId
            ]
        );

        console.log('✅ Pinecone integration created successfully!');
        console.log('   ID:', result.rows[0].id);
        console.log('   Name:', result.rows[0].name);
        console.log('   Type:', result.rows[0].type);
        console.log('   Index Name:', configuration.indexName);
        console.log('   Environment:', configuration.environment);

    } catch (error) {
        console.error('❌ Error creating Pinecone integration:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

createPineconeIntegration();
