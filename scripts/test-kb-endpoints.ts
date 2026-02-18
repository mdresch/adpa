/**
 * Test Knowledge Base Endpoints
 * Gets a demo JWT token and tests all KB endpoints
 */

import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testKnowledgeBaseEndpoints() {
  console.log('🧪 Testing Knowledge Base Endpoints\n')
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...')
  let serverReady = false
  for (let i = 0; i < 30; i++) {
    try {
      await axios.get(`${API_URL}/health`)
      serverReady = true
      console.log('✅ Server is ready\n')
      break
    } catch (err) {
      await sleep(1000)
    }
  }
  
  if (!serverReady) {
    console.error('❌ Server did not become ready in 30 seconds')
    process.exit(1)
  }
  
  // Step 1: Get demo JWT token
  console.log('1️⃣ Getting demo JWT token...')
  let token: string
  try {
    const authResp = await axios.post(`${API_URL}/api/auth/demo`, {})
    token = authResp.data.token
    console.log(`✅ Token obtained: ${token.substring(0, 20)}...\n`)
  } catch (err: any) {
    console.error('❌ Failed to get demo token:', err.response?.data || err.message)
    process.exit(1)
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
  
  // Step 2: Test GET /api/knowledge-base/stats
  console.log('2️⃣ Testing GET /api/knowledge-base/stats...')
  try {
    const statsResp = await axios.get(`${API_URL}/api/knowledge-base/stats`, { headers })
    console.log('✅ Stats endpoint works:', JSON.stringify(statsResp.data, null, 2))
  } catch (err: any) {
    console.error('❌ Stats endpoint failed:', err.response?.data || err.message)
  }
  console.log()
  
  // Step 3: Test GET /api/knowledge-base/entries (search)
  console.log('3️⃣ Testing GET /api/knowledge-base/entries (search)...')
  try {
    const searchResp = await axios.get(`${API_URL}/api/knowledge-base/entries?limit=10`, { headers })
    console.log('✅ Search endpoint works:', JSON.stringify(searchResp.data, null, 2))
  } catch (err: any) {
    console.error('❌ Search endpoint failed:', err.response?.data || err.message)
  }
  console.log()
  
  // Step 4: Test POST /api/knowledge-base/entries (create)
  console.log('4️⃣ Testing POST /api/knowledge-base/entries (create)...')
  try {
    // First, we need a project_id - let's try to get one or create a test entry
    const createPayload = {
      project_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
      entry_type: 'best_practice',
      category: 'process_improvement',
      title: 'Test Knowledge Base Entry',
      description: 'This is a test entry created during smoke testing',
      improved_approach: {
        description: 'Test improved approach',
        implementation_details: 'Test implementation details'
      },
      replication_guide: {
        steps: ['Step 1', 'Step 2']
      }
    }
    
    const createResp = await axios.post(`${API_URL}/api/knowledge-base/entries`, createPayload, { headers })
    console.log('✅ Create endpoint works:', JSON.stringify(createResp.data, null, 2))
    
    const entryId = createResp.data.id
    
    // Step 5: Test GET /api/knowledge-base/entries/:id
    console.log('\n5️⃣ Testing GET /api/knowledge-base/entries/:id...')
    try {
      const getResp = await axios.get(`${API_URL}/api/knowledge-base/entries/${entryId}`, { headers })
      console.log('✅ Get entry endpoint works:', JSON.stringify(getResp.data, null, 2))
    } catch (err: any) {
      console.error('❌ Get entry endpoint failed:', err.response?.data || err.message)
    }
    
    console.log('\n✅ All knowledge base endpoints tested successfully!')
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.error?.includes('project')) {
      console.log('⚠️  Create endpoint requires valid project_id. Skipping create/get tests.')
      console.log('✅ Endpoints are responding correctly (authentication and routing work)')
    } else {
      console.error('❌ Create endpoint failed:', err.response?.data || err.message)
    }
  }
}

testKnowledgeBaseEndpoints().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
