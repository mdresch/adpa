/**
 * Context Injection System Examples
 * 
 * Examples demonstrating how to use the context injection system
 * with different AI providers and scenarios.
 */

import { ContextInjector } from './injector'
import { ContextRequest, ContextPriority } from './types'

/**
 * Example 1: Basic project context injection
 */
export async function basicProjectContextExample() {
  const request: ContextRequest = {
    prompt: 'Generate a project status report',
    user_id: 'user-123',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    project_id: 'project-456'
  }

  try {
    const response = await ContextInjector.injectContext(request)
    
    console.log('Enhanced Prompt:', response.enhanced_prompt)
    console.log('Context Summary:', response.context_summary)
    console.log('Token Usage:', response.token_usage)
    
    return response
  } catch (error) {
    console.error('Context injection failed:', error)
    throw error
  }
}

/**
 * Example 2: Document-specific context injection
 */
export async function documentContextExample() {
  const request: ContextRequest = {
    prompt: 'Review and improve this document',
    user_id: 'user-123',
    provider: 'openai',
    model: 'gpt-4',
    project_id: 'project-456',
    document_ids: ['doc-789', 'doc-101'],
    priority_config: {
      project: ContextPriority.MEDIUM,
      documents: ContextPriority.HIGH,
      templates: ContextPriority.LOW,
      user: ContextPriority.LOW,
      integrations: ContextPriority.LOW,
      custom: ContextPriority.MEDIUM
    }
  }

  try {
    const response = await ContextInjector.injectContext(request)
    return response
  } catch (error) {
    console.error('Document context injection failed:', error)
    throw error
  }
}

/**
 * Example 3: Template-based generation with context
 */
export async function templateContextExample() {
  const request: ContextRequest = {
    prompt: 'Create a new business requirements document',
    user_id: 'user-123',
    provider: 'google',
    model: 'gemini-pro',
    project_id: 'project-456',
    template_id: 'template-brd-001',
    custom_context: {
      stakeholders: ['Product Manager', 'Tech Lead', 'Business Analyst'],
      deadline: '2024-03-15',
      budget_constraints: 'Limited to $50,000'
    }
  }

  try {
    const response = await ContextInjector.injectContext(request)
    return response
  } catch (error) {
    console.error('Template context injection failed:', error)
    throw error
  }
}

/**
 * Example 4: Integration-aware context injection
 */
export async function integrationContextExample() {
  const request: ContextRequest = {
    prompt: 'Analyze recent changes from connected systems',
    user_id: 'user-123',
    provider: 'openai',
    model: 'gpt-4-turbo',
    project_id: 'project-456',
    include_integrations: true,
    max_context_tokens: 50000 // Use more context for complex analysis
  }

  try {
    const response = await ContextInjector.injectContext(request)
    return response
  } catch (error) {
    console.error('Integration context injection failed:', error)
    throw error
  }
}

/**
 * Example 5: Token-optimized context injection
 */
export async function tokenOptimizedExample() {
  const request: ContextRequest = {
    prompt: 'Provide a quick summary of project status',
    user_id: 'user-123',
    provider: 'openai',
    model: 'gpt-3.5-turbo', // Smaller model with limited tokens
    project_id: 'project-456',
    max_context_tokens: 1000 // Strict token limit
  }

  try {
    // Get context statistics first
    const stats = await ContextInjector.getContextStats(request)
    console.log('Available tokens:', stats.available_tokens)
    console.log('Estimated context tokens:', stats.estimated_context_tokens)
    
    const response = await ContextInjector.injectContext(request, {
      max_context_ratio: 0.5, // Use only 50% of tokens for context
      enable_smart_truncation: true,
      preserve_user_prompt: true,
      context_separator: '\n---\n',
      include_metadata: false,
      default_priority: ContextPriority.MEDIUM
    })
    
    return response
  } catch (error) {
    console.error('Token-optimized context injection failed:', error)
    throw error
  }
}

/**
 * Example 6: Multi-framework project context
 */
export async function multiFrameworkExample() {
  const request: ContextRequest = {
    prompt: 'Compare BABOK and PMBOK approaches for this project',
    user_id: 'user-123',
    provider: 'openai',
    model: 'gpt-4',
    project_id: 'project-456',
    custom_context: {
      frameworks_to_compare: ['BABOK', 'PMBOK'],
      comparison_criteria: ['methodology', 'deliverables', 'roles', 'processes'],
      output_format: 'detailed_comparison_table'
    },
    priority_config: {
      project: ContextPriority.HIGH,
      documents: ContextPriority.HIGH,
      templates: ContextPriority.MEDIUM,
      user: ContextPriority.LOW,
      integrations: ContextPriority.LOW,
      custom: ContextPriority.HIGH
    }
  }

  try {
    const response = await ContextInjector.injectContext(request)
    return response
  } catch (error) {
    console.error('Multi-framework context injection failed:', error)
    throw error
  }
}

/**
 * Utility function to demonstrate context injection with different providers
 */
export async function compareProvidersExample() {
  const baseRequest: Omit<ContextRequest, 'provider' | 'model'> = {
    prompt: 'Generate project documentation outline',
    user_id: 'user-123',
    project_id: 'project-456'
  }

  const providers = [
    { provider: 'openai', model: 'gpt-3.5-turbo' },
    { provider: 'openai', model: 'gpt-4' },
    { provider: 'google', model: 'gemini-pro' }
  ]

  const results = []

  for (const { provider, model } of providers) {
    try {
      const request: ContextRequest = {
        ...baseRequest,
        provider,
        model
      }

      const stats = await ContextInjector.getContextStats(request)
      const response = await ContextInjector.injectContext(request)

      results.push({
        provider,
        model,
        available_tokens: stats.available_tokens,
        context_tokens_used: response.token_usage.context_tokens,
        context_ratio: response.token_usage.context_ratio,
        warnings: response.warnings
      })

    } catch (error) {
      console.error(`Failed for ${provider}/${model}:`, error)
      results.push({
        provider,
        model,
        error: error.message
      })
    }
  }

  return results
}

/**
 * Example of handling context injection errors gracefully
 */
export async function errorHandlingExample() {
  const request: ContextRequest = {
    prompt: 'This is a test prompt',
    user_id: 'invalid-user-id',
    provider: 'openai',
    project_id: 'non-existent-project'
  }

  try {
    const response = await ContextInjector.injectContext(request)
    return response
  } catch (error) {
    console.error('Context injection error:', error)
    
    // Fallback: return original prompt without context
    return {
      enhanced_prompt: request.prompt,
      context_used: {},
      token_usage: {
        prompt_tokens: 0,
        context_tokens: 0,
        total_tokens: 0,
        available_tokens: 0,
        context_ratio: 0
      },
      context_summary: 'No context available due to error',
      warnings: [`Context injection failed: ${error.message}`]
    }
  }
}