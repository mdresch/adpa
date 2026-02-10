// Test RAG ingestion and search functionality
import { ragService } from './src/services/ragService';
import { pool } from './src/database/connection';

async function testRag() {
    try {
        console.log('🧪 Testing RAG Functionality\n');

        // Step 1: Get a document ID to test with
        const docResult = await pool.query('SELECT id, name FROM documents LIMIT 1');
        if (docResult.rows.length === 0) {
            console.error('❌ No documents found in database. Please create a document first.');
            process.exit(1);
        }

        const testDoc = docResult.rows[0];
        console.log(`📄 Using test document: ${testDoc.name} (${testDoc.id})\n`);

        // Step 2: Ingest the document
        console.log('1️⃣ Testing document ingestion...');
        const ingestResult = await ragService.ingestDocument(testDoc.id);
        console.log('✅ Ingestion result:', ingestResult);
        console.log(`   - Created ${ingestResult.chunks} chunks\n`);

        // Step 3: Query for similar content
        console.log('2️⃣ Testing vector search...');
        const queryText = 'project management';
        console.log(`   Query: "${queryText}"`);

        const searchResults = await ragService.query(queryText, 3);
        console.log(`✅ Found ${searchResults.length} results:`);
        searchResults.forEach((result, i) => {
            console.log(`\n   Result ${i + 1}:`);
            console.log(`   - Similarity: ${(result.similarity * 100).toFixed(2)}%`);
            console.log(`   - Content preview: ${result.content.substring(0, 100)}...`);
        });

        console.log('\n\n🎉 RAG functionality test complete!');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

testRag();
