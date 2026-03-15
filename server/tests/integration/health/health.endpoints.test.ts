import request from 'supertest';
import { app } from '../../../src/server';
import { TestDataFactory } from '../../factories/data-factory';
import { pool as internalPool } from '../../../src/database/connection';

describe('Health Endpoints (Full DAG) Integration', () => {
  let factory: TestDataFactory;

  beforeAll(async () => {
    // app.locals.pool is already set by integration-setup.ts before tests start
    factory = new TestDataFactory(app.locals.pool);
  });

  describe('GET /api/health/ready', () => {
    it('should return 200 when database is healthy', async () => {
      const response = await request(app)
        .get('/api/health/ready')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Template Database Worker Isolation', () => {
    it('should verify it is running in its own isolated worker database', async () => {
      const result = await app.locals.pool.query('SELECT current_database()');
      const dbName = result.rows[0].current_database;
      
      const workerId = process.env.JEST_WORKER_ID || '1';
      expect(dbName).toBe(`test_db_worker_${workerId}`);
      console.log(`[Test] Running in isolated DB: ${dbName}`);
    });

    it('should persist and retrieve health check records', async () => {
      // Create a record using factory
      const data = await factory.createHealthCheck({
        metadata: { 
          complexity: 'high',
          test_case: 'isolation_p1'
        }
      });

      expect(data).toBeDefined();
      expect(data.metadata.complexity).toBe('high');
      
      // Verify direct database access works through the same transaction/connection
      const result = await app.locals.pool.query('SELECT * FROM health_checks WHERE id = $1', [data.id]);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].metadata.test_case).toBe('isolation_p1');
    });

    it('should have a clean slate in the next test (transaction rollback verification)', async () => {
      // Even with worker isolation, we still use transaction rollbacks for speed within the worker.
      const result = await app.locals.pool.query('SELECT COUNT(*) FROM health_checks');
      expect(result.rows[0].count).toBe('0');
    });
  });
});
