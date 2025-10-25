// @ts-nocheck
import { jest } from '@jest/globals'

// Mock dependencies used by the service
const queryMock = jest.fn()

jest.mock('../../database/connection', () => ({
  pool: { query: queryMock },
}))

jest.mock('../../utils/redis', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
  },
}))

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  childLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}))

// Import after mocks
import { getRiskMetrics } from '../../services/programMetricsService'

describe('getRiskMetrics - NULL severity safeguard', () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it('maps NULL severity to low and groups by COALESCE', async () => {
    queryMock.mockImplementationOnce(async (sql: string, params: any[]) => {
      expect(typeof sql).toBe('string')
      expect(sql).toContain("GROUP BY COALESCE(r.severity, 'low')")
      expect(params).toEqual(['program-xyz'])
      return {
        rows: [
          { severity: null, count: '3' },
          { severity: 'high', count: '2' },
        ],
      }
    })

    const result = await getRiskMetrics('program-xyz')

    expect(result).toEqual({
      total: 5,
      critical: 0,
      high: 2,
      medium: 0,
      low: 3,
    })
  })

  it("combines explicit 'low' severities with NULL into the same bucket", async () => {
    queryMock.mockImplementationOnce(async (sql: string, params: any[]) => {
      expect(sql).toContain("GROUP BY COALESCE(r.severity, 'low')")
      return {
        rows: [
          // Database returned two groups after COALESCE: 'low' and 'high'
          { severity: 'low', count: '4' }, // already combined on DB side
          { severity: 'high', count: '1' },
        ],
      }
    })

    const result = await getRiskMetrics('program-xyz')

    expect(result.low).toBe(4)
    expect(result.high).toBe(1)
    expect(result.medium).toBe(0)
    expect(result.critical).toBe(0)
    expect(result.total).toBe(5)
  })

  it('normalizes mixed-case severities into correct buckets', async () => {
    queryMock.mockImplementationOnce(async (sql: string) => {
      expect(sql).toContain("GROUP BY COALESCE(r.severity, 'low')")
      return {
        rows: [
          { severity: 'High', count: '2' },
          { severity: 'MEDIUM', count: '3' },
          { severity: 'critical', count: '1' },
          { severity: 'LoW', count: '4' },
        ],
      }
    })

    const result = await getRiskMetrics('program-xyz')

    expect(result).toEqual({
      total: 10,
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    })
  })
})
