import request from 'supertest';
import { app } from '../../../src/server';
import { pool } from '../../../src/database/connection';
import bcrypt from 'bcryptjs';

jest.setTimeout(300000);

describe('Projects CRUD Journey (Integration)', () => {
  const testUser = {
    id: '',
    email: 'test-projects@adpa.io',
    password: 'password123',
    name: 'Test Project User'
  };
  let token: string;

  beforeAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    
    // Create user
    const passwordHash = await bcrypt.hash(testUser.password, 12);
    const userRes = await pool.query(
      'INSERT INTO users (email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [testUser.email, passwordHash, testUser.name, 'super_admin', true]
    );
    testUser.id = userRes.rows[0].id;

    // Login to get token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    token = loginRes.body.token;
  });

  describe('Project CRUD', () => {
    let projectId: string;
    const projectData = {
      name: 'Test Project Alpha',
      description: 'A test project for integration verification',
      status: 'active',
      framework: 'PMBOK'
    };

    it('should create a new project', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.project.name).toBe(projectData.name);
      expect(response.body.project).toHaveProperty('id');
      projectId = response.body.project.id;
    });

    it('should list projects including the new one', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.projects)).toBe(true);
      const found = response.body.projects.find((p: any) => p.id === projectId);
      expect(found).toBeDefined();
      expect(found.name).toBe(projectData.name);
    });

    it('should get project by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.project.id).toBe(projectId);
      expect(response.body.project.name).toBe(projectData.name);
    });

    it('should update project details', async () => {
      const updatedData = {
        name: 'Updated Project Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.project.name).toBe(updatedData.name);
      expect(response.body.project.description).toBe(updatedData.description);
    });

    it('should delete the project', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getResponse.status).toBe(404);
    });
  });
});
