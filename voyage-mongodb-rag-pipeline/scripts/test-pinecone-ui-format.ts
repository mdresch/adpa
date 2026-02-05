import { pineconeService } from '../src/services/pineconeService';

async function testPineconeUIFormat() {
  console.log('🔍 Testing Pinecone UI Format...\n');

  try {
    // Test using the exact format from Pinecone UI
    console.log('1️⃣ Testing record format from Pinecone UI...');
    
    const testRecord = {
      _id: 'test-ui-record-001',
      text: 'the quick brown fox jumped over the lazy dog', // Exact text from UI example
      type: 'test',
      created_at: new Date().toISOString()
    };

    console.log('Test record:', JSON.stringify(testRecord, null, 2));

    // Try to upsert this single record using the index directly
    console.log('\n2️⃣ Attempting upsert with namespace...');
    
    const namespace = pineconeService['index'].namespace('__default__');
    
    try {
      const result = await namespace.upsert([{
        id: testRecord._id,
        values: Array(1024).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.1), // Simple test vector
        metadata: {
          text: testRecord.text,
          type: testRecord.type,
          created_at: testRecord.created_at
        }
      }]);
      
      console.log('✅ Upsert successful!', result);
      
      // Try to fetch it back
      console.log('\n3️⃣ Fetching the record back...');
      const fetchResult = await pineconeService['index'].fetch([testRecord._id], '__default__');
      console.log('✅ Fetch result:', fetchResult);
      
    } catch (upsertError) {
      console.log('❌ Upsert failed:', (upsertError as Error).message);
      
      // Try without namespace
      console.log('\n4️⃣ Trying without namespace...');
      try {
        const result2 = await pineconeService['index'].upsert([{
          id: testRecord._id,
          values: Array(1024).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.1),
          metadata: {
            text: testRecord.text,
            type: testRecord.type,
            created_at: testRecord.created_at
          }
        }]);
        console.log('✅ Upsert without namespace successful!', result2);
      } catch (error2) {
        console.log('❌ Upsert without namespace also failed:', (error2 as Error).message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testPineconeUIFormat();
}
