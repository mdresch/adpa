/**
 * Simple integration test to verify the Document Templates module
 * This script can be run to test basic functionality
 */

import { documentTemplateService } from './service'
import type { AuthenticatedUser, CreateTemplateRequest } from './types'

// Mock user for testing
const mockUser: AuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  role: 'admin',
  permissions: {
    'templates.create': true,
    'templates.update': true,
    'templates.delete': true,
    'templates.view': true
  }
}

// Mock template data
const mockTemplateData: CreateTemplateRequest = {
  name: 'Test Integration Template',
  description: 'A template created for integration testing',
  framework: 'TOGAF',
  category: 'Testing',
  content: {
    sections: [
      {
        title: 'Introduction',
        content: 'This is a test template with variable: {{test_variable}}'
      },
      {
        title: 'Conclusion',
        content: 'End of test template'
      }
    ]
  },
  variables: [
    {
      name: 'test_variable',
      type: 'text',
      required: true,
      description: 'A test variable for demonstration'
    }
  ],
  is_public: false
}

async function runIntegrationTest() {
  console.log('🧪 Starting Document Templates Module Integration Test...\n')

  try {
    // Test 1: Create template
    console.log('1️⃣ Testing template creation...')
    const createdTemplate = await documentTemplateService.createTemplate(mockTemplateData, mockUser)
    console.log(`✅ Template created with ID: ${createdTemplate.id}`)

    // Test 2: Get template by ID
    console.log('\n2️⃣ Testing template retrieval...')
    const retrievedTemplate = await documentTemplateService.getTemplateById(createdTemplate.id, mockUser)
    console.log(`✅ Template retrieved: ${retrievedTemplate?.name}`)

    // Test 3: Update template
    console.log('\n3️⃣ Testing template update...')
    const updatedTemplate = await documentTemplateService.updateTemplate(
      createdTemplate.id,
      { name: 'Updated Test Template', description: 'Updated description' },
      mockUser
    )
    console.log(`✅ Template updated: ${updatedTemplate?.name}`)

    // Test 4: Clone template
    console.log('\n4️⃣ Testing template cloning...')
    const clonedTemplate = await documentTemplateService.cloneTemplate(
      createdTemplate.id,
      { name: 'Cloned Test Template', description: 'Cloned from original' },
      mockUser
    )
    console.log(`✅ Template cloned with ID: ${clonedTemplate?.id}`)

    // Test 5: Record usage
    console.log('\n5️⃣ Testing usage recording...')
    const usageCount = await documentTemplateService.recordTemplateUsage(createdTemplate.id, mockUser)
    console.log(`✅ Usage recorded, count: ${usageCount}`)

    // Test 6: List templates
    console.log('\n6️⃣ Testing template listing...')
    const templateList = await documentTemplateService.getTemplates({ page: 1, limit: 10 }, mockUser)
    console.log(`✅ Found ${templateList.templates.length} templates`)

    // Test 7: Soft delete
    console.log('\n7️⃣ Testing soft delete...')
    const deleted = await documentTemplateService.deleteTemplate(createdTemplate.id, mockUser)
    console.log(`✅ Template soft deleted: ${deleted}`)

    // Test 8: List deleted templates
    console.log('\n8️⃣ Testing deleted templates listing...')
    const deletedList = await documentTemplateService.getDeletedTemplates(1, 10, mockUser)
    console.log(`✅ Found ${deletedList.templates.length} deleted templates`)

    // Test 9: Restore template
    console.log('\n9️⃣ Testing template restoration...')
    const restoredTemplate = await documentTemplateService.restoreTemplate(createdTemplate.id, mockUser)
    console.log(`✅ Template restored: ${restoredTemplate?.name}`)

    // Test 10: Permanent delete
    console.log('\n🔟 Testing permanent delete...')
    const permanentlyDeleted = await documentTemplateService.permanentlyDeleteTemplate(createdTemplate.id, mockUser)
    console.log(`✅ Template permanently deleted: ${permanentlyDeleted}`)

    // Clean up cloned template
    if (clonedTemplate) {
      await documentTemplateService.deleteTemplate(clonedTemplate.id, mockUser)
      await documentTemplateService.permanentlyDeleteTemplate(clonedTemplate.id, mockUser)
    }

    console.log('\n🎉 All integration tests passed!')

  } catch (error) {
    console.error('\n❌ Integration test failed:', error)
    process.exit(1)
  }
}

// Export for potential use in other test files
export { runIntegrationTest, mockUser, mockTemplateData }

// Run if this file is executed directly
if (require.main === module) {
  runIntegrationTest()
}