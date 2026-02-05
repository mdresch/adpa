import { mongoDBEmbeddingService } from '../services/mongoDBEmbeddings';
import { databaseService } from '../services/database';
import { config } from '../config';
import { logger } from '../utils/logger';

async function testMongoDBVectorSearch(): Promise<void> {
  try {
    console.log('🔍 Testing MongoDB Atlas Vector Search...\n');
    
    // Connect to MongoDB
    await databaseService.connect();
    console.log('✅ Connected to MongoDB Atlas');

    // Test embedding generation
    console.log('\nTesting embedding generation...');
    const testTexts = [
      "What is project management?",
      "How to handle risks in projects?",
      "Best practices for stakeholder management"
    ];

    const embeddings = await mongoDBEmbeddingService.generateEmbeddings(testTexts, 'query');
    
    console.log('✅ Embeddings generated successfully!');
    console.log(`Generated ${embeddings.length} embeddings`);
    console.log(`Embedding dimensions: ${embeddings[0]?.length || 0}`);
    console.log(`First embedding sample: [${embeddings[0]?.slice(0, 5).join(', ')}...]`);

    // Test storing in MongoDB
    console.log('\nTesting vector storage...');
    const testDocument = {
      id: 'test-doc-1',
      title: 'Project Management Test',
      content: testTexts[0],
      embedding: embeddings[0],
      metadata: {
        source: 'test',
        category: 'project-management'
      },
      createdAt: new Date()
    };

    await databaseService.createChunks([{
      documentId: 'test-doc-1',
      content: testTexts[0],
      embedding: embeddings[0],
      metadata: {
        chunkIndex: 0,
        startPosition: 0,
        endPosition: testTexts[0].length,
        tokenCount: Math.floor(testTexts[0].length / 4),
        heading: 'Test Document',
        section: 'project-management'
      }
    }]);

    console.log('✅ Document with embedding stored successfully!');

    // Test vector search
    console.log('\nTesting vector search...');
    const searchResults = await databaseService.vectorSearch(embeddings[0], 5);
    
    console.log('✅ Vector search completed!');
    console.log(`Found ${searchResults.length} results`);

    // Cleanup
    console.log('\nCleaning up test data...');
    await databaseService.deleteDocument('test-doc-1');
    console.log('✅ Cleanup completed');

    console.log('\n🎉 MongoDB Atlas Vector Search is working perfectly!');
    console.log('💡 Your setup can now:');
    console.log('   - Generate embeddings using VoyageAI models through MongoDB');
    console.log('   - Store documents with vector embeddings');
    console.log('   - Perform semantic search');
    console.log('   - Use RAG pipeline with your available models');

    await databaseService.disconnect();

  } catch (error: any) {
    console.error('❌ MongoDB Atlas Vector Search test failed:', error.message);
    logger.log('error', 'MongoDB Atlas Vector Search test failed', {
      error: error.message
    });
  }
}

// Run the test
if (require.main === module) {
  testMongoDBVectorSearch();
}

export { testMongoDBVectorSearch };
