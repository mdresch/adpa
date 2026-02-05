import { pineconeService } from '../src/services/pineconeService';

async function debugVectorStructure() {
  console.log('🔍 Debugging vector structure...\n');

  const testProject = {
    id: 'test-project-001',
    name: 'Test Governance Project',
    description: 'A test project for governance framework implementation',
    framework: 'PMBOK',
    status: 'active',
    priority: 'high',
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-12-31'),
    budget: 1000000,
    owner_id: 'test-user-001',
    team_members: ['Alice', 'Bob', 'Charlie'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    // Test project vector generation
    console.log('1️⃣ Testing project vector generation...');
    const projectResult = await pineconeService.upsertProjects([testProject]);
    console.log('✅ Project upsert result:', projectResult);

    // Test document vector generation
    console.log('\n2️⃣ Testing document vector generation...');
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

    const docResult = await pineconeService.upsertDocuments([testDoc]);
    console.log('✅ Document upsert result:', docResult);

    // Test entity vector generation
    console.log('\n3️⃣ Testing entity vector generation...');
    const testEntity = {
      id: 'test-entity-001',
      name: 'Test Entity',
      type: 'Concept',
      confidence: 0.95,
      document_id: 'test-doc-001',
      project_id: 'test-project-001',
      created_at: new Date().toISOString()
    };

    const entityResult = await pineconeService.upsertEntities([testEntity]);
    console.log('✅ Entity upsert result:', entityResult);

    console.log('\n🎉 Debug completed!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

if (require.main === module) {
  debugVectorStructure();
}
