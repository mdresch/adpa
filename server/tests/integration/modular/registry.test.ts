import request from 'supertest';
import { app } from '../../../src/server';

/**
 * Registry Integration Test
 * Verifies that the Route Auto-Discovery mechanism correctly mounts modular routes.
 */
describe('Modular Route Registry Integration', () => {
  
  it('should auto-discover and mount the modular Projects test route at /api/v1/projects/modular-test', async () => {
    const response = await request(app).get('/api/v1/projects/modular-test');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      message: 'Modular Projects Route is Live!',
      module: 'Projects',
      version: 'v1'
    }));
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should still support legacy monolithic routes (co-existence check)', async () => {
    // The legacy /api/projects route is protected. 
    // A 401 Unauthorized status confirms the route is registered and the middleware is active.
    // A 404 Not Found would indicate the route was incorrectly displaced or not registered.
    const response = await request(app).get('/api/projects');
    expect(response.status).toBe(401); 
  });

  it('should correctly mount routes with version prefixes', async () => {
    // Verify the v1 prefix is correctly applied by the registry
    const response = await request(app).get('/api/v1/projects/modular-test');
    expect(response.status).toBe(200);
    
    // Non-existent version should 404
    const badResponse = await request(app).get('/api/v2/projects/modular-test');
    expect(badResponse.status).toBe(404);
  });
});
