import { sql, pool, withTransaction, executeQuery, checkDatabaseHealth } from '../db';
import { Pool, PoolClient } from 'pg';

// Mock the pg Pool and sql from @vercel/postgres
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

jest.mock('@vercel/postgres', () => ({
  sql: {
    query: jest.fn(),
  },
}));

describe('Database Connection Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection establishment', () => {
    it('should establish a connection using the pool', async () => {
      const mockClient = await pool.connect();
      mockClient.query.mockResolvedValueOnce({ rows: [{ test: 1 }] });
      
      const result = await executeQuery('SELECT 1 as test');
      
      expect(pool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1 as test', []);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual([{ test: 1 }]);
    });
  });

  describe('Transaction management', () => {
    it('should execute queries within a transaction and commit on success', async () => {
      const mockClient = await pool.connect();
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'COMMIT') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [{ result: 'success' }] });
      });

      const callback = jest.fn().mockImplementation(async (client: PoolClient) => {
        const result = await client.query('INSERT INTO test VALUES (1)');
        return result.rows[0];
      });

      const result = await withTransaction(callback);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual({ result: 'success' });
    });

    it('should rollback transaction on error', async () => {
      const mockClient = await pool.connect();
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      const error = new Error('Transaction failed');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(withTransaction(callback)).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Health check', () => {
    it('should return connected status when database is healthy', async () => {
      (sql as any).mockResolvedValueOnce({ rows: [{ test: 1 }] });
      
      const result = await checkDatabaseHealth();
      
      expect(result.status).toBe('connected');
      expect(result).toHaveProperty('latency');
      expect(result).toHaveProperty('timestamp');
    });

    it('should return error status when database connection fails', async () => {
      const error = new Error('Connection failed');
      (sql as any).mockRejectedValueOnce(error);
      
      const result = await checkDatabaseHealth();
      
      expect(result.status).toBe('error');
      expect(result.error).toBe('Connection failed');
      expect(result).toHaveProperty('timestamp');
    });
  });
});