/**
 * Token Manager
 * 
 * Manages token counting and limits for different AI providers and models.
 */

import { ProviderTokenLimits, TokenUsage, ContextError } from './types'
import { logger } from '../../utils/logger'

export class TokenManager {
  private static readonly DEFAULT_LIMITS: ProviderTokenLimits = {
    openai: {
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-4-turbo-preview': 128000,
      'gpt-4-0125-preview': 128000,
      'gpt-4-1106-preview': 128000,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
      'gpt-3.5-turbo-1106': 16384,
      'gpt-3.5-turbo-0125': 16384
    },
    google: {
      'gemini-pro': 30720,
      'gemini-pro-vision': 16384,
      'gemini-1.5-pro': 1048576,
      'gemini-1.5-flash': 1048576
    },
    azure: {
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-35-turbo': 4096,
      'gpt-35-turbo-16k': 16384
    }
  }

  /**
   * Get token limit for a specific provider and model
   */
  static getTokenLimit(provider: string, model: string): number {
    const providerLimits = this.DEFAULT_LIMITS[provider.toLowerCase()]
    if (!providerLimits) {
      logger.warn(`Unknown provider: ${provider}, using default limit`)
      return 4096
    }

    const modelLimit = providerLimits[model.toLowerCase()]
    if (!modelLimit) {
      logger.warn(`Unknown model: ${model} for provider: ${provider}, using default limit`)
      return 4096
    }

    return modelLimit
  }

  /**
   * Estimate token count for text (rough approximation)
   * More accurate counting would require provider-specific tokenizers
   */
  static estimateTokens(text: string): number {
    if (!text) return 0
    
    // Rough estimation: ~4 characters per token for English text
    // This is a conservative estimate that works reasonably well across providers
    const charCount = text.length
    const estimatedTokens = Math.ceil(charCount / 4)
    
    // Add some buffer for special tokens and formatting
    return Math.ceil(estimatedTokens * 1.1)
  }

  /**
   * Calculate available tokens for context given prompt and limits
   */
  static calculateAvailableTokens(
    prompt: string,
    provider: string,
    model: string,
    maxContextRatio: number = 0.7
  ): number {
    const totalLimit = this.getTokenLimit(provider, model)
    const promptTokens = this.estimateTokens(prompt)
    
    // Reserve some tokens for the response (typically 10-20% of total)
    const responseReserve = Math.ceil(totalLimit * 0.15)
    
    // Calculate available tokens for context
    const availableForContext = totalLimit - promptTokens - responseReserve
    
    // Apply max context ratio limit
    const maxContextTokens = Math.floor(totalLimit * maxContextRatio)
    
    return Math.min(availableForContext, maxContextTokens)
  }

  /**
   * Validate token usage against limits
   */
  static validateTokenUsage(
    prompt: string,
    context: string,
    provider: string,
    model: string
  ): TokenUsage {
    const promptTokens = this.estimateTokens(prompt)
    const contextTokens = this.estimateTokens(context)
    const totalTokens = promptTokens + contextTokens
    const limit = this.getTokenLimit(provider, model)
    
    // Reserve tokens for response
    const responseReserve = Math.ceil(limit * 0.15)
    const availableTokens = limit - responseReserve
    
    const usage: TokenUsage = {
      prompt_tokens: promptTokens,
      context_tokens: contextTokens,
      total_tokens: totalTokens,
      available_tokens: availableTokens,
      context_ratio: contextTokens / limit
    }

    if (totalTokens > availableTokens) {
      throw new Error(
        `Token limit exceeded: ${totalTokens} tokens used, ${availableTokens} available (limit: ${limit}, reserved: ${responseReserve})`
      )
    }

    return usage
  }

  /**
   * Truncate text to fit within token limit
   */
  static truncateToTokenLimit(text: string, maxTokens: number): string {
    if (!text) return text
    
    const currentTokens = this.estimateTokens(text)
    if (currentTokens <= maxTokens) {
      return text
    }

    // Calculate approximate character limit
    const targetChars = Math.floor((maxTokens / currentTokens) * text.length)
    
    // Truncate at word boundary when possible
    let truncated = text.substring(0, targetChars)
    const lastSpaceIndex = truncated.lastIndexOf(' ')
    
    if (lastSpaceIndex > targetChars * 0.8) {
      truncated = truncated.substring(0, lastSpaceIndex)
    }
    
    // Add ellipsis if truncated
    if (truncated.length < text.length) {
      truncated += '...'
    }
    
    return truncated
  }

  /**
   * Split text into chunks that fit within token limits
   */
  static chunkText(text: string, maxTokensPerChunk: number): string[] {
    if (!text) return []
    
    const totalTokens = this.estimateTokens(text)
    if (totalTokens <= maxTokensPerChunk) {
      return [text]
    }

    const chunks: string[] = []
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    let currentChunk = ''
    let currentTokens = 0
    
    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence)
      
      if (currentTokens + sentenceTokens > maxTokensPerChunk && currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
        currentTokens = sentenceTokens
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence
        currentTokens += sentenceTokens
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }
    
    return chunks
  }

  /**
   * Get optimal context size based on provider and model
   */
  static getOptimalContextSize(provider: string, model: string): number {
    const limit = this.getTokenLimit(provider, model)
    
    // Use 60% of total limit for context by default
    // This leaves room for prompt and response
    return Math.floor(limit * 0.6)
  }

  /**
   * Calculate token efficiency score for context
   */
  static calculateEfficiencyScore(
    contextLength: number,
    tokenCount: number,
    relevanceScore: number = 1.0
  ): number {
    if (tokenCount === 0) return 0
    
    // Efficiency = (relevance * content_density) / token_cost
    const contentDensity = contextLength / tokenCount
    const efficiency = (relevanceScore * contentDensity) / tokenCount
    
    return Math.max(0, Math.min(1, efficiency))
  }
}

export { ProviderTokenLimits, TokenUsage }