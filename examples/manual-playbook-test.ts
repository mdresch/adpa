/**
 * Manual Playbook Generation Test
 * Simple script to test the playbook generation system manually
 */

// Test configuration
const API_BASE = 'http://localhost:5000/api'
const TEST_PROJECT_ID = '840ee5df-aa50-4412-b513-5472fbe3ea9e' // ADPA Playbook project

// Mock auth token (replace with real token in production)
const AUTH_TOKEN = 'test-auth-token'

interface TestResult {
  test: string
  success: boolean
  data?: any
  error?: string
  time: number
}

async function makeRequest(endpoint: string, method: string = 'GET', data?: any): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    const responseData = await response.json()
    const time = Date.now() - startTime

    return {
      test: endpoint,
      success: response.ok,
      data: responseData,
      time
    }
  } catch (error) {
    const time = Date.now() - startTime
    return {
      test: endpoint,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      time
    }
  }
}

async function runTests() {
  console.log('🧪 Starting Manual Playbook Generation Tests\n')

  const results: TestResult[] = []

  // Test 1: Get available templates
  console.log('1️⃣ Testing template retrieval...')
  const templatesResult = await makeRequest('/playbook-generation/templates')
  results.push(templatesResult)
  
  if (templatesResult.success) {
    console.log(`   ✅ Retrieved ${templatesResult.data.templates.length} templates`)
    console.log(`   ⏱️  Time: ${templatesResult.time}ms`)
  } else {
    console.log(`   ❌ Failed: ${templatesResult.error}`)
  }

  // Test 2: Get template preview
  console.log('\n2️⃣ Testing template preview...')
  const previewResult = await makeRequest('/playbook-generation/preview/programExecutive')
  results.push(previewResult)
  
  if (previewResult.success) {
    console.log(`   ✅ Preview retrieved for ${previewResult.data.templateKey}`)
    console.log(`   📄 Sections: ${previewResult.data.preview.sections}`)
    console.log(`   ⏱️  Time: ${previewResult.time}ms`)
  } else {
    console.log(`   ❌ Failed: ${previewResult.error}`)
  }

  // Test 3: Generate standard playbook
  console.log('\n3️⃣ Testing standard playbook generation...')
  const standardResult = await makeRequest('/playbook-generation/generate/standard', 'POST', {
    templateKey: 'programExecutive',
    projectId: TEST_PROJECT_ID,
    outputFormat: 'pdf'
  })
  results.push(standardResult)
  
  if (standardResult.success) {
    console.log(`   ✅ Playbook generated successfully`)
    console.log(`   📄 Document ID: ${standardResult.data.documentId}`)
    console.log(`   📊 Metadata: ${JSON.stringify(standardResult.data.metadata, null, 2)}`)
    console.log(`   ⏱️  Time: ${standardResult.time}ms`)
  } else {
    console.log(`   ❌ Failed: ${standardResult.error}`)
  }

  // Test 4: Generate custom playbook
  console.log('\n4️⃣ Testing custom playbook generation...')
  const customResult = await makeRequest('/playbook-generation/generate', 'POST', {
    projectId: TEST_PROJECT_ID,
    playbookType: 'framework',
    targetAudience: 'technical',
    complexity: 'comprehensive',
    outputFormat: 'pdf',
    customVariables: {
      targetObjective: 'Test objective for manual testing',
      expectedBenefits: 'Test benefits for manual testing'
    },
    includeGkgContext: true
  })
  results.push(customResult)
  
  if (customResult.success) {
    console.log(`   ✅ Custom playbook generated successfully`)
    console.log(`   📄 Document ID: ${customResult.data.documentId}`)
    console.log(`   📊 Metadata: ${JSON.stringify(customResult.data.metadata, null, 2)}`)
    console.log(`   ⏱️  Time: ${customResult.time}ms`)
  } else {
    console.log(`   ❌ Failed: ${customResult.error}`)
  }

  // Test 5: Check generation status
  if (standardResult.success && standardResult.data.generationId) {
    console.log('\n5️⃣ Testing generation status...')
    const statusResult = await makeRequest(`/playbook-generation/status/${standardResult.data.generationId}`)
    results.push(statusResult)
    
    if (statusResult.success) {
      console.log(`   ✅ Status retrieved: ${statusResult.data.status}`)
      console.log(`   📊 Progress: ${statusResult.data.progress}%`)
      console.log(`   ⏱️  Time: ${statusResult.time}ms`)
    } else {
      console.log(`   ❌ Failed: ${statusResult.error}`)
    }
  }

  // Test 6: Test validation errors
  console.log('\n6️⃣ Testing validation...')
  
  // Missing required fields
  const validationResult1 = await makeRequest('/playbook-generation/generate/standard', 'POST', {
    templateKey: 'programExecutive'
    // Missing projectId
  })
  results.push(validationResult1)
  
  if (!validationResult1.success) {
    console.log(`   ✅ Validation caught missing projectId: ${validationResult1.error}`)
  } else {
    console.log(`   ❌ Validation should have failed`)
  }

  // Invalid template key
  const validationResult2 = await makeRequest('/playbook-generation/generate/standard', 'POST', {
    templateKey: 'invalidTemplate',
    projectId: TEST_PROJECT_ID
  })
  results.push(validationResult2)
  
  if (!validationResult2.success) {
    console.log(`   ✅ Validation caught invalid template: ${validationResult2.error}`)
  } else {
    console.log(`   ❌ Validation should have failed`)
  }

  // Summary
  console.log('\n📊 Test Results Summary:')
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalTime = results.reduce((sum, r) => sum + r.time, 0)
  const avgTime = totalTime / results.length

  console.log(`   ✅ Passed: ${passed}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`)
  console.log(`   ⏱️  Total Time: ${totalTime}ms`)
  console.log(`   📊 Average Time: ${avgTime.toFixed(1)}ms`)

  if (failed === 0) {
    console.log('\n🎉 All tests passed! The playbook generation system is working correctly.')
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.')
  }

  return results
}

