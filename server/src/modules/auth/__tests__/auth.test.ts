jest.mock('../../../utils/redis', () => ({
  cache: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
  redisClient: { on: jest.fn(), connect: jest.fn(), quit: jest.fn() }
}));

jest.mock('../../../services/jobs/queue/RabbitQueueAdapter', () => ({
  RabbitQueueAdapter: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    process: jest.fn(),
    add: jest.fn(),
    close: jest.fn()
  })),
  createRabbitConnection: jest.fn().mockReturnValue({
    on: jest.fn(),
    close: jest.fn(),
    createChannel: jest.fn().mockReturnValue({
      on: jest.fn(),
      close: jest.fn(),
      addSetup: jest.fn()
    })
  })
}));

jest.mock('../../../utils/neo4j', () => ({
  getNeo4jDriver: jest.fn().mockReturnValue(null),
  getNeo4jDatabase: jest.fn().mockReturnValue('neo4j'),
  isNeo4jConfigured: jest.fn().mockReturnValue(false),
  connectNeo4j: jest.fn().mockResolvedValue(undefined),
  disconnectNeo4j: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../../services/queueService', () => ({
  initializeQueues: jest.fn().mockResolvedValue(undefined),
  queueService: { addJob: jest.fn() },
  getQueueServiceInstance: jest.fn(),
  addJob: jest.fn(),
  getJobStatus: jest.fn(),
  cancelJob: jest.fn(),
  updateJobStatus: jest.fn(),
  resetQueueService: jest.fn(),
  setQueueService: jest.fn()
}));

jest.mock('../../../routes/registry', () => ({
  registerRoutes: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../../startup/serverBootstrap', () => ({
  initializeServerWithDependencyGraph: jest.fn().mockResolvedValue(undefined)
}));

import request from 'supertest';
import { app } from '../../../server';
import { createTestUser } from '../../../__tests__/factories';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

describe('Authentication Module (#613)', () => {
  let testUser: any;
  const password = 'password123';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(password, 12);
    testUser = await createTestUser({ email: 'auth-test@example.com', password_hash: passwordHash });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should fail login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should fail login with non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.id).toBe(testUser.id);
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should fail with expired token', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token expired');
    });

    it('should fail with tampered token', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return a new token with valid existing token', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.token).not.toBe(token);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });
});
