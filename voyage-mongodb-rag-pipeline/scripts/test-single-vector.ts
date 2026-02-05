import { pineconeService } from '../src/services/pineconeService';

async function testSingleVector() {
  console.log('🔍 Testing single vector structure...\n');

  const testDoc = {
    id: 'test-doc-001',
    project_id: 'test-project-001',
    title: 'Test Document',
    content: 'This is a test document content for governance framework.',
    mime_type: 'application/pdf',
    file_size: 1024000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    console.log('1️⃣ Creating vector manually...');
    
    // Manually create the vector to see its structure
    const vector = {
      id: `document_${testDoc.id}`,
      values: Array(1024).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.1), // Simple non-zero values
      metadata: {
        type: 'document',
        project_id: testDoc.project_id || '',
        title: testDoc.title,
        content: testDoc.content,
        mime_type: testDoc.mime_type,
        file_size: testDoc.file_size || 0,
        created_at: testDoc.created_at || new Date().toISOString(),
        updated_at: testDoc.updated_at || new Date().toISOString()
      }
    };

    console.log('Vector structure:');
    console.log(JSON.stringify(vector, null, 2));
    
    console.log('\n2️⃣ Testing upsert...');
    const result = await pineconeService.upsertDocuments([testDoc]);
    console.log('✅ Result:', result);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  testSingleVector();
}
