import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import axios from 'axios'
import { jiraAdapterFactory } from '../../../contexts/adapters/jiraAdapter'
import { clearAllCache } from '../../../utils/cache'
import { resetAllCircuitBreakers } from '../../../utils/circuitBreaker'
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

describe('JiraAdapter', () => {
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

      const adapter = jiraAdapterFactory()
      
      // First call - should fetch from API
      mockedAxios.create.mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce({
          data: {
            issues: [{
              key: 'TEST-123',
              fields: {
                summary: 'Test Issue',
                description: 'Issue description',
                updated: '2024-01-01T00:00:00Z',
                status: { name: 'In Progress' }
              }
            }]
          }
        })
      } as any)

      const results1 = await adapter.search({ query: 'test', fresh: false })
      expect(results1).toHaveLength(1)
      expect(results1[0].title).toBe('Test Issue')

      // Second call - should return cached
      const results2 = await adapter.search({ query: 'test', fresh: false })
      expect(results2).toHaveLength(1)
      expect(results2[0].title).toBe('Test Issue')
      // Should not call API again
      expect(mockedAxios.create).toHaveBeenCalledTimes(1)
    })

    it('should normalize Jira issue data correctly', async () => {
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

      const adapter = jiraAdapterFactory()
      
      mockedAxios.create.mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce({
          data: {
            issues: [{
              key: 'PROJ-456',
              fields: {
                summary: 'Implement Feature',
                description: 'Long description'.repeat(1000),
                updated: '2024-01-01T00:00:00Z',
                status: { name: 'Done' }
              }
            }]
          }
        })
      } as any)

      const results = await adapter.search({ query: 'feature', fresh: false })
      
      expect(results[0]).toMatchObject({
        id: 'PROJ-456',
        provider: 'jira',
        title: 'Implement Feature',
        url: 'https://test.atlassian.net/browse/PROJ-456',
        metadata: { status: 'Done' }
      })
      // Summary should be truncated to 10k chars
      expect(results[0].summary.length).toBeLessThanOrEqual(10000)
    })
  })

  describe('fetchById', () => {
    it('should fetch and normalize a Jira issue by key', async () => {
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

      const adapter = jiraAdapterFactory()
      
      mockedAxios.create.mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce({
          data: {
            key: 'TEST-789',
            fields: {
              summary: 'Test Issue',
              description: 'Issue content',
              updated: '2024-01-01T00:00:00Z',
              status: { name: 'Open' }
            }
          }
        })
      } as any)

      const result = await adapter.fetchById({ id: 'TEST-789', fresh: false })
      
      expect(result).not.toBeNull()
      expect(result?.id).toBe('TEST-789')
      expect(result?.title).toBe('Test Issue')
      expect(result?.url).toBe('https://test.atlassian.net/browse/TEST-789')
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

      const adapter = jiraAdapterFactory()
      
      mockedAxios.create.mockReturnValueOnce({
        get: jest.fn().mockRejectedValueOnce({
          response: { status: 404 }
        })
      } as any)

      const result = await adapter.fetchById({ id: 'NONEXISTENT-1', fresh: false })
      
      expect(result).toBeNull()
    })
  })
})

