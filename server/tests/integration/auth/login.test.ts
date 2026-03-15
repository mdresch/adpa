import request from 'supertest';
import { app } from '../../../src/server';
import { pool } from '../../../src/database/connection';
import bcrypt from 'bcryptjs';

jest.setTimeout(300000);

describe('Auth Journey (Integration)', () => {
  const testUser = {
    email: 'test-auth@adpa.io',
    password: 'password123',
    name: 'Test Auth User'
  };

  beforeAll(async () => {
    // Clean up if user exists from a previous failed run (though Template DB should prevent this)
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    
    // Create a user for login tests
    const passwordHash = await bcrypt.hash(testUser.password, 12);
    await pool.query(
      'INSERT INTO users (email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5)',
      [testUser.email, passwordHash, testUser.name, 'user', true]
    );
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@adpa.io',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      // First login to get token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      const token = loginRes.body.token;

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should fail without token', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
    });
  });
});
