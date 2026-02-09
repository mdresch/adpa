const { pool } = require('../src/database/connection');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function createPineconeIntegration() {
    try {
        console.log('Creating Pinecone integration...');

        // Get the first admin user
        const userResult = await pool.query(
            "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
        );

        if (userResult.rows.length === 0) {
            console.error('No admin user found. Please create an admin user first.');
            process.exit(1);
        }

        const userId = userResult.rows[0].id;

        // Check if Pinecone integration already exists
        const existingResult = await pool.query(
            "SELECT id FROM integrations WHERE type = 'pinecone'"
        );

        if (existingResult.rows.length > 0) {
            console.log('✅ Pinecone integration already exists:', existingResult.rows[0].id);
            return;
        }

        // Create Pinecone integration
        const integrationId = uuidv4();
        const configuration = {
            indexName: process.env.PINECONE_INDEX_NAME || 'adpa-integrated-embeddings',
            environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
            dimension: 1024
        };

        await pool.query(
            `INSERT INTO integrations 
       (id, name, type, configuration, is_active, sync_status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
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
        console.log('   Integration ID:', integrationId);
        console.log('   Index Name:', configuration.indexName);
        console.log('   Environment:', configuration.environment);

    } catch (error) {
        console.error('❌ Error creating Pinecone integration:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

createPineconeIntegration();
