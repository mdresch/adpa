import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';

// Load environment variables
config();

async function createIntegratedEmbeddingIndex() {
  console.log('🚀 Creating Pinecone index with integrated embedding...\n');

  try {
    // Initialize Pinecone client using environment variables
    const apiKey = process.env.PINECONE_API_KEY;
    
    if (!apiKey) {
      console.log('❌ Pinecone API key not configured');
      console.log('💡 Make sure PINECONE_API_KEY is set in your .env file');
      throw new Error('Pinecone API key is required');
    }

    console.log('✅ API key found, creating Pinecone client...');
    const pc = new Pinecone({ apiKey });

    const indexName = 'adpa-integrated-embeddings'; // New index name for integrated embedding

    console.log('1️⃣ Creating index with integrated embedding...');
    
    try {
      await pc.createIndexForModel({
        name: indexName,
        cloud: 'aws',
        region: 'us-east-1',
        embed: {
          model: 'llama-text-embed-v2',
          fieldMap: { text: 'text' }, // Match your field_map from UI
        },
        waitUntilReady: true,
      });

      console.log('✅ Index created successfully!');
      console.log(`📋 Index name: ${indexName}`);
      console.log('🔧 Embedding model: llama-text-embed-v2');
      console.log('📝 Field mapping: text -> text');

    } catch (createError) {
      console.log('❌ Index creation failed:', (createError as Error).message);
      
      // Check if index already exists
      console.log('\n2️⃣ Checking if index already exists...');
      try {
        const existingIndexes = await pc.listIndexes();
        const indexExists = existingIndexes.indexes?.some((idx: any) => idx.name === indexName);
        
        if (indexExists) {
          console.log('✅ Index already exists!');
          console.log(`📋 Using existing index: ${indexName}`);
        } else {
          console.log('ℹ️ Index does not exist and creation failed');
        }
      } catch (listError) {
        console.log('❌ Failed to list indexes:', (listError as Error).message);
      }
    }

    console.log('\n3️⃣ Testing the new index...');
    try {
      const index = pc.index(indexName);
      
      // Test with the exact format from Pinecone documentation
      const testRecord = {
        _id: 'test-integrated-001',
        text: 'the quick brown fox jumped over the lazy dog',
        type: 'test',
        created_at: new Date().toISOString()
      };

      console.log('📝 Test record:', JSON.stringify(testRecord, null, 2));

      // Try upsertRecords with the new index
      console.log('\n4️⃣ Testing upsertRecords on integrated embedding index...');
      
      // This should work with integrated embedding - use correct format
      let result;
      try {
        // Try with namespace and records object
        result = await index.upsertRecords({
          namespace: '__default__',
          records: [testRecord]
        });
      } catch (e1) {
        console.log('❌ Method 1 failed:', (e1 as Error).message);
        try {
          // Try with just records object
          result = await index.upsertRecords({
            records: [testRecord]
          });
        } catch (e2) {
          console.log('❌ Method 2 failed:', (e2 as Error).message);
          throw e2;
        }
      }
      console.log('✅ upsertRecords successful!', result);

      // Try to fetch it back
      console.log('\n5️⃣ Fetching record back...');
      const fetchResult = await index.fetch({ ids: [testRecord._id] });
      console.log('✅ Fetch successful:', fetchResult);

    } catch (testError) {
      console.log('❌ Test failed:', (testError as Error).message);
    }

    console.log('\n🎉 Integration test complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your .env file: PINECONE_INDEX_NAME=adpa-integrated-embeddings');
    console.log('2. Restart your application');
    console.log('3. Test document and entity upserts');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

if (require.main === module) {
  createIntegratedEmbeddingIndex();
}
