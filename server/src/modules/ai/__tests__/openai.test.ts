import { jest } from '@jest/globals'
import { openaiConnector, OpenAIRequest, OpenAIProvider, OpenAIConfig } from '../openai'
import { pool } from '../../../database/connection'
import { logger } from '../../../utils/logger'

// Mock dependencies
jest.mock('../../../database/connection')
jest.mock('../../../utils/logger')
jest.mock('openai')

const mockPool = pool as jest.Mocked<typeof pool>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('OpenAI Connector', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

      // Mock OpenAI constructor and methods
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

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed')
      mockPool.query.mockRejectedValueOnce(error)

      await expect(openaiConnector.initializeProviders()).rejects.toThrow('Database connection failed')
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize OpenAI providers:', error)
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

    it('should generate completion successfully', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you today?'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 9,
          completion_tokens: 12,
          total_tokens: 21
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

      // Mock OpenAI client
      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }

      // Add provider to connector
      const connector = openaiConnector as any
      connector.providers.set('test-provider', mockProvider)
      connector.clients.set('test-provider', mockClient)
      connector.failoverQueue = ['test-provider']

      mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

      const result = await openaiConnector.generateCompletion(mockRequest)

      expect(result.provider).toBe('test-provider')
      expect(result.choices[0].message.content).toBe('Hello! How can I help you today?')
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: mockRequest.messages,
        temperature: 0.7,
        max_tokens: 100,
        top_p: undefined,
        frequency_penalty: undefined,
        presence_penalty: undefined,
        stop: undefined,
        stream: false
      })
    })

    it('should handle rate limit errors with failover', async () => {
      const rateLimitError = {
        status: 429,
        message: 'Rate limit exceeded',
        headers: { 'retry-after': '60' }
      }

      const mockProvider1: OpenAIProvider = {
        id: '1',
        name: 'provider-1',
        config: { apiKey: 'sk-test123' },
        isActive: true,
        priority: 1,
        rateLimits: {
          requestsPerMinute: 1,
          tokensPerMinute: 1000,
          requestsPerDay: 100
        },
        currentUsage: {
          requestsThisMinute: 2, // Exceeds limit
          tokensThisMinute: 0,
          requestsToday: 0,
          lastReset: new Date()
        }
      }

      const mockProvider2: OpenAIProvider = {
        id: '2',
        name: 'provider-2',
        config: { apiKey: 'sk-test456' },
        isActive: true,
        priority: 2,
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

      const mockClient1 = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(rateLimitError)
          }
        }
      }

      const mockClient2 = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              id: 'chatcmpl-456',
              choices: [{ message: { content: 'Success from provider 2' } }],
              usage: { total_tokens: 20 }
            })
          }
        }
      }

      const connector = openaiConnector as any
      connector.providers.set('provider-1', mockProvider1)
      connector.providers.set('provider-2', mockProvider2)
      connector.clients.set('provider-1', mockClient1)
      connector.clients.set('provider-2', mockClient2)
      connector.failoverQueue = ['provider-2'] // Only provider-2 should be available due to rate limits

      mockPool.query.mockResolvedValue({ rows: [] } as any)

      const result = await openaiConnector.generateCompletion(mockRequest)

      expect(result.provider).toBe('provider-2')
      expect(mockClient2.chat.completions.create).toHaveBeenCalled()
      expect(mockClient1.chat.completions.create).not.toHaveBeenCalled()
    })

    it('should throw error when no providers are available', async () => {
      const connector = openaiConnector as any
      connector.providers.clear()
      connector.clients.clear()
      connector.failoverQueue = []

      await expect(openaiConnector.generateCompletion(mockRequest))
        .rejects.toThrow('No available OpenAI providers')
    })
  })

  describe('getAvailableModels', () => {
    it('should return default models when no provider specified', async () => {
      const models = await openaiConnector.getAvailableModels()
      
      expect(models).toContain('gpt-4')
      expect(models).toContain('gpt-3.5-turbo')
      expect(models).toContain('gpt-4-turbo')
    })

    it('should fetch models from specific provider', async () => {
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

      const models = await openaiConnector.getAvailableModels('test-provider')

      expect(models).toEqual(['gpt-3.5-turbo', 'gpt-4'])
      expect(mockClient.models.list).toHaveBeenCalled()
    })

    it('should return default models when API call fails', async () => {
      const mockClient = {
        models: {
          list: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      }

      const connector = openaiConnector as any
      connector.clients.set('test-provider', mockClient)

      const models = await openaiConnector.getAvailableModels('test-provider')

      expect(models).toContain('gpt-4')
      expect(models).toContain('gpt-3.5-turbo')
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch models'),
        expect.any(Error)
      )
    })
  })

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      const mockClient = {
        models: {
          list: jest.fn().mockResolvedValue({ data: [] })
        }
      }

      const connector = openaiConnector as any
      connector.clients.set('test-provider', mockClient)

      const result = await openaiConnector.testConnection('test-provider')

      expect(result).toBe(true)
      expect(mockClient.models.list).toHaveBeenCalled()
    })

    it('should return false for failed connection', async () => {
      const mockClient = {
        models: {
          list: jest.fn().mockRejectedValue(new Error('Connection failed'))
        }
      }

      const connector = openaiConnector as any
      connector.clients.set('test-provider', mockClient)

      const result = await openaiConnector.testConnection('test-provider')

      expect(result).toBe(false)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Connection test failed'),
        expect.any(Error)
      )
    })

    it('should return false for non-existent provider', async () => {
      const result = await openaiConnector.testConnection('non-existent')

      expect(result).toBe(false)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Connection test failed'),
        expect.any(Error)
      )
    })
  })

  describe('rate limiting', () => {
    it('should respect rate limits', () => {
      const provider: OpenAIProvider = {
        id: '1',
        name: 'test-provider',
        config: { apiKey: 'sk-test123' },
        isActive: true,
        priority: 1,
        rateLimits: {
          requestsPerMinute: 10,
          tokensPerMinute: 1000,
          requestsPerDay: 100
        },
        currentUsage: {
          requestsThisMinute: 15, // Exceeds limit
          tokensThisMinute: 500,
          requestsToday: 50,
          lastReset: new Date()
        }
      }

      const connector = openaiConnector as any
      const result = connector.checkRateLimits(provider)

      expect(result).toBe(false)
    })

    it('should reset counters after time period', () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago

      const provider: OpenAIProvider = {
        id: '1',
        name: 'test-provider',
        config: { apiKey: 'sk-test123' },
        isActive: true,
        priority: 1,
        rateLimits: {
          requestsPerMinute: 10,
          tokensPerMinute: 1000,
          requestsPerDay: 100
        },
        currentUsage: {
          requestsThisMinute: 15, // Would exceed limit, but should be reset
          tokensThisMinute: 1500,
          requestsToday: 50,
          lastReset: oldDate
        }
      }

      const connector = openaiConnector as any
      const result = connector.checkRateLimits(provider)

      expect(result).toBe(true)
      expect(provider.currentUsage.requestsThisMinute).toBe(0)
      expect(provider.currentUsage.tokensThisMinute).toBe(0)
    })
  })
})