// Test helper functions
async function testTemplateConsistency() {
  console.log('\n🔍 Testing Template Consistency...')
  
  const templatesResult = await makeRequest('/playbook-generation/templates')
  
  if (!templatesResult.success) {
    console.log('   ❌ Could not retrieve templates for consistency check')
    return
  }

  const templates = templatesResult.data.templates
  const requiredFields = ['key', 'name', 'description', 'config']
  const configFields = ['playbookType', 'targetAudience', 'complexity', 'includeGkgContext']
  const validPlaybookTypes = ['program', 'framework', 'operational']
  const validAudiences = ['executive', 'technical', 'operational']
  const validComplexities = ['basic', 'standard', 'comprehensive']

  let consistencyIssues = 0

  templates.forEach((template: any, index) => {
    console.log(`   Checking template ${index + 1}: ${template.name}`)
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!template[field]) {
        console.log(`     ❌ Missing required field: ${field}`)
        consistencyIssues++
      }
    })

    // Check config fields
    configFields.forEach(field => {
      if (!template.config[field]) {
        console.log(`     ❌ Missing config field: ${field}`)
        consistencyIssues++
      }
    })

    // Check valid values
    if (template.config) {
      if (!validPlaybookTypes.includes(template.config.playbookType)) {
        console.log(`     ❌ Invalid playbookType: ${template.config.playbookType}`)
        consistencyIssues++
      }
      
      if (!validAudiences.includes(template.config.targetAudience)) {
        console.log(`     ❌ Invalid targetAudience: ${template.config.targetAudience}`)
        consistencyIssues++
      }
      
      if (!validComplexities.includes(template.config.complexity)) {
        console.log(`     ❌ Invalid complexity: ${template.config.complexity}`)
        consistencyIssues++
      }
      
      if (typeof template.config.includeGkgContext !== 'boolean') {
        console.log(`     ❌ includeGkgContext should be boolean`)
        consistencyIssues++
      }
    }
  })

  if (consistencyIssues === 0) {
    console.log('   ✅ All templates are consistent!')
  } else {
    console.log(`   ❌ Found ${consistencyIssues} consistency issues`)
  }
}

// Performance test
async function testPerformance() {
  console.log('\n⚡ Testing Performance...')
  
  const concurrentRequests = 5
  const promises = Array(concurrentRequests).fill(null).map(() => 
    makeRequest('/playbook-generation/templates')
  )

  const startTime = Date.now()
  const results = await Promise.all(promises)
  const totalTime = Date.now() - startTime

  const successful = results.filter(r => r.success).length
  const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length

  console.log(`   📊 Concurrent Requests: ${concurrentRequests}`)
  console.log(`   ✅ Successful: ${successful}`)
  console.log(`   ⏱️  Total Time: ${totalTime}ms`)
  console.log(`   📈 Average Time: ${avgTime.toFixed(1)}ms`)
  console.log(`   🚀 Requests/sec: ${(concurrentRequests / (totalTime / 1000)).toFixed(2)}`)
}

// Main execution
async function main() {
  console.log('🚀 ADPA Playbook Generation Manual Test Suite')
  console.log('==========================================\n')

  try {
    await runTests()
    await testTemplateConsistency()
    await testPerformance()
    
    console.log('\n✨ Test suite completed!')
    
  } catch (error) {
    console.error('❌ Test suite failed:', error)
  }
}

// Export for use in other modules
export {
  runTests,
  testTemplateConsistency,
  testPerformance
}

// Run if executed directly
if (require.main === module) {
  main()
}
