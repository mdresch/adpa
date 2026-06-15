import { AIService } from '../../services/aiService'
import { logger } from '../../utils/logger'

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock node-fetch and other fetch polyfills
global.fetch = jest.fn()

// Mock database connection to prevent real network calls
jest.mock('../../database/connection', () => ({
  getDatabasePoolSafe: jest.fn().mockReturnValue({
    query: jest.fn().mockImplementation((sql: string, params: any[]) => {
      const provider = params && params[0] ? params[0] : 'mocked-provider'
      return Promise.resolve({
        rows: [
          {
            provider_type: provider,
            api_key_encrypted: 'mock-key',
            configuration: { apiKey: 'dummy-key' }
          }
        ]
      })
    })
  })
}))

// Mock analytics to prevent async queue connections
jest.mock('../../services/analyticsTrackingService', () => ({
  __esModule: true,
  default: {
    trackAIUsageAsync: jest.fn()
  }
}))

// Properly mock named and default exports
jest.mock('@google/generative-ai', () => ({
  __esModule: true,
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockRejectedValue(new Error('Simulated Google AI Error'))
    })
  }))
}))

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockRejectedValue(new Error('Simulated Anthropic Error'))
    }
  }))
}))

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockRejectedValue(new Error('Simulated Moonshot Error'))
      }
    }
  }))
}))

describe('AIService - Error Logging and PII Traceability (Contract Guards)', () => {
  let aiService: AIService

  beforeEach(() => {
    jest.clearAllMocks()
    aiService = new AIService()
  })

  describe('Direct Provider API Exceptions', () => {
    it('MUST log Moonshot exceptions explicitly with PII prompt before fallback (REQ-SEC-001)', async () => {
      const request = {
        prompt: 'Hello Moonshot',
        provider: 'moonshot',
        model: 'moonshot-v1-8k',
        temperature: 0.7
      }

      try {
        await aiService.generate(request)
        fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).toBe('Simulated Moonshot Error')
        expect(error.provider).toBe('moonshot')
      }

      // Assert that logger.error was called with the PII prompt payload
      expect(logger.error).toHaveBeenCalledWith(
        '[AI-SERVICE] Moonshot API error',
        expect.objectContaining({
          error: 'Simulated Moonshot Error',
          pii_prompt: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Hello Moonshot' })
          ])
        })
      )
    })

    it('MUST log Anthropic exceptions explicitly with PII prompt before fallback (REQ-SEC-002)', async () => {
      const request = {
        prompt: 'Hello Anthropic',
        provider: 'anthropic',
        model: 'claude-3-opus-20240229'
      }

      try {
        await aiService.generate(request)
        fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).toBe('Simulated Anthropic Error')
        expect(error.provider).toBe('anthropic')
      }

      // Assert that logger.error was called with the PII prompt payload
      expect(logger.error).toHaveBeenCalledWith(
        '[AI-SERVICE] Anthropic API error',
        expect.objectContaining({
          error: 'Simulated Anthropic Error',
          pii_prompt: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Hello Anthropic' })
          ])
        })
      )
    })

    it('MUST log Google AI exceptions explicitly with PII prompt before fallback (REQ-SEC-003)', async () => {
      const request = {
        prompt: 'Hello Google',
        provider: 'google',
        model: 'gemini-1.5-pro'
      }

      try {
        await aiService.generate(request)
        fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).toBe('Simulated Google AI Error')
        expect(error.provider).toBe('google')
      }

      // Assert that logger.error was called with the PII prompt payload
      expect(logger.error).toHaveBeenCalledWith(
        '[AI-SERVICE] Google AI API error',
        expect.objectContaining({
          error: 'Simulated Google AI Error',
          // Google AI combines the prompt into a string
          pii_prompt: expect.stringContaining('Hello Google')
        })
      )
    })
  })
})
