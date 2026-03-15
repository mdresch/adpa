import request from 'supertest';
import { app } from '../../src/server';
import { pool } from '../../src/database/connection';

describe('Health Endpoint Integration', () => {
  it('should return 200 healthy and persist a record', async () => {
    console.log('🧪 Starting health check persisted records test...');
    const initialRes = await pool.query('SELECT COUNT(*) FROM health_checks');
    const initialCount = parseInt(initialRes.rows[0].count);
    console.log(`🧪 Initial count: ${initialCount}`);

    console.log('🧪 Calling GET /api/health...');
    const response = await request(app).get('/api/health');
    console.log(`🧪 Response status: ${response.status}`);
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');

    console.log('🧪 Verifying record persistence...');
    const finalRes = await pool.query('SELECT COUNT(*) FROM health_checks');
    const finalCount = parseInt(finalRes.rows[0].count);
    console.log(`🧪 Final count: ${finalCount}`);

    expect(finalCount).toBeGreaterThan(initialCount);

    console.log('🧪 Verifying record content...');
    const latestRes = await pool.query('SELECT * FROM health_checks ORDER BY created_at DESC LIMIT 1');
    expect(latestRes.rows[0].status).toBe('healthy');
    expect(latestRes.rows[0].metadata).toBeDefined();
    console.log('🧪 Health check test PASSED');
  }, 60000);


  it('should have isolated database (Template DB Check)', async () => {
      const res = await pool.query("SELECT current_database()");
      const dbName = res.rows[0].current_database;
      expect(dbName).toMatch(/test_db_worker_\d+/);
  });
});
