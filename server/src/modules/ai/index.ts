/**
 * AI Modules Index
 * 
 * This module exports all AI-related connectors and utilities.
 */

export {
  openaiConnector,
} from './openai'

export {
  googleConnector
} from './google'

export type {
  GoogleConfig,
  GoogleProvider,
  GoogleRequest,
  GoogleResponse,
  GoogleError
} from './google'

// Re-export types for convenience
export type {
  OpenAIConfig as AIConfig,
  OpenAIProvider as AIProvider,
  OpenAIRequest as AIRequest,
  OpenAIResponse as AIResponse,
  OpenAIError as AIError
} from './openai'

export type {
  GoogleConfig as GoogleAIConfig,
  GoogleProvider as GoogleAIProvider,
  GoogleRequest as GoogleAIRequest,
  GoogleResponse as GoogleAIResponse,
  GoogleError as GoogleAIError
} from './google'