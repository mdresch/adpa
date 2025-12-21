import { jest } from '@jest/globals'
import { openaiConnector, OpenAIRequest, OpenAIProvider, OpenAIConfig } from '../openai'
import { pool } from '../../../database/connection'
import { logger } from '../../../utils/logger'

// Mock dependencies
jest.mock('../../../database/connection')
jest.mock('../../../utils/logger')
jest.mock('openai')
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn()
}))
jest.mock('ai', () => ({
  generateText: jest.fn()
}))

const mockPool = pool as jest.Mocked<typeof pool>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('OpenAI Connector', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset singleton state if possible or mock the internal maps in tests if access needed
    // For now we rely on the fact that we can manipulate the exported singleton's private fields via 'any' casting in tests
    const connector = openaiConnector as any
    connector.providers.clear()
    connector.clients.clear()
    connector.failoverQueue = []
  })

  describe('initializeProviders', () => {
    it('should initialize providers from database', async () => {
      const mockProviders = [
        {
          id: '1',
          name: 'openai-primary',
          api_key_encrypted: Buffer.from('sk-test123').toString('base64'),
          configuration: { organization: 'org-123' },
          is_active: true,
          priority: 1,
          rate_limits: {
            requestsPerMinute: 3500,
            tokensPerMinute: 90000,
            requestsPerDay: 10000
          },
          usage_stats: {
            requestsThisMinute: 0,
            tokensThisMinute: 0,
            requestsToday: 0,
            lastReset: new Date().toISOString()
          }
        }
      ]

      mockPool.query.mockResolvedValueOnce({ rows: mockProviders } as any)

      // Mock OpenAI constructor and methods for listing
      const mockOpenAI = {
        models: {
          list: jest.fn().mockResolvedValue({ data: [] })
        }
      }

      const OpenAI = require('openai').default
      OpenAI.mockImplementation(() => mockOpenAI)

      await openaiConnector.initializeProviders()

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'))
      expect(mockLogger.info).toHaveBeenCalledWith('Initialized 1 OpenAI providers')
    })
  })

  describe('generateCompletion', () => {
    const mockRequest: OpenAIRequest = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello, world!' }
      ],
      temperature: 0.7,
      max_tokens: 100
    }

    it('should generate completion successfully using ai-sdk', async () => {
      const mockCompletion = {
        text: 'Hello! How can I help you today?',
        finishReason: 'stop',
        usage: {
          promptTokens: 9,
          completionTokens: 12,
          totalTokens: 21
        }
      }

      // Mock provider setup
      const mockProvider: OpenAIProvider = {
        id: '1',
        name: 'test-provider',
        config: { apiKey: 'sk-test123' },
        isActive: true,
        priority: 1,
        rateLimits: {
          requestsPerMinute: 3500,
          tokensPerMinute: 90000,
          requestsPerDay: 10000
        },
        currentUsage: {
          requestsThisMinute: 0,
          tokensThisMinute: 0,
          requestsToday: 0,
          lastReset: new Date()
        }
      }

      // Mock ai-sdk mocks
      const { createOpenAI } = require('@ai-sdk/openai')
      const { generateText } = require('ai')

      const mockOpenAIInstance = jest.fn((model) => model)
      createOpenAI.mockReturnValue(mockOpenAIInstance)
      generateText.mockResolvedValue(mockCompletion)

      // Add provider to connector
      const connector = openaiConnector as any
      connector.providers.set('test-provider', mockProvider)
      connector.updateFailoverQueue()

      const result = await openaiConnector.generateCompletion(mockRequest)

      expect(result.provider).toBe('test-provider')
      expect(result.choices[0].message.content).toBe('Hello! How can I help you today?')
      expect(createOpenAI).toHaveBeenCalledWith({
        apiKey: 'sk-test123',
        organization: undefined,
        baseURL: undefined
      })
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-3.5-turbo',
        messages: mockRequest.messages,
        temperature: 0.7,
        maxTokens: 100
      }))
    })
  })

  describe('getAvailableModels', () => {
    it('should fetch models from specific provider using native client', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-4', object: 'model' },
          { id: 'gpt-3.5-turbo', object: 'model' },
          { id: 'text-davinci-003', object: 'model' }
        ]
      }

      const mockClient = {
        models: {
          list: jest.fn().mockResolvedValue(mockModels)
        }
      }

      const connector = openaiConnector as any
      connector.clients.set('test-provider', mockClient)
      connector.providers.set('test-provider', { isActive: true }) // Must be active
      connector.failoverQueue = ['test-provider']

      const models = await openaiConnector.getAvailableModels('test-provider')

      expect(models).toEqual(['gpt-3.5-turbo', 'gpt-4'])
      expect(mockClient.models.list).toHaveBeenCalled()
    })
  })
})