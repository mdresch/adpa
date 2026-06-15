import express from 'express';
import request from 'supertest';
import healthRoutes, { initializeDependencyHealthTracking, updateDependencyHealth } from '../health';

const mockSafeQuery = jest.fn();

jest.mock('../../services/jobs/dbGuards', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
}));

describe('Health Endpoints Verification', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use('/health', healthRoutes);
    
    // Initialize with standard dependencies
    initializeDependencyHealthTracking(['Database', 'Redis', 'Neo4j', 'Pinecone']);
  });

  beforeEach(() => {
    mockSafeQuery.mockReset();
    mockSafeQuery.mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 });
  });

  it('GET /health/live should return live status', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('live');
    expect(res.body.message).toBe('Server is alive');
  });

  it('GET /health/ready should return 200 when SELECT 1 succeeds even if Database registry is unknown', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(mockSafeQuery).toHaveBeenCalled();
  });

  it('GET /health/ready should return 503 when SELECT 1 fails', async () => {
    mockSafeQuery.mockResolvedValue(null);

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unhealthy');
    expect(res.body.failedDependencies.some((d: { name: string }) => d.name === 'Database')).toBe(true);
  });

  it('GET /health/ready should return 503 when Database registry is unhealthy', async () => {
    updateDependencyHealth('Database', 'unhealthy', 0, 'connection refused');

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unhealthy');
    expect(res.body.failedDependencies.some((d: { name: string }) => d.name === 'Database')).toBe(true);
  });

  it('GET /health/ready should return 200 when Database is healthy (optional deps may fail)', async () => {
    updateDependencyHealth('Database', 'healthy', 10);
    updateDependencyHealth('Redis', 'healthy', 5);
    updateDependencyHealth('Neo4j', 'unhealthy', 0, 'Error: Neo4j connectivity timeout');

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /health/dependencies should show all registered dependencies', async () => {
    const res = await request(app).get('/health/dependencies');
    expect(res.status).toBe(200);
    expect(res.body.dependencies.length).toBeGreaterThanOrEqual(4);
    
    const db = res.body.dependencies.find((d: any) => d.name === 'Database');
    expect(db.status).toBe('healthy');
  });

  it('GET /health/full should return comprehensive status', async () => {
    updateDependencyHealth('Database', 'healthy', 10);
    updateDependencyHealth('Redis', 'healthy', 5);
    updateDependencyHealth('Neo4j', 'healthy', 5);
    updateDependencyHealth('Pinecone', 'healthy', 5);

    const res = await request(app).get('/health/full');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.systemMetrics).toBeDefined();
  });
});
