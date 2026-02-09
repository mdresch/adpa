
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function checkChunks() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query('SELECT count(*) FROM document_chunks');
        console.log(`Document chunks count: ${res.rows[0].count}`);

        const docRes = await client.query('SELECT id, name, sync_status FROM documents ORDER BY created_at DESC LIMIT 1');
        console.log('Most Recent Document:', docRes.rows[0]);

        if (docRes.rows.length > 0) {
            const docId = docRes.rows[0].id;

            // Get a chunk to grab its embedding
            const chunkRes = await client.query('SELECT embedding, content FROM document_chunks WHERE document_id = $1 LIMIT 1', [docId]);

            if (chunkRes.rows.length > 0) {
                console.log('✅ Found chunk for document');
                const embedding = chunkRes.rows[0].embedding;
                console.log(`Embedding preview: ${embedding.substring(0, 20)}...`);

                // Test RPC
                console.log('Testing match_document_chunks RPC...');
                const rpcRes = await client.query(`
                    SELECT id, content, similarity 
                    FROM match_document_chunks($1::vector, 0.5, 5, '{}'::jsonb)
                `, [embedding]);

                console.log(`RPC returned ${rpcRes.rows.length} results`);
                if (rpcRes.rows.length > 0) {
                    console.log('Top match content:', rpcRes.rows[0].content.substring(0, 50));
                    console.log('Top match similarity:', rpcRes.rows[0].similarity);
                }
            } else {
                console.log('❌ No chunks found for this document');
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkChunks();
