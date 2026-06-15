// No top-level imports of app or controller to avoid immediate hangs
import request from 'supertest';
import { setInternalPool } from '../../../database/connection';

describe('Authentication Module (#613) - Dynamic Audit', () => {
  let app: any;
  let AuthController: any;
  let pool: any;
  let createTestUser: any;
  let testUser: any;
  const password = 'testpassword123';

  beforeAll(async () => {
    console.log('[AUDIT] Start beforeAll');
    
    try {
      console.log('[AUDIT] Dynamic import of database/connection...');
      const dbModule = await Promise.resolve().then(() => require());
      pool = dbModule.pool;
      console.log('[AUDIT] pool imported');

      console.log('[AUDIT] Dynamic import of factories...');
      const factModule = await Promise.resolve().then(() => require());
      createTestUser = factModule.createTestUser;
      console.log('[AUDIT] factories imported');

      console.log('[AUDIT] Dynamic import of testServer...');
      const serverModule = await Promise.resolve().then(() => require());
      app = serverModule.app;
      console.log('[AUDIT] testServer imported');

      console.log('[AUDIT] Cleaning up users...');
      await pool.query("DELETE FROM users WHERE email LIKE 'auth-test-%'");
      
      console.log('[AUDIT] Creating test user...');
      testUser = await createTestUser({
        email: `auth-test-audit-${Date.now()}@example.com`,
        password_hash: `mocked-hash-${password}`
      });
      console.log('[AUDIT] Setup complete');
    } catch (err: any) {
      console.error('[AUDIT] FAILED setup:', err.message);
      throw err;
    }
  });

  it('should verify the audit passed', () => {
    expect(testUser).toBeDefined();
  });

  it('should login via app', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: password
      });
    expect(res.status).toBe(200);
  });
});
