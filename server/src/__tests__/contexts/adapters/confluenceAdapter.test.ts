import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import axios from 'axios'
import { confluenceAdapterFactory } from '../../../contexts/adapters/confluenceAdapter'
import { clearAllCache } from '../../../utils/cache'
import { resetCircuitBreaker, resetAllCircuitBreakers } from '../../../utils/circuitBreaker'
import { resetAllRateLimits } from '../../../utils/rateLimiter'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock database
jest.mock('../../../database/connection', () => ({
  pool: {
    query: jest.fn()
  }
}))

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}))

describe('ConfluenceAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearAllCache()
    resetAllCircuitBreakers()
    resetAllRateLimits()
  })

  describe('search', () => {
    it('should return cached results if available', async () => {
      const { pool } = require('../../../database/connection')
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'test-id',
          configuration: { base_url: 'https://test.atlassian.net' },
          credentials_encrypted: Buffer.from(JSON.stringify({
            username: 'test@example.com',
            api_token: 'test-token'
          })).toString('base64')
        }]
      })

      const adapter = confluenceAdapterFactory()
      
      // First call - should fetch from API
      mockedAxios.create.mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce({
          data: {
            results: [{
              id: '123',
              title: 'Test Page',
              space: { key: 'TEST' },
              body: { storage: { value: 'Content' } }
            }]
          }
        })
      } as any)

      const results1 = await adapter.search({ query: 'test', fresh: false })
      expect(results1).toHaveLength(1)
      expect(results1[0].title).toBe('Test Page')

      // Second call - should return cached
      const results2 = await adapter.search({ query: 'test', fresh: false })
      expect(results2).toHaveLength(1)
      expect(results2[0].title).toBe('Test Page')
      // Should not call API again
      expect(mockedAxios.create).toHaveBeenCalledTimes(1)
    })

    it('should bypass cache if fresh=true', async () => {
      const { pool } = require('../../../database/connection')
      pool.query.mockResolvedValue({
        rows: [{
          id: 'test-id',
          configuration: { base_url: 'https://test.atlassian.net' },
          credentials_encrypted: Buffer.from(JSON.stringify({
            username: 'test@example.com',
            api_token: 'test-token'
          })).toString('base64')
        }]
      })

      const adapter = confluenceAdapterFactory()
      
      mockedAxios.create.mockReturnValue({
        get: jest.fn()
          .mockResolvedValueOnce({
            data: {
              results: [{
                id: '123',
                title: 'Test Page 1',
                space: { key: 'TEST' },
                body: { storage: { value: 'Content 1' } }
              }]
            }
          })
          .mockResolvedValueOnce({
            data: {
              results: [{
                id: '456',
                title: 'Test Page 2',
                space: { key: 'TEST' },
                body: { storage: { value: 'Content 2' } }
              }]
            }
          })
      } as any)

      const results1 = await adapter.search({ query: 'test', fresh: false })
      const results2 = await adapter.search({ query: 'test', fresh: true })
      
      expect(results1[0].title).toBe('Test Page 1')
      expect(results2[0].title).toBe('Test Page 2')
      // Should call API twice (fresh bypasses cache)
      expect(mockedAxios.create().get).toHaveBeenCalledTimes(2)
    })

    it('should normalize Confluence page data correctly', async () => {
      const { pool } = require('../../../database/connection')
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'test-id',
          configuration: { base_url: 'https://test.atlassian.net' },
          credentials_encrypted: Buffer.from(JSON.stringify({
            username: 'test@example.com',
            api_token: 'test-token'
          })).toString('base64')
        }]
      })

      const adapter = confluenceAdapterFactory()
      
      mockedAxios.create.mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce({
          data: {
            results: [{
              id: '123456',
              title: 'Project Charter',
              space: { key: 'PROJ' },
              body: { storage: { value: 'This is the content'.repeat(1000) } },
              version: { when: '2024-01-01T00:00:00Z' }
            }]
          }
        })
      } as any)

      const results = await adapter.search({ query: 'charter', fresh: false })
      
      expect(results[0]).toMatchObject({
        id: '123456',
        provider: 'confluence',
        title: 'Project Charter',
        url: 'https://test.atlassian.net/wiki/spaces/PROJ/pages/123456',
        metadata: { spaceKey: 'PROJ' }
      })
      // Summary should be truncated to 10k chars
      expect(results[0].summary.length).toBeLessThanOrEqual(10000)
    })
  })

  describe('fetchById', () => {
    it('should fetch and normalize a Confluence page by ID', async () => {
      const { pool } = require('../../../database/connection')
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'test-id',
          configuration: { base_url: 'https://test.atlassian.net' },
          credentials_encrypted: Buffer.from(JSON.stringify({
            username: 'test@example.com',
            api_token: 'test-token'
          })).toString('base64')
        }]
      })

      const adapter = confluenceAdapterFactory()
      
      mockedAxios.create.mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce({
          data: {
            id: '789',
            title: 'Test Page',
            space: { key: 'SPACE' },
            body: { storage: { value: 'Page content' } },
            version: { when: '2024-01-01T00:00:00Z' }
          }
        })
      } as any)

      const result = await adapter.fetchById({ id: '789', fresh: false })
      
      expect(result).not.toBeNull()
      expect(result?.id).toBe('789')
      expect(result?.title).toBe('Test Page')
      expect(result?.url).toBe('https://test.atlassian.net/wiki/spaces/SPACE/pages/789')
    })

    it('should return null for 404 responses', async () => {
      const { pool } = require('../../../database/connection')
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'test-id',
          configuration: { base_url: 'https://test.atlassian.net' },
          credentials_encrypted: Buffer.from(JSON.stringify({
            username: 'test@example.com',
            api_token: 'test-token'
          })).toString('base64')
        }]
      })

      const adapter = confluenceAdapterFactory()
      
      mockedAxios.create.mockReturnValueOnce({
        get: jest.fn().mockRejectedValueOnce({
          response: { status: 404 }
        })
      } as any)

      const result = await adapter.fetchById({ id: 'nonexistent', fresh: false })
      
      expect(result).toBeNull()
    })
  })
})

