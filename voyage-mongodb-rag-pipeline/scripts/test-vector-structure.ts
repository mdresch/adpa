import { pineconeService } from '../src/services/pineconeService';

async function testVectorStructure() {
  console.log('🔍 Testing vector structure differences...\n');

  try {
    // Test 1: Create a project vector (working)
    console.log('1️⃣ Testing project vector structure...');
    const testProject = {
      id: 'test-project-001',
      name: 'Test Project',
      description: 'Test project description',
      framework: 'PMBOK',
      status: 'active',
      priority: 'high',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      budget: 1000000,
      owner_id: 'test-user-001',
      team_members: ['Alice', 'Bob'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const projectResult = await pineconeService.upsertProjects([testProject]);
    console.log('✅ Project result:', projectResult);

    // Test 2: Create a document vector with SAME structure as project
    console.log('\n2️⃣ Testing document with project-like structure...');
    const testDocWithProjectStructure = {
      id: 'test-doc-001',
      name: 'Test Document', // Use same field name as project
      description: 'Test document description', // Use same field name as project
      framework: 'document', // Use same field name as project
      status: 'active', // Use same field name as project
      priority: 'medium', // Use same field name as project
      start_date: new Date('2024-01-01'), // Use same field name as project
      end_date: new Date('2024-12-31'), // Use same field name as project
      budget: 100000, // Use same field name as project
      owner_id: 'test-user-001', // Use same field name as project
      team_members: ['Alice'], // Use same field name as project
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Manually create vector with project structure
    const projectLikeVector = {
      id: `document_${testDocWithProjectStructure.id}`,
      values: Array(1024).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.1),
      metadata: {
        type: 'document',
        name: testDocWithProjectStructure.name,
        description: testDocWithProjectStructure.description,
        framework: testDocWithProjectStructure.framework,
        status: testDocWithProjectStructure.status,
        priority: testDocWithProjectStructure.priority,
        start_date: testDocWithProjectStructure.start_date,
        end_date: testDocWithProjectStructure.end_date,
        budget: testDocWithProjectStructure.budget,
        owner_id: testDocWithProjectStructure.owner_id,
        team_members: testDocWithProjectStructure.team_members,
        created_at: testDocWithProjectStructure.created_at,
        updated_at: testDocWithProjectStructure.updated_at
      }
    };

    console.log('Project-like vector structure:', JSON.stringify(projectLikeVector, null, 2));

    // Test 3: Try to upsert this project-like document vector
    console.log('\n3️⃣ Testing upsert with project-like document vector...');
    try {
      const namespace = pineconeService['index'].namespace('__default__');
      const result = await namespace.upsert([projectLikeVector]);
      console.log('✅ Project-like document upsert successful:', result);
    } catch (error) {
      console.log('❌ Project-like document upsert failed:', (error as Error).message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testVectorStructure();
}
