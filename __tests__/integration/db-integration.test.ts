/**
 * Integration Tests for Database Connection Library
 * 
 * These tests require actual database connections and should be run
 * in environments where Vercel Postgres is available.
 * 
 * To run these tests:
 * 1. Set up environment variables for Vercel Postgres
 * 2. Run: npm test -- --testPathPattern=integration
 */

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

// Skip integration tests if no database URL is provided
const skipTests = !process.env.POSTGRES_URL;

describe('Database Integration Tests', () => {
  beforeAll(() => {
    if (skipTests) {
      console.log('⚠️ Skipping integration tests - POSTGRES_URL not set');
    }
  });

  afterAll(async () => {
    if (!skipTests) {
      // Clean up connections
      try {
        await closePool();
      } catch (error) {
        console.error('Error closing pool in afterAll:', error);
      }
    }
  });

  describe('Connection Tests', () => {
    test('should connect to Vercel Postgres', async () => {
      if (skipTests) return;

      const health = await testConnection();
      
      expect(health.isHealthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.latency).toBeLessThan(5000); // Should be under 5 seconds
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.error).toBeUndefined();
    }, 10000);

    test('should perform pool health check', async () => {
      if (skipTests) return;

      const health = await checkPoolHealth();
      
      expect(health.isHealthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.timestamp).toBeInstanceOf(Date);
    }, 10000);
  });

  describe('Query Operations', () => {
    test('should execute simple query', async () => {
      if (skipTests) return;

      const result = await sql`SELECT 1 as test_value, NOW() as current_time`;
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].test_value).toBe(1);
      expect(result.rows[0].current_time).toBeDefined();
    });

    test('should execute query with retry', async () => {
      if (skipTests) return;

      const result = await queryWithRetry('SELECT 2 as retry_test');
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].retry_test).toBe(2);
    });

    test('should handle parameterized queries', async () => {
      if (skipTests) return;

      const testValue = 'integration-test';
      const result = await sql`SELECT ${testValue} as param_test`;
      
      expect(result.rows[0].param_test).toBe(testValue);
    });
  });

  describe('Transaction Management', () => {
    test('should execute successful transaction', async () => {
      if (skipTests) return;

      const result = await withTransaction(async (client) => {
        // Create a temporary table for testing
        await client.query(`
          CREATE TEMPORARY TABLE test_transaction (
            id SERIAL PRIMARY KEY,
            value TEXT
          )
        `);

        // Insert test data
        await client.query(
          'INSERT INTO test_transaction (value) VALUES ($1)',
          ['test-value']
        );

        // Query the data
        const queryResult = await client.query(
          'SELECT * FROM test_transaction WHERE value = $1',
          ['test-value']
        );

        return queryResult.rows[0];
      });

      expect(result).toBeDefined();
      expect(result.value).toBe('test-value');
    }, 15000);

    test('should rollback failed transaction', async () => {
      if (skipTests) return;

      await expect(
        withTransaction(async (client) => {
          // Create a temporary table
          await client.query(`
            CREATE TEMPORARY TABLE test_rollback (
              id SERIAL PRIMARY KEY,
              value TEXT NOT NULL
            )
          `);

          // Insert valid data
          await client.query(
            'INSERT INTO test_rollback (value) VALUES ($1)',
            ['valid-value']
          );

          // This should cause the transaction to fail
          await client.query(
            'INSERT INTO test_rollback (value) VALUES ($1)',
            [null] // This will violate NOT NULL constraint
          );

          return 'should-not-reach-here';
        })
      ).rejects.toThrow();
    }, 15000);
  });

  describe('Pool Management', () => {
    test('should provide pool statistics', () => {
      if (skipTests) return;

      const stats = getPoolStats();
      
      expect(stats.totalCount).toBeGreaterThanOrEqual(0);
      expect(stats.idleCount).toBeGreaterThanOrEqual(0);
      expect(stats.waitingCount).toBeGreaterThanOrEqual(0);
      expect(stats.config.max).toBeGreaterThan(0);
    });

    test('should handle multiple concurrent connections', async () => {
      if (skipTests) return;

      const promises = Array.from({ length: 5 }, (_, i) =>
        sql`SELECT ${i} as connection_test`
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.rows[0].connection_test).toBe(index);
      });
    }, 15000);
  });

  describe('Error Handling', () => {
    test('should handle invalid SQL gracefully', async () => {
      if (skipTests) return;

      await expect(
        sql`INVALID SQL STATEMENT`
      ).rejects.toThrow();
    });

    test('should handle connection errors in health check', async () => {
      if (skipTests) return;

      // Temporarily break the connection string
      const originalUrl = process.env.POSTGRES_URL;
      process.env.POSTGRES_URL = 'invalid-connection-string';

      // This should handle the error gracefully
      const health = await testConnection();
      
      expect(health.isHealthy).toBe(false);
      expect(health.error).toBeDefined();

      // Restore the connection string
      process.env.POSTGRES_URL = originalUrl;
    });
  });

  describe('Performance Tests', () => {
    test('should maintain reasonable query performance', async () => {
      if (skipTests) return;

      const startTime = Date.now();
      
      await sql`SELECT 1`;
      
      const duration = Date.now() - startTime;
      
      // Query should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    test('should handle batch operations efficiently', async () => {
      if (skipTests) return;

      const startTime = Date.now();
      
      // Execute 10 queries in parallel
      const promises = Array.from({ length: 10 }, () =>
        sql`SELECT RANDOM() as random_value`
      );
      
      const results = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(10);
      // Batch should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    }, 10000);
  });
});
