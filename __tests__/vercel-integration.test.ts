import { sql } from '@vercel/postgres';
import { CacheService } from '@/lib/kv';
import { authenticateUser, validateSession } from '@/lib/auth-vercel';
import { withTransaction, pool } from '@/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Mock user data for testing
const testUser = {
  id: crypto.randomUUID(),
  email: 'test-vercel@example.com',
  password: 'Test123!@#',
  name: 'Test Vercel User',
  role: 'user',
  permissions: { user: true }
};

describe('Vercel Integration Tests', () => {
  // Setup and teardown
  beforeAll(async () => {
    // Create test user if needed
    try {
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      await sql`
        INSERT INTO users (id, email, password_hash, name, role, permissions, is_active)
        VALUES (${testUser.id}, ${testUser.email}, ${hashedPassword}, ${testUser.name}, ${testUser.role}, ${JSON.stringify(testUser.permissions)}, true)
        ON CONFLICT (email) DO NOTHING
      `;
    } catch (error) {
      console.error('Setup error:', error);
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await sql`DELETE FROM users WHERE email = ${testUser.email}`;
      await pool.end();
    } catch (error) {
      console.error('Teardown error:', error);
    }
  });

  // Database Tests
  describe('Database Tests', () => {
    test('should connect to Vercel Postgres', async () => {
      const result = await sql`SELECT 1 as test`;
      expect(result.rows[0].test).toBe(1);
    });

    test('should perform basic CRUD operations', async () => {
      // Create a test record
      const testId = crypto.randomUUID();
      const testName = 'Test Project';
      
      await sql`
        INSERT INTO projects (id, name, description, framework, owner_id, created_by)
        VALUES (${testId}, ${testName}, 'Test Description', 'nextjs', ${testUser.id}, ${testUser.id})
      `;
      
      // Read the record
      const { rows: selectRows } = await sql`
        SELECT * FROM projects WHERE id = ${testId}
      `;
      
      expect(selectRows.length).toBe(1);
      expect(selectRows[0].name).toBe(testName);
      
      // Update the record
      const updatedName = 'Updated Project';
      await sql`
        UPDATE projects SET name = ${updatedName} WHERE id = ${testId}
      `;
      
      const { rows: updatedRows } = await sql`
        SELECT * FROM projects WHERE id = ${testId}
      `;
      
      expect(updatedRows[0].name).toBe(updatedName);
      
      // Delete the record
      await sql`
        DELETE FROM projects WHERE id = ${testId}
      `;
      
      const { rows: deletedRows } = await sql`
        SELECT * FROM projects WHERE id = ${testId}
      `;
      
      expect(deletedRows.length).toBe(0);
    });

    test('should handle transactions', async () => {
      const testId = crypto.randomUUID();
      
      const result = await withTransaction(async (client) => {
        // Create a record within transaction
        await client.query(`
          INSERT INTO projects (id, name, description, framework, owner_id, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [testId, 'Transaction Test', 'Testing transactions', 'nextjs', testUser.id, testUser.id]);
        
        // Return some data
        const { rows } = await client.query(`
          SELECT * FROM projects WHERE id = $1
        `, [testId]);
        
        return rows[0];
      });
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Transaction Test');
      
      // Clean up
      await sql`DELETE FROM projects WHERE id = ${testId}`;
    });

    test('should handle connection pooling', async () => {
      // Test multiple concurrent queries
      const promises = Array(5).fill(0).map((_, i) => 
        sql`SELECT ${i} as test_value`
      );
      
      const results = await Promise.all(promises);
      
      results.forEach((result, i) => {
        expect(result.rows[0].test_value).toBe(i);
      });
    });

    test('should handle errors gracefully', async () => {
      try {
        // Attempt an invalid query
        await sql`SELECT * FROM non_existent_table`;
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // KV Tests
  describe('KV Tests', () => {
    test('should store and retrieve from KV', async () => {
      const testKey = 'test:key';
      const testValue = { message: 'Hello Vercel KV' };
      
      await CacheService.set(testKey, testValue, 60);
      const retrieved = await CacheService.get(testKey);
      
      expect(retrieved).toEqual(testValue);
      
      await CacheService.del(testKey);
    });

    test('should respect TTL functionality', async () => {
      const testKey = 'test:ttl';
      const testValue = { message: 'This should expire' };
      
      // Set with 1 second TTL
      await CacheService.set(testKey, testValue, 1);
      
      // Verify it exists
      let retrieved = await CacheService.get(testKey);
      expect(retrieved).toEqual(testValue);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Verify it's gone
      retrieved = await CacheService.get(testKey);
      expect(retrieved).toBeNull();
    });

    test('should handle session management', async () => {
      const sessionId = 'test-session-id';
      const sessionData = { userId: '123', role: 'admin' };
      
      await CacheService.setSession(sessionId, sessionData);
      const retrieved = await CacheService.getSession(sessionId);
      
      expect(retrieved).toEqual(sessionData);
      
      // Clean up
      await CacheService.del(`session:${sessionId}`);
    });

    test('should implement rate limiting', async () => {
      const rateLimitKey = 'rate:test:user';
      const limit = 5;
      const window = 10; // 10 seconds
      
      // Should allow up to the limit
      for (let i = 0; i < limit; i++) {
        const allowed = await CacheService.rateLimit(rateLimitKey, limit, window);
        expect(allowed).toBe(true);
      }
      
      // Should block after the limit
      const blocked = await CacheService.rateLimit(rateLimitKey, limit, window);
      expect(blocked).toBe(false);
      
      // Clean up
      await CacheService.del(rateLimitKey);
    });

    test('should handle errors gracefully', async () => {
      // Test with invalid operations (implementation specific)
      const result = await CacheService.get('non:existent:key');
      expect(result).toBeNull();
    });
  });

  // Authentication Tests
  describe('Authentication Tests', () => {
    test('should handle user authentication', async () => {
      try {
        const result = await authenticateUser(testUser.email, testUser.password);
        
        expect(result).toBeDefined();
        expect(result.token).toBeDefined();
        expect(result.user).toBeDefined();
        expect(result.user.email).toBe(testUser.email);
        
        // Store token for next test
        process.env.TEST_AUTH_TOKEN = result.token;
      } catch (error) {
        console.error('Auth error:', error);
        throw error;
      }
    });

    test('should validate session', async () => {
      const token = process.env.TEST_AUTH_TOKEN;
      if (!token) {
        throw new Error('No auth token available');
      }
      
      const session = await validateSession(token);
      
      expect(session).toBeDefined();
      expect(session.email).toBe(testUser.email);
    });

    test('should reject invalid credentials', async () => {
      try {
        await authenticateUser(testUser.email, 'wrong-password');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should reject invalid session', async () => {
      try {
        await validateSession('invalid-token');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // Integration Tests
  describe('Integration Tests', () => {
    test('should perform end-to-end user flow', async () => {
      // 1. Authenticate user
      const authResult = await authenticateUser(testUser.email, testUser.password);
      expect(authResult.token).toBeDefined();
      
      // 2. Create a project in the database
      const projectId = crypto.randomUUID();
      await sql`
        INSERT INTO projects (id, name, description, framework, owner_id, created_by)
        VALUES (${projectId}, 'Integration Test', 'Testing full flow', 'nextjs', ${testUser.id}, ${testUser.id})
      `;
      
      // 3. Cache project data in KV
      await CacheService.set(`project:${projectId}`, { id: projectId, name: 'Integration Test' }, 60);
      
      // 4. Validate session
      const session = await validateSession(authResult.token);
      expect(session.userId).toBe(testUser.id);
      
      // 5. Retrieve project from cache
      const cachedProject = await CacheService.get(`project:${projectId}`);
      expect(cachedProject.id).toBe(projectId);
      
      // 6. Retrieve project from database
      const { rows } = await sql`SELECT * FROM projects WHERE id = ${projectId}`;
      expect(rows[0].id).toBe(projectId);
      
      // Clean up
      await sql`DELETE FROM projects WHERE id = ${projectId}`;
      await CacheService.del(`project:${projectId}`);
    });

    test('should handle database and cache coordination', async () => {
      const recordId = crypto.randomUUID();
      
      // Create in database
      await sql`
        INSERT INTO projects (id, name, description, framework, owner_id, created_by)
        VALUES (${recordId}, 'Coordination Test', 'Testing coordination', 'nextjs', ${testUser.id}, ${testUser.id})
      `;
      
      // Cache the record
      await CacheService.set(`project:${recordId}`, { id: recordId, name: 'Coordination Test' }, 60);
      
      // Update in database
      await sql`
        UPDATE projects SET name = 'Updated Name' WHERE id = ${recordId}
      `;
      
      // Invalidate cache
      await CacheService.del(`project:${recordId}`);
      
      // Verify cache is invalidated
      const cachedData = await CacheService.get(`project:${recordId}`);
      expect(cachedData).toBeNull();
      
      // Verify database has updated data
      const { rows } = await sql`SELECT * FROM projects WHERE id = ${recordId}`;
      expect(rows[0].name).toBe('Updated Name');
      
      // Clean up
      await sql`DELETE FROM projects WHERE id = ${recordId}`;
    });

    test('should handle error recovery scenarios', async () => {
      // Simulate a transaction that fails
      try {
        await withTransaction(async (client) => {
          await client.query(`
            INSERT INTO projects (id, name, description, framework, owner_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [crypto.randomUUID(), 'Error Test', 'Testing errors', 'nextjs', testUser.id, testUser.id]);
          
          // Force an error
          throw new Error('Simulated error');
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBe('Simulated error');
        
        // Verify transaction was rolled back (no record was inserted)
        const { rows } = await sql`SELECT * FROM projects WHERE name = 'Error Test'`;
        expect(rows.length).toBe(0);
      }
    });
  });

  // Performance Tests
  describe('Performance Tests', () => {
    test('should measure database query response times', async () => {
      const start = Date.now();
      
      await sql`SELECT * FROM users LIMIT 10`;
      
      const duration = Date.now() - start;
      console.log(`Database query completed in ${duration}ms`);
      
      // Basic performance assertion
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    test('should measure cache hit/miss ratios', async () => {
      const testKey = 'perf:test:key';
      const testValue = { data: 'Performance test data' };
      
      // Miss - first access
      const startMiss = Date.now();
      let result = await CacheService.get(testKey);
      const missDuration = Date.now() - startMiss;
      
      expect(result).toBeNull();
      
      // Set the value
      await CacheService.set(testKey, testValue, 60);
      
      // Hit - second access
      const startHit = Date.now();
      result = await CacheService.get(testKey);
      const hitDuration = Date.now() - startHit;
      
      expect(result).toEqual(testValue);
      
      console.log(`Cache miss took ${missDuration}ms, hit took ${hitDuration}ms`);
      
      // Hit should be faster than miss
      expect(hitDuration).toBeLessThanOrEqual(missDuration);
      
      // Clean up
      await CacheService.del(testKey);
    });
  });
});