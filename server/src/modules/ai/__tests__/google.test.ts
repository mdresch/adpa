import { jest } from '@jest/globals'
import { googleConnector, GoogleRequest, GoogleProvider, GoogleConfig } from '../google'
import { pool } from '../../../database/connection'
import { logger } from '../../../utils/logger'

// Mock dependencies
jest.mock('../../../database/connection')
jest.mock('../../../utils/logger')
jest.mock('@google/generative-ai')

const mockPool = pool as jest.Mocked<typeof pool>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('Google AI Connector', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initializeProviders', () => {
    it('should initialize providers from database', async () => {
      const mockProviders = [
        {
          id: '1',
          name: 'google-primary',
          api_key_encrypted: Buffer.from('test-api-key').toString('base64'),
          configuration: { timeout: 30000 },
          is_active: true,
          priority: 1,
          rate_limits: {
            requestsPerMinute: 60,
            tokensPerMinute: 32000,
            requestsPerDay: 1500
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

      // Mock GoogleGenerativeAI constructor and methods
      const mockGoogleAI = {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: () => 'Test response',
              candidates: [{ finishReason: 'stop' }],
              usageMetadata: {
                promptTokenCount: 5,
                candidatesTokenCount: 10,
                totalTokenCount: 15
              }
            }
          })
        })
      }
      
      const { GoogleGenerativeAI } = require('@google/generative-ai')
      GoogleGenerativeAI.mockImplementation(() => mockGoogleAI)

      await googleConnector.initializeProviders()

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'))
      expect(mockLogger.info).toHaveBeenCalledWith('Initialized 1 Google AI providers')
    })

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed')
      mockPool.query.mockRejectedValueOnce(error)

      await expect(googleConnector.initializeProviders()).rejects.toThrow('Database connection failed')
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Google AI providers:', error)
    })
  })

  describe('generateCompletion', () => {
    const mockRequest: GoogleRequest = {
      model: 'gemini-pro',
      messages: [
        { role: 'user', content: 'Hello, world!' }
      ],
      temperature: 0.7,
      max_tokens: 100
    }

    it('should generate completion successfully', async () => {
      const mockResponse = {
        response: {
          text: () => 'Hello! How can I help you today?',
          candidates: [
            {
              finishReason: 'stop',
              safetyRatings: []
            }
          ],
          usageMetadata: {
            promptTokenCount: 9,
            candidatesTokenCount: 12,
            totalTokenCount: 21
          }
        }
      }

      // Mock provider setup
      const mockProvider: GoogleProvider = {
        id: '1',
        name: 'test-provider',
        config: { apiKey: 'test-api-key' },
        isActive: true,
        priority: 1,
        rateLimits: {
          requestsPerMinute: 60,
          tokensPerMinute: 32000,
          requestsPerDay: 1500
        },
        currentUsage: {
          requestsThisMinute: 0,
          tokensThisMinute: 0,
          requestsToday: 0,
          lastReset: new Date()
        }
      }

      // Mock Google AI client
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      }

      const mockClient = {
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }

      // Add provider to connector
      const connector = googleConnector as any
      connector.providers.set('test-provider', mockProvider)
      connector.clients.set('test-provider', mockClient)
      connector.failoverQueue = ['test-provider']

      mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

      const result = await googleConnector.generateCompletion(mockRequest)

      expect(result.provider).toBe('test-provider')
      expect(result.choices[0].message.content).toBe('Hello! How can I help you today?')
      expect(mockClient.getGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-pro',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100,
          topP: undefined,
          topK: undefined,
          stopSequences: undefined,
        }
      })
      expect(mockModel.generateContent).toHaveBeenCalledWith('User: Hello, world!')
    })

    it('should handle rate limit errors with failover', async () => {
      const rateLimitError = {
        status: 429,
        message: 'Rate limit exceeded'
      }

      const mockProvider1: GoogleProvider = {
        id: '1',
        name: 'provider-1',
        config: { apiKey: 'test-api-key-1' },
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

      const mockProvider2: GoogleProvider = {
        id: '2',
        name: 'provider-2',
        config: { apiKey: 'test-api-key-2' },
        isActive: true,
        priority: 2,
        rateLimits: {
          requestsPerMinute: 60,
          tokensPerMinute: 32000,
          requestsPerDay: 1500
        },
        currentUsage: {
          requestsThisMinute: 0,
          tokensThisMinute: 0,
          requestsToday: 0,
          lastReset: new Date()
        }
      }

      const mockModel1 = {
        generateContent: jest.fn().mockRejectedValue(rateLimitError)
      }

      const mockModel2 = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => 'Success from provider 2',
            candidates: [{ finishReason: 'stop' }],
            usageMetadata: { totalTokenCount: 20 }
          }
        })
      }

      const mockClient1 = {
        getGenerativeModel: jest.fn().mockReturnValue(mockModel1)
      }

      const mockClient2 = {
        getGenerativeModel: jest.fn().mockReturnValue(mockModel2)
      }

      const connector = googleConnector as any
      connector.providers.set('provider-1', mockProvider1)
      connector.providers.set('provider-2', mockProvider2)
      connector.clients.set('provider-1', mockClient1)
      connector.clients.set('provider-2', mockClient2)
      connector.failoverQueue = ['provider-2'] // Only provider-2 should be available due to rate limits

      mockPool.query.mockResolvedValue({ rows: [] } as any)

      const result = await googleConnector.generateCompletion(mockRequest)

      expect(result.provider).toBe('provider-2')
      expect(mockClient2.getGenerativeModel).toHaveBeenCalled()
      expect(mockClient1.getGenerativeModel).not.toHaveBeenCalled()
    })

    it('should throw error when no providers are available', async () => {
      const connector = googleConnector as any
      connector.providers.clear()
      connector.clients.clear()
      connector.failoverQueue = []

      await expect(googleConnector.generateCompletion(mockRequest))
        .rejects.toThrow('No available Google AI providers')
    })
  })

  describe('getAvailableModels', () => {
    it('should return default models when no provider specified', async () => {
      const models = await googleConnector.getAvailableModels()
      
      expect(models).toContain('gemini-pro')
      expect(models).toContain('gemini-pro-vision')
      expect(models).toContain('gemini-1.5-pro')
      expect(models).toContain('gemini-1.5-flash')
    })

    it('should return default models for specific provider', async () => {
      const mockClient = {
        getGenerativeModel: jest.fn()
      }

      const connector = googleConnector as any
      connector.clients.set('test-provider', mockClient)

      const models = await googleConnector.getAvailableModels('test-provider')

      expect(models).toContain('gemini-pro')
      expect(models).toContain('gemini-pro-vision')
    })

    it('should return default models when client not found', async () => {
      const models = await googleConnector.getAvailableModels('non-existent-provider')

      expect(models).toContain('gemini-pro')
      expect(models).toContain('gemini-pro-vision')
    })
  })

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => 'Test response'
          }
        })
      }

      const mockClient = {
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }

      const connector = googleConnector as any
      connector.clients.set('test-provider', mockClient)

      const result = await googleConnector.testConnection('test-provider')

      expect(result).toBe(true)
      expect(mockClient.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-pro' })
      expect(mockModel.generateContent).toHaveBeenCalledWith('Test connection')
    })

    it('should return false for failed connection', async () => {
      const mockModel = {
        generateContent: jest.fn().mockRejectedValue(new Error('Connection failed'))
      }

      const mockClient = {
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }

      const connector = googleConnector as any
      connector.clients.set('test-provider', mockClient)

      const result = await googleConnector.testConnection('test-provider')

      expect(result).toBe(false)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Connection test failed'),
        expect.any(Error)
      )
    })

    it('should return false for non-existent provider', async () => {
      const result = await googleConnector.testConnection('non-existent')

      expect(result).toBe(false)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Connection test failed'),
        expect.any(Error)
      )
    })
  })

  describe('rate limiting', () => {
    it('should respect rate limits', () => {
      const provider: GoogleProvider = {
        id: '1',
        name: 'test-provider',
        config: { apiKey: 'test-api-key' },
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

      const connector = googleConnector as any
      const result = connector.checkRateLimits(provider)

      expect(result).toBe(false)
    })

    it('should reset counters after time period', () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago

      const provider: GoogleProvider = {
        id: '1',
        name: 'test-provider',
        config: { apiKey: 'test-api-key' },
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

      const connector = googleConnector as any
      const result = connector.checkRateLimits(provider)

      expect(result).toBe(true)
      expect(provider.currentUsage.requestsThisMinute).toBe(0)
      expect(provider.currentUsage.tokensThisMinute).toBe(0)
    })
  })

  describe('error handling', () => {
    it('should parse rate limit errors correctly', () => {
      const connector = googleConnector as any
      const error = { status: 429, message: 'Rate limit exceeded' }
      
      const parsedError = connector.parseError(error)
      
      expect(parsedError.type).toBe('rate_limit')
      expect(parsedError.statusCode).toBe(429)
      expect(parsedError.retryAfter).toBe(60)
    })

    it('should parse authentication errors correctly', () => {
      const connector = googleConnector as any
      const error = { status: 401, message: 'Invalid API key' }
      
      const parsedError = connector.parseError(error)
      
      expect(parsedError.type).toBe('authentication')
      expect(parsedError.statusCode).toBe(401)
    })

    it('should parse safety errors correctly', () => {
      const connector = googleConnector as any
      const error = { message: 'Content blocked by SAFETY filters' }
      
      const parsedError = connector.parseError(error)
      
      expect(parsedError.type).toBe('safety_error')
      expect(parsedError.message).toBe('Content blocked by safety filters')
    })

    it('should identify retryable errors', () => {
      const connector = googleConnector as any
      
      expect(connector.isRetryableError({ type: 'rate_limit' })).toBe(true)
      expect(connector.isRetryableError({ type: 'api_error' })).toBe(true)
      expect(connector.isRetryableError({ type: 'network_error' })).toBe(true)
      expect(connector.isRetryableError({ type: 'timeout' })).toBe(true)
      expect(connector.isRetryableError({ type: 'authentication' })).toBe(false)
      expect(connector.isRetryableError({ type: 'safety_error' })).toBe(false)
    })
  })

  describe('message conversion', () => {
    it('should convert OpenAI-style messages to Google AI prompt', () => {
      const connector = googleConnector as any
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ]
      
      const prompt = connector.convertMessagesToPrompt(messages)
      
      expect(prompt).toBe(
        'System: You are a helpful assistant.\n\n' +
        'User: Hello!\n\n' +
        'Assistant: Hi there!\n\n' +
        'User: How are you?'
      )
    })
  })
})