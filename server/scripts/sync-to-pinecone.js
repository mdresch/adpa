require('dotenv').config();
const { Pool } = require('pg');
const { Pinecone } = require('@pinecone-database/pinecone');
const { MongoClient } = require('mongodb');

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

const indexName = process.env.PINECONE_INDEX_NAME || 'adpa-integrated-embeddings';
const index = pinecone.index(indexName);

async function syncToPinecone() {
    console.log('🚀 Starting Pinecone sync...\n');

    let mongoClient;
    let stats = {
        projects: { total: 0, synced: 0, failed: 0 },
        documents: { total: 0, synced: 0, failed: 0 },
        chunks: { total: 0, synced: 0, failed: 0 }
    };

    try {
        // Connect to MongoDB
        console.log('📦 Connecting to MongoDB...');
        mongoClient = new MongoClient(process.env.MONGODB_URI);
        await mongoClient.connect();
        const db = mongoClient.db('adpa_rag');
        const chunksCollection = db.collection('chunks');

        console.log('✅ MongoDB connected\n');

        // 1. Sync chunks with embeddings from MongoDB
        console.log('📊 Syncing chunks from MongoDB...');
        const chunks = await chunksCollection.find({
            embedding: { $exists: true, $not: { $size: 0 } }
        }).limit(1000).toArray();

        stats.chunks.total = chunks.length;
        console.log(`   Found ${chunks.length} chunks with embeddings`);

        if (chunks.length > 0) {
            // Batch upload chunks to Pinecone
            const batchSize = 100;
            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const vectors = batch.map(chunk => ({
                    id: `chunk_${chunk._id}`,
                    values: chunk.embedding,
                    metadata: {
                        type: 'chunk',
                        document_id: chunk.document_id || '',
                        project_id: chunk.project_id || '',
                        content: chunk.content ? chunk.content.substring(0, 500) : '',
                        chunk_index: chunk.chunk_index || 0,
                        created_at: chunk.created_at || new Date().toISOString()
                    }
                }));

                try {
                    await index.upsert(vectors);
                    stats.chunks.synced += vectors.length;
                    console.log(`   ✅ Synced batch ${Math.floor(i / batchSize) + 1}: ${vectors.length} chunks`);
                } catch (error) {
                    stats.chunks.failed += vectors.length;
                    console.error(`   ❌ Failed to sync batch: ${error.message}`);
                }
            }
        }

        // 2. Sync projects from PostgreSQL
        console.log('\n📊 Syncing projects from PostgreSQL...');
        const projectsResult = await pgPool.query(`
      SELECT id, name, description, status, priority, 
             framework, start_date, end_date, budget,
             created_at, updated_at
      FROM projects
      LIMIT 100
    `);

        stats.projects.total = projectsResult.rows.length;
        console.log(`   Found ${projectsResult.rows.length} projects`);

        if (projectsResult.rows.length > 0) {
            // Use Pinecone's integrated embedding for projects
            // Batch size limit is 96 for upsertRecords
            const batchSize = 50;

            for (let i = 0; i < projectsResult.rows.length; i += batchSize) {
                const batch = projectsResult.rows.slice(i, i + batchSize);
                const records = batch.map(project => ({
                    _id: `project_${project.id}`,
                    text: `${project.name || ''} ${project.description || ''} ${project.framework || ''}`.trim(),
                    type: 'project',
                    name: project.name || '',
                    description: project.description || '',
                    framework: project.framework || '',
                    status: project.status || '',
                    priority: project.priority || '',
                    start_date: project.start_date || '',
                    end_date: project.end_date || '',
                    budget: project.budget || 0,
                    created_at: project.created_at || new Date().toISOString(),
                    updated_at: project.updated_at || new Date().toISOString()
                }));

                try {
                    const result = await index.upsertRecords({ records });
                    const synced = result?.upsertedCount || records.length;
                    stats.projects.synced += synced;
                    console.log(`   ✅ Synced batch ${Math.floor(i / batchSize) + 1}: ${synced} projects`);
                } catch (error) {
                    stats.projects.failed += records.length;
                    console.error(`   ❌ Failed to sync batch: ${error.message}`);
                }
            }
        }

        // 3. Sync documents from PostgreSQL
        console.log('\n📊 Syncing documents from PostgreSQL...');
        const documentsResult = await pgPool.query(`
      SELECT id, project_id, title, content, mime_type, 
             file_size, created_at, updated_at
      FROM documents
      WHERE content IS NOT NULL
      LIMIT 100
    `);

        stats.documents.total = documentsResult.rows.length;
        console.log(`   Found ${documentsResult.rows.length} documents`);

        if (documentsResult.rows.length > 0) {
            // Use Pinecone's integrated embedding for documents
            const batchSize = 50;

            for (let i = 0; i < documentsResult.rows.length; i += batchSize) {
                const batch = documentsResult.rows.slice(i, i + batchSize);
                const records = batch.map(doc => ({
                    _id: `document_${doc.id}`,
                    text: `${doc.title || ''} ${doc.content ? doc.content.substring(0, 1000) : ''}`.trim(),
                    type: 'document',
                    project_id: doc.project_id || '',
                    title: doc.title || '',
                    content_length: doc.content ? doc.content.length : 0,
                    mime_type: doc.mime_type || '',
                    file_size: doc.file_size || 0,
                    created_at: doc.created_at || new Date().toISOString(),
                    updated_at: doc.updated_at || new Date().toISOString()
                }));

                try {
                    const result = await index.upsertRecords({ records });
                    const synced = result?.upsertedCount || records.length;
                    stats.documents.synced += synced;
                    console.log(`   ✅ Synced batch ${Math.floor(i / batchSize) + 1}: ${synced} documents`);
                } catch (error) {
                    stats.documents.failed += records.length;
                    console.error(`   ❌ Failed to sync batch: ${error.message}`);
                }
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 SYNC SUMMARY');
        console.log('='.repeat(50));
        console.log(`Projects:  ${stats.projects.synced}/${stats.projects.total} synced (${stats.projects.failed} failed)`);
        console.log(`Documents: ${stats.documents.synced}/${stats.documents.total} synced (${stats.documents.failed} failed)`);
        console.log(`Chunks:    ${stats.chunks.synced}/${stats.chunks.total} synced (${stats.chunks.failed} failed)`);
        console.log('='.repeat(50));

        const totalSynced = stats.projects.synced + stats.documents.synced + stats.chunks.synced;
        console.log(`\n✅ Total vectors synced: ${totalSynced}`);

    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);
        console.error(error.stack);
    } finally {
        if (mongoClient) {
            await mongoClient.close();
            console.log('\n📦 MongoDB connection closed');
        }
        await pgPool.end();
        console.log('📦 PostgreSQL connection closed');
    }
}

// Run the sync
syncToPinecone();
