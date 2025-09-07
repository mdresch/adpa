/**
 * Context Injector Tests
 * 
 * Tests for the context injection system functionality.
 */

import { ContextInjector } from '../injector'
import { ContextRequest, ContextPriority } from '../types'
import { TokenManager } from '../token-manager'

// Mock the database connection
jest.mock('../../../database/connection', () => ({
  pool: {
    query: jest.fn()
  }
}))

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

describe('ContextInjector', () => {
  const mockUserId = 'user-123'
  const mockProjectId = 'project-456'
  const mockProvider = 'openai'
  const mockModel = 'gpt-3.5-turbo'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateRequest', () => {
    it('should validate a valid request', () => {
      const request: ContextRequest = {
        prompt: 'Test prompt',
        user_id: mockUserId,
        provider: mockProvider,
        project_id: mockProjectId
      }

      expect(() => ContextInjector.validateRequest(request)).not.toThrow()
    })

    it('should throw error for empty prompt', () => {
      const request: ContextRequest = {
        prompt: '',
        user_id: mockUserId,
        provider: mockProvider
      }

      expect(() => ContextInjector.validateRequest(request)).toThrow('Prompt is required')
    })

    it('should throw error for missing user_id', () => {
      const request: ContextRequest = {
        prompt: 'Test prompt',
        user_id: '',
        provider: mockProvider
      }

      expect(() => ContextInjector.validateRequest(request)).toThrow('User ID is required')
    })

    it('should throw error for missing provider', () => {
      const request: ContextRequest = {
        prompt: 'Test prompt',
        user_id: mockUserId,
        provider: ''
      }

      expect(() => ContextInjector.validateRequest(request)).toThrow('Provider is required')
    })

    it('should throw error for negative max_context_tokens', () => {
      const request: ContextRequest = {
        prompt: 'Test prompt',
        user_id: mockUserId,
        provider: mockProvider,
        max_context_tokens: -100
      }

      expect(() => ContextInjector.validateRequest(request)).toThrow('Max context tokens must be non-negative')
    })
  })

  describe('getContextStats', () => {
    it('should return context statistics', async () => {
      const request: ContextRequest = {
        prompt: 'Test prompt for project analysis',
        user_id: mockUserId,
        provider: mockProvider,
        model: mockModel,
        project_id: mockProjectId,
        document_ids: ['doc1', 'doc2'],
        template_id: 'template1',
        include_integrations: true,
        custom_context: { key: 'value' }
      }

      const stats = await ContextInjector.getContextStats(request)

      expect(stats).toHaveProperty('available_tokens')
      expect(stats).toHaveProperty('estimated_context_tokens')
      expect(stats).toHaveProperty('context_sources')
      expect(stats.available_tokens).toBeGreaterThan(0)
      expect(stats.context_sources).toContain('project')
      expect(stats.context_sources).toContain('documents')
      expect(stats.context_sources).toContain('template')
      expect(stats.context_sources).toContain('integrations')
      expect(stats.context_sources).toContain('custom')
      expect(stats.context_sources).toContain('user')
    })

    it('should handle minimal request', async () => {
      const request: ContextRequest = {
        prompt: 'Simple prompt',
        user_id: mockUserId,
        provider: mockProvider
      }

      const stats = await ContextInjector.getContextStats(request)

      expect(stats.context_sources).toEqual(['user'])
      expect(stats.available_tokens).toBeGreaterThan(0)
    })
  })

  describe('Token calculations', () => {
    it('should calculate available tokens correctly', () => {
      const prompt = 'This is a test prompt for token calculation'
      const availableTokens = TokenManager.calculateAvailableTokens(prompt, mockProvider, mockModel)

      expect(availableTokens).toBeGreaterThan(0)
      expect(availableTokens).toBeLessThan(TokenManager.getTokenLimit(mockProvider, mockModel))
    })

    it('should estimate tokens for text', () => {
      const text = 'This is a sample text for token estimation testing'
      const tokens = TokenManager.estimateTokens(text)

      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(text.length) // Should be less than character count
    })

    it('should truncate text to token limit', () => {
      const longText = 'This is a very long text that should be truncated when it exceeds the specified token limit for testing purposes.'
      const maxTokens = 10
      const truncated = TokenManager.truncateToTokenLimit(longText, maxTokens)

      expect(truncated.length).toBeLessThan(longText.length)
      expect(TokenManager.estimateTokens(truncated)).toBeLessThanOrEqual(maxTokens)
    })
  })

  describe('Provider token limits', () => {
    it('should return correct limits for OpenAI models', () => {
      expect(TokenManager.getTokenLimit('openai', 'gpt-4')).toBe(8192)
      expect(TokenManager.getTokenLimit('openai', 'gpt-4-turbo')).toBe(128000)
      expect(TokenManager.getTokenLimit('openai', 'gpt-3.5-turbo')).toBe(4096)
    })

    it('should return correct limits for Google models', () => {
      expect(TokenManager.getTokenLimit('google', 'gemini-pro')).toBe(30720)
      expect(TokenManager.getTokenLimit('google', 'gemini-1.5-pro')).toBe(1048576)
    })

    it('should return default limit for unknown provider/model', () => {
      expect(TokenManager.getTokenLimit('unknown', 'unknown-model')).toBe(4096)
    })
  })
})