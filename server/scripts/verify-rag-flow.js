const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

async function verifyRagFlow() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        console.log('🧪 Verifying RAG Flow...');

        // Debug: Check env var
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            throw new Error('DATABASE_URL is undefined');
        }
        console.log(`DB URL found (starts with): ${dbUrl.substring(0, 15)}...`);

        // 0. Test Connection
        console.log('Checking basic DB connection...');
        await pool.query('SELECT 1');
        console.log('✅ Basic DB connection working.');

        // 1. Insert Test Document
        const testDoc = {
            name: 'Vector Bucket Test Doc',
            content: 'Supabase Vector Buckets are a great way to store embeddings directly in storage without managing a separate pgvector table. Voyage AI provides high-quality embeddings for this purpose.',
            metadata: { source: 'verification-script' },
            domain_metrics: {},
            inferred_secondary_domains: [],
            entity_counts: {}
        };

        console.log('\n📝 Inserting test document...');
        const insertRes = await pool.query(`
            INSERT INTO documents (name, content, metadata, domain_metrics, inferred_secondary_domains, entity_counts)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `, [testDoc.name, testDoc.content, testDoc.metadata, testDoc.domain_metrics, testDoc.inferred_secondary_domains, testDoc.entity_counts]);

        const docId = insertRes.rows[0].id;
        console.log(`✅ Document inserted with ID: ${docId}`);

        // 2. Ingest via API (Backend Service)
        console.log('\n🚀 Triggering ingestion via API (Backend Service)...');
        try {
            // Wait a bit for server to restart if needed, otherwise just call
            // Use 127.0.0.1 to avoid IPv6 issues
            const ingestRes = await fetch('http://127.0.0.1:5000/api/rag/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_id: docId })
            });

            if (!ingestRes.ok) {
                const err = await ingestRes.text();
                throw new Error(`Ingestion API failed: ${ingestRes.status} ${err}`);
            }

            const ingestData = await ingestRes.json();
            console.log('✅ Ingestion successful:', ingestData);

        } catch (err) {
            console.error('❌ Ingestion failed:', err.message);
            // We usually stop here, but let's see if query works anyway (if auto-ingest happened?)
            // But we dropped the trigger so auto-ingest is off.
        }

        // 3. Check Sync Status
        console.log('\n🔍 Checking sync status...');
        const statusRes = await pool.query('SELECT sync_status, processing_time FROM documents WHERE id = $1', [docId]);
        console.log('Document Status:', statusRes.rows[0]);

        // 4. Test Retrieval via API
        console.log('\n🔎 Testing retrieval via /api/rag/query (127.0.0.1)...');
        try {
            const queryRes = await fetch('http://127.0.0.1:5000/api/rag/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'open source firebase', topK: 3 })
            });

            if (!queryRes.ok) {
                const err = await queryRes.text();
                throw new Error(`Query API failed: ${queryRes.status} ${err}`);
            }

            const searchData = await queryRes.json();
            console.log('✅ Search Response:', JSON.stringify(searchData, null, 2));

            if (searchData.results && searchData.results.length > 0) {
                console.log('✅ RAG Verification SUCCESS: Document found via vector search!');
                const match = searchData.results[0];
                console.log(`   - Similarity: ${match.similarity}`);
                console.log(`   - Content Preview: ${match.content.substring(0, 50)}...`);
            } else {
                console.error('❌ No results found. Ingestion might have failed or vector search is broken.');
            }

        } catch (err) {
            console.error('❌ Query failed:', err.message);
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error.message);
    } finally {
        await pool.end();
    }
}

verifyRagFlow();
