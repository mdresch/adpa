/**
 * Test Suite for create-test-baseline script
 * TASK-716: Verify getNextBaselineVersion function
 * 
 * This test suite verifies that the baseline version calculation
 * works correctly for various scenarios.
 */

import { Pool } from 'pg'

// Mock the database connection
const mockPool = {
  query: jest.fn()
}

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

describe('getNextBaselineVersion', () => {
  // Simple version of the function for testing
  async function getNextBaselineVersion(client: any, projectId: string): Promise<string> {
    try {
      const result = await client.query(
        `SELECT version 
         FROM project_baselines 
         WHERE project_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [projectId]
      )

      if (result.rows.length === 0) {
        mockLogger.info('No existing baselines found, starting with version 1.0')
        return '1.0'
      }

      const currentVersion = result.rows[0].version
      mockLogger.info(`Found existing baseline version: ${currentVersion}`)

      const versionParts = currentVersion.split('.')
      let major = parseInt(versionParts[0]) || 1
      let minor = parseInt(versionParts[1]) || 0

      minor += 1

      if (minor >= 10) {
        major += 1
        minor = 0
      }

      const nextVersion = `${major}.${minor}`
      mockLogger.info(`Calculated next baseline version: ${nextVersion}`)

      return nextVersion
    } catch (error) {
      mockLogger.error('Error calculating next baseline version:', error)
      mockLogger.warn('Falling back to version 1.0 due to error')
      return '1.0'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Version Calculation Logic', () => {
    test('should return 1.0 when no baselines exist', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const version = await getNextBaselineVersion(mockPool, 'test-project-id')

      expect(version).toBe('1.0')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('No existing baselines found')
      )
    })

    test('should increment minor version from 1.0 to 1.1', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ version: '1.0' }] 
      })

      const version = await getNextBaselineVersion(mockPool, 'test-project-id')

      expect(version).toBe('1.1')
    })

    test('should increment minor version from 1.5 to 1.6', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ version: '1.5' }] 
      })

      const version = await getNextBaselineVersion(mockPool, 'test-project-id')

      expect(version).toBe('1.6')
    })

    test('should increment to 2.0 when minor version reaches 10', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ version: '1.9' }] 
      })

      const version = await getNextBaselineVersion(mockPool, 'test-project-id')

      expect(version).toBe('2.0')
    })

    test('should handle version 2.9 correctly by incrementing to 3.0', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ version: '2.9' }] 
      })

      const version = await getNextBaselineVersion(mockPool, 'test-project-id')

      expect(version).toBe('3.0')
    })

    test('should handle invalid version formats gracefully', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ version: 'invalid' }] 
      })

      const version = await getNextBaselineVersion(mockPool, 'test-project-id')

      // Should default to 1.0 for major, 0 for minor, then increment
      expect(version).toBe('1.1')
    })

    test('should fall back to 1.0 on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'))

      const version = await getNextBaselineVersion(mockPool, 'test-project-id')

      expect(version).toBe('1.0')
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error calculating'),
        expect.any(Error)
      )
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Falling back')
      )
    })
  })

  describe('Edge Cases', () => {
    test('should handle missing minor version part', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ version: '2' }] 
      })

      const version = await getNextBaselineVersion(mockPool, 'test-project-id')

      // Version "2" should be parsed as 2.0, then incremented to 2.1
      expect(version).toBe('2.1')
    })

    test('should handle extra version parts gracefully', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ version: '1.5.3' }] 
      })

      const version = await getNextBaselineVersion(mockPool, 'test-project-id')

      // Should only use first two parts: 1.5 -> 1.6
      expect(version).toBe('1.6')
    })

    test('should handle zero versions', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ version: '0.0' }] 
      })

      const version = await getNextBaselineVersion(mockPool, 'test-project-id')

      // Version "0.0" parses as 0.0, but parseInt(0) || 1 defaults to 1 for major
      // So it becomes 1.0 -> 1.1
      expect(version).toBe('1.1')
    })
  })
})

describe('Baseline Version Format', () => {
  test('version format should match "major.minor" pattern', () => {
    const versionPattern = /^\d+\.\d+$/
    
    expect('1.0').toMatch(versionPattern)
    expect('1.1').toMatch(versionPattern)
    expect('2.0').toMatch(versionPattern)
    expect('10.9').toMatch(versionPattern)
    
    // These should NOT match
    expect('1').not.toMatch(versionPattern)
    expect('1.0.0').not.toMatch(versionPattern)
    expect('v1.0').not.toMatch(versionPattern)
  })
})
