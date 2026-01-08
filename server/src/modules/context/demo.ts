/**
 * Context Injection System Demo
 * 
 * Demonstrates the usage of the context injection system.
 */

import { ContextInjector, ContextAwareAIService, TokenManager } from './index'
import { ContextRequest, ContextPriority } from './types'

async function demonstrateContextInjection() {
  console.log('=== Context Injection System Demo ===\n')

  // Example 1: Basic context injection
  console.log('1. Basic Context Injection:')
  const basicRequest: ContextRequest = {
    prompt: 'Generate a project status report',
    user_id: 'demo-user-123',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    project_id: 'demo-project-456'
  }

  try {
    // Get context statistics first
    const stats = await ContextInjector.getContextStats(basicRequest)
    console.log('Available tokens:', stats.available_tokens)
    console.log('Context sources:', stats.context_sources)
    console.log('Estimated context tokens:', stats.estimated_context_tokens)
    console.log()

    // Note: This would fail in demo because database is not connected
    // const response = await ContextInjector.injectContext(basicRequest)
    // console.log('Enhanced prompt preview:', response.enhanced_prompt.substring(0, 200) + '...')
    
  } catch (error) {
    console.log('Expected error (no database connection):', error.message)
  }

  // Example 2: Token management demonstration
  console.log('\n2. Token Management:')
  const sampleText = 'This is a sample text for token estimation and management testing purposes.'
  const estimatedTokens = TokenManager.estimateTokens(sampleText)
  console.log('Sample text:', sampleText)
  console.log('Estimated tokens:', estimatedTokens)

  const tokenLimit = TokenManager.getTokenLimit('openai', 'gpt-3.5-turbo')
  console.log('OpenAI GPT-3.5-turbo token limit:', tokenLimit)

  const availableTokens = TokenManager.calculateAvailableTokens(
    'Generate a report',
    'openai',
    'gpt-3.5-turbo'
  )
  console.log('Available tokens for context:', availableTokens)

  // Example 3: Context-aware AI service (would require database)
  console.log('\n3. Context-Aware AI Service:')
  const enhancedRequest = {
    prompt: 'Review this document and suggest improvements',
    user_id: 'demo-user-123',
    provider: 'openai',
    model: 'gpt-4',
    project_id: 'demo-project-456',
    document_ids: ['demo-doc-789'],
    custom_context: {
      review_criteria: ['clarity', 'completeness', 'accuracy'],
      target_audience: 'business stakeholders'
    },
    context_priority: {
      project: ContextPriority.HIGH,
      documents: ContextPriority.CRITICAL,
      templates: ContextPriority.MEDIUM,
      user: ContextPriority.LOW,
      integrations: ContextPriority.LOW,
      custom: ContextPriority.HIGH
    }
  }

  try {
    const preview = await ContextAwareAIService.getContextPreview(enhancedRequest)
    console.log('Context preview would be generated here')
  } catch (error) {
    console.log('Expected error (no database connection):', error.message)
  }

  console.log('\n=== Demo Complete ===')
  console.log('The context injection system is ready for use!')
  console.log('Connect to a database and configure AI providers to use full functionality.')
}

// Export for testing
export { demonstrateContextInjection }

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateContextInjection().catch(console.error)
}