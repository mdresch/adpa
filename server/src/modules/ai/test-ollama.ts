/**
 * Test script for Ollama connector
 * Run with: node --loader ts-node/esm test-ollama.ts
 * Or: npx tsx test-ollama.ts
 */

import { ollamaConnector, OllamaConfig, OllamaRequest } from './ollama'

const config: OllamaConfig = {
  baseURL: process.env.OLLAMA_ENDPOINT || process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434',
  defaultModel: 'llama3.2',
}

async function testOllama() {
  console.log('🧪 Testing Ollama Connector...\n')
  console.log(`Connecting to: ${config.baseURL}\n`)

  // Test 1: Check Ollama status
  console.log('📡 Test 1: Checking Ollama status...')
  const status = await ollamaConnector.checkStatus(config)
  console.log(`   Available: ${status.available}`)
  console.log(`   Models: ${status.models.join(', ') || 'None found'}`)
  console.log()

  if (!status.available) {
    console.error('❌ Ollama is not available. Make sure it\'s running with: ollama serve')
    process.exit(1)
  }

  // Test 2: Test each available model
  const testModels = status.models.filter(m => 
    ['llama3.2', 'qwen3', 'mistral', 'kimi'].some(prefix => m.includes(prefix))
  )

  if (testModels.length === 0) {
    console.log('⚠️  No recognized models found. Using default test.')
    testModels.push('llama3.2:latest')
  }

  for (const model of testModels.slice(0, 3)) { // Test first 3 models max
    console.log(`🤖 Test 2: Testing model "${model}"...`)
    
    const request: OllamaRequest = {
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is the capital of France? Answer in one word.' }
      ],
      temperature: 0.7,
      max_tokens: 50,
    }

    try {
      const startTime = Date.now()
      const response = await ollamaConnector.generateText(request, config)
      const duration = Date.now() - startTime

      console.log(`   ✅ Response: ${response.message.content.trim()}`)
      console.log(`   ⏱️  Duration: ${duration}ms`)
      console.log(`   📝 Tokens: ${response.eval_count || 'N/A'}`)
      console.log()
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`)
      console.log()
    }
  }

  // Test 3: Get model recommendation
  console.log('💡 Test 3: Model recommendations...')
  const tasks = ['code generation', 'document analysis', 'general chat', 'math reasoning']
  for (const task of tasks) {
    const recommended = ollamaConnector.getRecommendedModel(task)
    console.log(`   "${task}" -> ${recommended}`)
  }
  console.log()

  console.log('✅ All tests completed!')
}

testOllama().catch(console.error)
