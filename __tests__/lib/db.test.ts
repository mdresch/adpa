/**
 * Unit Tests for Database Connection Library
 * 
 * Tests all functionality of lib/db.ts including:
 * - Connection establishment
 * - Transaction management
 * - Error handling and retries
 * - Health checks
 * - Pool management
 */

import { jest } from '@jest/globals';

// Mock @vercel/postgres
const mockSql = {
  query: jest.fn(),
};

const mockPool = {
  connect: jest.fn(),
  end: jest.fn(),
  totalCount: 5,
  idleCount: 3,
  waitingCount: 0,
  options: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },
  on: jest.fn(),
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

// Mock the modules
jest.mock('@vercel/postgres', () => ({
  sql: mockSql,
}));

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

// Import after mocking
import {
  sql,
  pool,
  withTransaction,
  testConnection,
  checkPoolHealth,
  queryWithRetry,
  closePool,
  getPoolStats,
  db,
} from '../../lib/db';

describe('Database Connection Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Exports', () => {
    test('should export sql from @vercel/postgres', () => {
      expect(sql).toBe(mockSql);
    });

    test('should export pool instance', () => {
      expect(pool).toBe(mockPool);
    });

    test('should export db utility object', () => {
      expect(db).toBeDefined();
      expect(db.sql).toBe(mockSql);
      expect(db.pool).toBe(mockPool);
    });
  });

  describe('withTransaction', () => {
    test('should execute transaction successfully', async () => {
      const mockCallback = jest.fn().mockResolvedValue('success');
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({});

      const result = await withTransaction(mockCallback);

      expect(result).toBe('success');
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockCallback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    test('should rollback transaction on error', async () => {
      const mockError = new Error('Transaction failed');
      const mockCallback = jest.fn().mockRejectedValue(mockError);
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({});

      await expect(withTransaction(mockCallback, 1)).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should retry transaction on failure', async () => {
      const mockError = new Error('Connection lost');
      const mockCallback = jest.fn()
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValue('success');
      
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({});

      const result = await withTransaction(mockCallback, 3);

      expect(result).toBe('success');
      expect(mockPool.connect).toHaveBeenCalledTimes(3);
      expect(mockCallback).toHaveBeenCalledTimes(3);
    });
  });

  describe('testConnection', () => {
    test('should return healthy status on successful connection', async () => {
      const mockResult = {
        rows: [{
          current_time: '2025-07-22T03:30:00Z',
          db_version: 'PostgreSQL 14.0'
        }]
      };
      // Mock the sql template literal
      Object.assign(mockSql, mockResult);

      const health = await testConnection();

      expect(health.isHealthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.error).toBeUndefined();
    });

    test('should return unhealthy status on connection failure', async () => {
      const mockError = new Error('Connection failed');
      // Reset the mock to throw an error
      Object.assign(mockSql, {
        then: () => Promise.reject(mockError),
        catch: (fn: any) => fn(mockError)
      });

      const health = await testConnection();

      expect(health.isHealthy).toBe(false);
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.error).toBe('Connection failed');
    });
  });

  describe('checkPoolHealth', () => {
    test('should return healthy status for pool', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [{ health_check: 1 }] });

      const health = await checkPoolHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return unhealthy status on pool failure', async () => {
      const mockError = new Error('Pool exhausted');
      mockPool.connect.mockRejectedValue(mockError);

      const health = await checkPoolHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.error).toBe('Pool exhausted');
    });
  });

  describe('queryWithRetry', () => {
    test('should execute query successfully', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockSql.query.mockResolvedValue(mockResult);

      const result = await queryWithRetry('SELECT * FROM users');

      expect(result).toBe(mockResult);
      expect(mockSql.query).toHaveBeenCalledWith('SELECT * FROM users');
    });

    test('should retry query on failure', async () => {
      const mockError = new Error('Query failed');
      const mockResult = { rows: [{ id: 1 }] };
      
      mockSql.query
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValue(mockResult);

      const result = await queryWithRetry('SELECT * FROM users', undefined, 3);

      expect(result).toBe(mockResult);
      expect(mockSql.query).toHaveBeenCalledTimes(3);
    });

    test('should throw error after max retries', async () => {
      const mockError = new Error('Persistent failure');
      mockSql.query.mockRejectedValue(mockError);

      await expect(queryWithRetry('SELECT * FROM users', undefined, 2))
        .rejects.toThrow('Persistent failure');

      expect(mockSql.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pool Management', () => {
    test('should close pool gracefully', async () => {
      mockPool.end.mockResolvedValue(undefined);

      await closePool();

      expect(mockPool.end).toHaveBeenCalledTimes(1);
    });

    test('should throw error if pool close fails', async () => {
      const mockError = new Error('Close failed');
      mockPool.end.mockRejectedValue(mockError);

      await expect(closePool()).rejects.toThrow('Close failed');
    });

    test('should return pool statistics', () => {
      const stats = getPoolStats();

      expect(stats).toEqual({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
        config: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        },
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle connection timeout', async () => {
      const timeoutError = new Error('Connection timeout');
      mockPool.connect.mockRejectedValue(timeoutError);

      const health = await checkPoolHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.error).toBe('Connection timeout');
    });

    test('should handle SQL syntax errors', async () => {
      const syntaxError = new Error('Syntax error');
      mockSql.query.mockRejectedValue(syntaxError);

      await expect(queryWithRetry('INVALID SQL')).rejects.toThrow('Syntax error');
    });
  });
});
