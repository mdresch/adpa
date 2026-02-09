import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TEST_DOC_ID = '3d8bdbe8-8730-4c64-9fe0-1e26f3ec3296';

async function testRagWorkflow() {
    console.log('🧪 Testing RAG Workflow\n');

    // Test 1: Ingest document
    console.log('1️⃣  Testing document ingestion...');
    try {
        const ingestResponse = await fetch(`${BASE_URL}/api/rag/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document_id: TEST_DOC_ID })
        });

        if (!ingestResponse.ok) {
            const error = await ingestResponse.text();
            throw new Error(`Ingestion failed: ${error}`);
        }

        const ingestData = await ingestResponse.json();
        console.log('✅ Ingestion successful!');
        console.log(`   Chunks created: ${ingestData.chunks || 'N/A'}`);
        console.log('');
    } catch (error) {
        console.error('❌ Ingestion failed:', error.message);
        process.exit(1);
    }

    // Test 2: Query RAG
    console.log('2️⃣  Testing vector search...');
    try {
        const queryResponse = await fetch(`${BASE_URL}/api/rag/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'project management',
                topK: 3
            })
        });

        if (!queryResponse.ok) {
            const error = await queryResponse.text();
            throw new Error(`Query failed: ${error}`);
        }

        const queryData = await queryResponse.json();
        console.log('✅ Search successful!');
        console.log(`   Results found: ${queryData.results?.length || 0}`);
        console.log('');

        if (queryData.results && queryData.results.length > 0) {
            console.log('📊 Top results:');
            queryData.results.forEach((result, i) => {
                console.log(`\n   Result ${i + 1}:`);
                console.log(`   - Similarity: ${(result.similarity * 100).toFixed(2)}%`);
                const preview = result.content.substring(0, 100);
                console.log(`   - Preview: ${preview}...`);
            });
            console.log('');
        }
    } catch (error) {
        console.error('❌ Query failed:', error.message);
        process.exit(1);
    }

    console.log('🎉 All RAG tests passed!\n');
}

testRagWorkflow().catch(console.error);
