import { pineconeService } from '../src/services/pineconeService';

async function inspectPineconeNamespace() {
  console.log('🔍 Inspecting Pinecone __default__ namespace...\n');

  try {
    // Get index stats
    console.log('1️⃣ Getting index statistics...');
    const stats = await pineconeService['index'].describeIndexStats();
    console.log('✅ Index stats:', JSON.stringify(stats, null, 2));

    // List all records in __default__ namespace
    console.log('\n2️⃣ Listing records in __default__ namespace...');
    const namespace = pineconeService['index'].namespace('__default__');
    
    try {
      // Try to list all IDs
      const listResult = await namespace.list();
      console.log('✅ List result:', JSON.stringify(listResult, null, 2));
      
      if (listResult.vectors && listResult.vectors.length > 0) {
        console.log('\n3️⃣ Fetching record details...');
        const recordIds = listResult.vectors.map((v: any) => v.id || v);
        console.log('Record IDs:', recordIds);
        
        const fetchResult = await pineconeService['index'].fetch(recordIds, '__default__');
        console.log('✅ Fetch result:', JSON.stringify(fetchResult, null, 2));
        
        // Analyze the record structure
        if (fetchResult.vectors) {
          for (const [id, vector] of Object.entries(fetchResult.vectors)) {
            const vectorData = vector as any;
            console.log(`\n📋 Record ${id}:`);
            console.log('- ID:', id);
            console.log('- Vector length:', vectorData.values?.length || 'N/A');
            console.log('- Metadata:', JSON.stringify(vectorData.metadata, null, 2));
          }
        }
      } else {
        console.log('ℹ️ No vectors found in list result');
      }
      
    } catch (namespaceError) {
      console.log('❌ Namespace operations failed:', (namespaceError as Error).message);
      
      // Try to list without namespace
      console.log('\n4️⃣ Trying to list without namespace...');
      try {
        const listResult2 = await pineconeService['index'].list();
        console.log('✅ List without namespace:', JSON.stringify(listResult2, null, 2));
      } catch (listError) {
        console.log('❌ List without namespace failed:', (listError as Error).message);
      }
    }

  } catch (error) {
    console.error('❌ Inspection failed:', error);
  }
}

if (require.main === module) {
  inspectPineconeNamespace();
}
