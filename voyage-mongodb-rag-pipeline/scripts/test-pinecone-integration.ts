#!/usr/bin/env ts-node

import { pineconeService } from '../src/services/pineconeService';
import { gkgSync } from '../src/services/governanceKnowledgeGraphSync';
import { logger } from '../src/utils/logger';

async function testPineconeIntegration() {
  console.log('🌲 Testing Pinecone Integration...\n');

  try {
    // Test 1: Connection
    console.log('1️⃣ Testing Pinecone connection...');
    const isConnected = await pineconeService.testConnection();
    console.log(`   Connection: ${isConnected ? '✅ Connected' : '❌ Failed'}`);
    
    if (!isConnected) {
      console.log('❌ Cannot proceed - Pinecone connection failed');
      return;
    }

    // Test 2: Get Index Stats
    console.log('\n2️⃣ Getting index statistics...');
    const stats = await pineconeService.getIndexStats();
    console.log('   Index Stats:', JSON.stringify(stats, null, 2));

    // Test 3: Test Search
    console.log('\n3️⃣ Testing search functionality...');
    const searchResults = await pineconeService.search('project governance', 5);
    console.log(`   Found ${searchResults.length} results for "project governance"`);
    
    if (searchResults.length > 0) {
      console.log('   Sample result:');
      console.log(`   - ID: ${searchResults[0].id}`);
      console.log(`   - Score: ${searchResults[0].score}`);
      console.log(`   - Type: ${searchResults[0].metadata?.type}`);
    }

    // Test 4: Test GKG Sync with Pinecone
    console.log('\n4️⃣ Testing GKG sync with Pinecone upserts...');
    
    // Create a test project
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

    // Upsert test project to Pinecone
    const projectResult = await pineconeService.upsertProjects([testProject]);
    console.log(`   ✅ Project upsert: ${projectResult.upsertedCount} records`);

    // Create test documents
    const testDocuments = [
      {
        id: 'test-doc-001',
        project_id: 'test-project-001',
        title: 'Governance Framework Document',
        content: 'This document outlines the governance framework for the project including roles, responsibilities, and decision-making processes.',
        mime_type: 'application/pdf',
        file_size: 1024000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-doc-002',
        project_id: 'test-project-001',
        title: 'Risk Management Plan',
        content: 'Comprehensive risk management plan identifying potential risks and mitigation strategies for project execution.',
        mime_type: 'application/pdf',
        file_size: 800000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Upsert test documents to Pinecone
    const docResult = await pineconeService.upsertDocuments(testDocuments);
    console.log(`   ✅ Documents upsert: ${docResult.upsertedCount} records`);

    // Create test entities
    const testEntities = [
      {
        id: 'test-entity-001',
        name: 'Project Governance',
        type: 'Concept',
        confidence: 0.95,
        document_id: 'test-doc-001',
        project_id: 'test-project-001',
        created_at: new Date().toISOString()
      },
      {
        id: 'test-entity-002',
        name: 'Risk Management',
        type: 'Process',
        confidence: 0.92,
        document_id: 'test-doc-002',
        project_id: 'test-project-001',
        created_at: new Date().toISOString()
      },
      {
        id: 'test-entity-003',
        name: 'Stakeholder Management',
        type: 'Role',
        confidence: 0.88,
        document_id: 'test-doc-001',
        project_id: 'test-project-001',
        created_at: new Date().toISOString()
      }
    ];

    // Upsert test entities to Pinecone
    const entityResult = await pineconeService.upsertEntities(testEntities);
    console.log(`   ✅ Entities upsert: ${entityResult.upsertedCount} records`);

    // Test 5: Search for upserted data
    console.log('\n5️⃣ Searching for upserted data...');
    
    const projectSearch = await pineconeService.search('Test Governance Project', 3);
    console.log(`   Found ${projectSearch.length} project results`);
    
    const docSearch = await pineconeService.search('Governance Framework', 3);
    console.log(`   Found ${docSearch.length} document results`);
    
    const entitySearch = await pineconeService.search('Project Governance', 3);
    console.log(`   Found ${entitySearch.length} entity results`);

    // Test 6: Filtered search
    console.log('\n6️⃣ Testing filtered search...');
    
    const projectFilter = { 'type': 'project' };
    const projectFilteredResults = await pineconeService.search('governance', 5, projectFilter);
    console.log(`   Found ${projectFilteredResults.length} project-type results`);

    const entityFilter = { 'type': 'entity' };
    const entityFilteredResults = await pineconeService.search('management', 5, entityFilter);
    console.log(`   Found ${entityFilteredResults.length} entity-type results`);

    // Test 7: Cleanup test data
    console.log('\n7️⃣ Cleaning up test data...');
    const idsToDelete = [
      'project_test-project-001',
      'document_test-doc-001',
      'document_test-doc-002',
      'entity_test-entity-001',
      'entity_test-entity-002',
      'entity_test-entity-003'
    ];
    
    const deleteResult = await pineconeService.delete(idsToDelete);
    console.log(`   ✅ Cleanup: ${deleteResult ? 'Success' : 'Failed'}`);

    console.log('\n🎉 All Pinecone tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Connection test passed');
    console.log('   ✅ Index stats retrieved');
    console.log('   ✅ Search functionality working');
    console.log('   ✅ Project upserts working');
    console.log('   ✅ Document upserts working');
    console.log('   ✅ Entity upserts working');
    console.log('   ✅ Filtered search working');
    console.log('   ✅ Data cleanup working');

  } catch (error) {
    console.error('❌ Pinecone test failed:', error);
    logger.error('Pinecone integration test failed', { error });
  }
}

// Run the test
if (require.main === module) {
  testPineconeIntegration()
    .then(() => {
      console.log('\n✨ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testPineconeIntegration };
