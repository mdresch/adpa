import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import type { PoolClient } from 'pg';
import { z } from 'zod';

// Contract Schema (aligned with OpenAPI specs/schemas/HealthStatus)
const HealthStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.date().or(z.string()),
  metadata: z.record(z.any())
});

export class TestDataFactory {
  constructor(private db: PoolClient) {}

  /**
   * Create a health check record in the database
   */
  async createHealthCheck(overrides?: any) {
    const data = {
      id: faker.string.uuid(),
      status: 'healthy',
      timestamp: new Date(),
      metadata: {},
      ...overrides
    };

    // 1. Contract Validation (Fail-Fast on Factory Drift)
    const validation = HealthStatusSchema.safeParse(data);
    if (!validation.success) {
      throw new Error(`Factory drift detected: ${validation.error.message}`);
    }

    const result = await this.db.query(
      `INSERT INTO health_checks (id, status, timestamp, metadata) 
       VALUES ($1, $2, $3, $4::jsonb) RETURNING *`,
      [data.id, data.status, data.timestamp, JSON.stringify(data.metadata)]
    );

    return result.rows[0];
  }
}
