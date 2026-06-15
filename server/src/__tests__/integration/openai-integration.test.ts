import { jest } from '@jest/globals'
import request from 'supertest'
import { pool } from '../../database/connection'
import { openaiConnector } from '../../modules/ai/openai'
import { aiService } from '../../services/aiService'
import { logger } from '../../utils/logger'

// Mock external dependencies
jest.mock('openai')
jest.mock('../../utils/logger')

const mockLogger = logger as jest.Mocked<typeof logger>

describe('OpenAI Integration Tests', () => {
  let app: any
  let testProviderId: string
  let testUserId: string

  beforeAll(async () => {
    // Import app after mocks are set up
    const { default: createApp } = await Promise.resolve().then(() => require())
    app = createApp()

    // Create test user
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ('test@example.com', 'hashed_password', 'Test User', 'admin')
      RETURNING id
    `)
    testUserId = userResult.rows[0].id

    // Create test OpenAI provider
    const providerResult = await pool.query(`
      INSERT INTO ai_providers (
        name, provider_type, api_key_encrypted, configuration, 
        is_active, priority, rate_limits
      )
      VALUES (
        'test-openai-provider',
        'openai',
        $1,
        '{"organization": "test-org"}',
        true,
        1,
        '{"requestsPerMinute": 10, "tokensPerMinute": 1000, "requestsPerDay": 100}'
      )
      RETURNING id
    `,
    [Buffer.from('sk-test123').toString('base64')]
    )
    testProviderId = providerResult.rows[0].id
  })

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [testUserId])
    await pool.query('DELETE FROM ai_providers WHERE id = $1', [testProviderId])
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
    await pool.end()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('OpenAI Connector', () => {
    it('should initialize providers from database', async () => {
      // Mock OpenAI constructor
      const mockOpenAI = {
        models: {
          list: jest.fn().mockResolvedValue({ data: [] })
        }
      }
      
      const OpenAI = require('openai').default
      OpenAI.mockImplementation(() => mockOpenAI)

      await openaiConnector.initializeProviders()

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Initialized')
      )
    })

    it('should generate completion with failover', async () => {
      const mockResponse = {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Test response'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25
        }
      }

      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }

      // Mock the connector's internal state
      const connector = openaiConnector as any
      connector.providers.set('test-openai-provider', {
        id: testProviderId,
        name: 'test-openai-provider',
        config: { apiKey: 'sk-test123' },
        isActive: true,
        priority: 1,
        rateLimits: {
          requestsPerMinute: 10,
          tokensPerMinute: 1000,
          requestsPerDay: 100
        },
        currentUsage: {
          requestsThisMinute: 0,
          tokensThisMinute: 0,
          requestsToday: 0,
          lastReset: new Date()
        }
      })
      connector.clients.set('test-openai-provider', mockClient)
      connector.failoverQueue = ['test-openai-provider']

      const request = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }]
      }

      const result = await openaiConnector.generateCompletion(request)

      expect(result.provider).toBe('test-openai-provider')
      expect(result.choices[0].message.content).toBe('Test response')
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: request.messages,
        temperature: undefined,
        max_tokens: undefined,
        top_p: undefined,
        frequency_penalty: undefined,
        presence_penalty: undefined,
        stop: undefined,
        stream: false
      })
    })

    it('should handle rate limiting correctly', async () => {
      const connector = openaiConnector as any
      
      const provider = {
        id: testProviderId,
        name: 'test-provider',
        config: { apiKey: 'sk-test123' },
        isActive: true,
        priority: 1,
        rateLimits: {
          requestsPerMinute: 1,
          tokensPerMinute: 100,
          requestsPerDay: 10
        },
        currentUsage: {
          requestsThisMinute: 2, // Exceeds limit
          tokensThisMinute: 50,
          requestsToday: 5,
          lastReset: new Date()
        }
      }

      const result = connector.checkRateLimits(provider)
      expect(result).toBe(false)
    })

    it('should test connection to provider', async () => {
      const mockClient = {
        models: {
          list: jest.fn().mockResolvedValue({ data: [] })
        }
      }

      const connector = openaiConnector as any
      connector.clients.set('test-openai-provider', mockClient)

      const result = await openaiConnector.testConnection('test-openai-provider')
      expect(result).toBe(true)
      expect(mockClient.models.list).toHaveBeenCalled()
    })

    it('should get available models', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-4', object: 'model' },
          { id: 'gpt-3.5-turbo', object: 'model' }
        ]
      }

      const mockClient = {
        models: {
          list: jest.fn().mockResolvedValue(mockModels)
        }
      }

      const connector = openaiConnector as any
      connector.clients.set('test-openai-provider', mockClient)

      const models = await openaiConnector.getAvailableModels('test-openai-provider')
      expect(models).toEqual(['gpt-3.5-turbo', 'gpt-4'])
    })
  })

  describe('AI Service Integration', () => {
    it('should use OpenAI connector for OpenAI providers', async () => {
      // Mock the OpenAI connector
      const mockGenerateCompletion = jest.fn().mockResolvedValue({
        id: 'chatcmpl-test',
        choices: [{ message: { content: 'AI Service Test Response' } }],
        model: 'gpt-3.5-turbo',
        usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
        provider: 'test-openai-provider'
      })

      const connector = openaiConnector as any
      connector.generateCompletion = mockGenerateCompletion

      const result = await aiService.generate({
        prompt: 'Test prompt',
        provider: 'test-openai-provider',
        model: 'gpt-3.5-turbo'
      })

      expect(result.content).toBe('AI Service Test Response')
      expect(result.provider).toBe('test-openai-provider')
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test prompt' }]
        }),
        'test-openai-provider'
      )
    })

    it('should get OpenAI provider statistics', async () => {
      const mockStats = {
        id: testProviderId,
        name: 'test-openai-provider',
        isActive: true,
        priority: 1,
        rateLimits: { requestsPerMinute: 10 },
        currentUsage: { requestsThisMinute: 5 }
      }

      const connector = openaiConnector as any
      connector.getProviderStats = jest.fn().mockReturnValue(mockStats)

      const result = await aiService.getOpenAIProviderStats('test-openai-provider')
      expect(result).toEqual(mockStats)
    })

    it('should test OpenAI connection', async () => {
      const connector = openaiConnector as any
      connector.testConnection = jest.fn().mockResolvedValue(true)

      const result = await aiService.testOpenAIConnection('test-openai-provider')
      expect(result).toBe(true)
    })
  })

  describe('API Endpoints', () => {
    it('should get OpenAI provider statistics via API', async () => {
      const mockStats = {
        id: testProviderId,
        name: 'test-openai-provider',
        isActive: true,
        priority: 1
      }

      jest.spyOn(aiService, 'getOpenAIProviderStats').mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/ai/openai/stats/test-openai-provider')
        .expect(200)

      expect(response.body.stats).toEqual(mockStats)
    })

    it('should test OpenAI connection via API', async () => {
      jest.spyOn(aiService, 'testOpenAIConnection').mockResolvedValue(true)

      const response = await request(app)
        .post('/api/ai/openai/test/test-openai-provider')
        .expect(200)

      expect(response.body.connected).toBe(true)
      expect(response.body.provider).toBe('test-openai-provider')
    })

    it('should get OpenAI models via API', async () => {
      const mockModels = ['gpt-4', 'gpt-3.5-turbo']
      
      const connector = openaiConnector as any
      connector.getAvailableModels = jest.fn().mockResolvedValue(mockModels)

      const response = await request(app)
        .get('/api/ai/openai/models/test-openai-provider')
        .expect(200)

      expect(response.body.models).toEqual(mockModels)
      expect(response.body.provider).toBe('test-openai-provider')
    })

    it('should generate completion with enhanced endpoint', async () => {
      const mockResult = {
        content: 'Enhanced API Test Response',
        provider: 'test-openai-provider',
        model: 'gpt-3.5-turbo',
        usage: { total_tokens: 25 }
      }

      jest.spyOn(aiService, 'generate').mockResolvedValue(mockResult)

      const response = await request(app)
        .post('/api/ai/generate/enhanced')
        .send({
          prompt: 'Test prompt',
          provider: 'test-openai-provider',
          model: 'gpt-3.5-turbo'
        })
        .expect(200)

      expect(response.body.content).toBe('Enhanced API Test Response')
      expect(response.body.metadata.requested_provider).toBe('test-openai-provider')
      expect(response.body.metadata.actual_provider).toBe('test-openai-provider')
      expect(response.body.metadata.failover_used).toBe(false)
    })

    it('should handle failover in enhanced endpoint', async () => {
      const mockResult = {
        content: 'Failover Response',
        provider: 'backup-openai-provider', // Different from requested
        model: 'gpt-3.5-turbo',
        usage: { total_tokens: 25 }
      }

      jest.spyOn(aiService, 'generate').mockResolvedValue(mockResult)

      const response = await request(app)
        .post('/api/ai/generate/enhanced')
        .send({
          prompt: 'Test prompt',
          provider: 'test-openai-provider',
          model: 'gpt-3.5-turbo'
        })
        .expect(200)

      expect(response.body.content).toBe('Failover Response')
      expect(response.body.metadata.requested_provider).toBe('test-openai-provider')
      expect(response.body.metadata.actual_provider).toBe('backup-openai-provider')
      expect(response.body.metadata.failover_used).toBe(true)
    })

    it('should handle errors in enhanced endpoint', async () => {
      jest.spyOn(aiService, 'generate').mockRejectedValue(new Error('API Error'))

      const response = await request(app)
        .post('/api/ai/generate/enhanced')
        .send({
          prompt: 'Test prompt',
          provider: 'test-openai-provider'
        })
        .expect(500)

      expect(response.body.error).toBe('AI generation failed')
      expect(response.body.details).toBe('API Error')
    })

    it('should return 404 for non-existent provider stats', async () => {
      jest.spyOn(aiService, 'getOpenAIProviderStats').mockResolvedValue(null)

      await request(app)
        .get('/api/ai/openai/stats/non-existent-provider')
        .expect(404)
    })

    it('should return 404 for non-existent provider connection test', async () => {
      await request(app)
        .post('/api/ai/openai/test/non-existent-provider')
        .expect(404)
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      const apiError = {
        status: 429,
        message: 'Rate limit exceeded',
        headers: { 'retry-after': '60' }
      }

      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(apiError)
          }
        }
      }

      const connector = openaiConnector as any
      connector.clients.set('test-provider', mockClient)
      connector.providers.set('test-provider', {
        id: 'test-id',
        name: 'test-provider',
        isActive: true,
        rateLimits: { requestsPerMinute: 100 },
        currentUsage: { requestsThisMinute: 0, lastReset: new Date() }
      })
      connector.failoverQueue = ['test-provider']

      const request = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Test' }]
      }

      await expect(openaiConnector.generateCompletion(request))
        .rejects.toThrow('All OpenAI providers failed')
    })

    it('should handle network errors', async () => {
      const networkError = {
        code: 'ECONNRESET',
        message: 'Connection reset'
      }

      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(networkError)
          }
        }
      }

      const connector = openaiConnector as any
      const parseError = connector.parseError(networkError)

      expect(parseError.type).toBe('network_error')
      expect(parseError.message).toBe('Network error')
    })

    it('should handle authentication errors', async () => {
      const authError = {
        status: 401,
        message: 'Invalid API key'
      }

      const connector = openaiConnector as any
      const parseError = connector.parseError(authError)

      expect(parseError.type).toBe('authentication')
      expect(parseError.message).toBe('Authentication failed')
    })
  })
})