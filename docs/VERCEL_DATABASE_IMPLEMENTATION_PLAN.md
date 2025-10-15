# Implementation Plan: Setting up Vercel Postgres and Vercel KV

## Overview
This plan will guide you through migrating your current PostgreSQL and Redis setup to Vercel's serverless database solutions while maintaining your existing functionality.

## Current State Analysis
Your project currently has:
- ✅ Next.js 14.2.30 frontend
- ✅ Express.js backend with PostgreSQL (pg) and Redis connections
- ✅ Comprehensive database schema with users, projects, documents, templates, etc.
- ✅ Docker Compose setup for local development
- ✅ Database migrations and seeding scripts

## Phase 1: Vercel Postgres Setup

### Step 1.1: Install Vercel Postgres Dependencies
```bash
# Frontend dependencies
npm install @vercel/postgres

# Backend dependencies (if keeping Express server)
cd server
npm install @vercel/postgres
```

### Step 1.2: Create Vercel Postgres Database
1. **Via Vercel Dashboard:**
   - Go to your Vercel project dashboard
   - Navigate to "Storage" tab
   - Click "Create Database" → "Postgres"
   - Choose your region (closest to your users)
   - Database will be created and connection details provided

2. **Via Vercel CLI:**
   ```bash
   vercel env add POSTGRES_URL
   vercel env add POSTGRES_PRISMA_URL
   vercel env add POSTGRES_URL_NON_POOLING
   vercel env add POSTGRES_USER
   vercel env add POSTGRES_HOST
   vercel env add POSTGRES_PASSWORD
   vercel env add POSTGRES_DATABASE
   ```

### Step 1.3: Update Environment Variables
Create/update `.env.local` for frontend:
```env
# Vercel Postgres (automatically populated by Vercel)
POSTGRES_URL="postgres://username:password@host:5432/database"
POSTGRES_PRISMA_URL="postgres://username:password@host:5432/database?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgres://username:password@host:5432/database"
POSTGRES_USER="username"
POSTGRES_HOST="host"
POSTGRES_PASSWORD="password"
POSTGRES_DATABASE="database"
```

### Step 1.4: Create Database Connection Utility
**File: `lib/db.ts`**
```typescript
import { sql } from '@vercel/postgres';
import { Pool } from 'pg';

// For serverless functions (recommended)
export { sql };

// For traditional connection pooling (if needed)
export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Helper function for transactions
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Step 1.5: Create Migration Script for Vercel Postgres
**File: `scripts/migrate-to-vercel.ts`**
```typescript
import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function migrateToVercel() {
  try {
    console.log('🚀 Starting Vercel Postgres migration...');
    
    // Read your existing schema
    const schemaPath = join(process.cwd(), 'server/src/database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Execute schema (Vercel Postgres supports full PostgreSQL)
    await sql.query(schema);
    
    console.log('✅ Schema migration completed');
    
    // Run your existing seed data
    await seedVercelDatabase();
    
    console.log('✅ Data seeding completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function seedVercelDatabase() {
  // Adapt your existing seed.ts logic here
  // Example:
  const adminId = "3a82e0e8-c54d-4f99-b1d7-e651ce101341";
  
  await sql`
    INSERT INTO users (id, email, password_hash, name, role, permissions)
    VALUES (${adminId}, 'admin@adpa.com', ${'hashed_password'}, 'Admin User', 'admin', ${'{"admin": true}'})
    ON CONFLICT (email) DO NOTHING
  `;
}
```

## Phase 2: Vercel KV Setup

### Step 2.1: Install Vercel KV Dependencies
```bash
# Frontend
npm install @vercel/kv

# Backend (if needed)
cd server
npm install @vercel/kv
```

### Step 2.2: Create Vercel KV Database
1. **Via Vercel Dashboard:**
   - Go to "Storage" tab in your project
   - Click "Create Database" → "KV"
   - Choose your region
   - Connection details will be provided

2. **Environment Variables (auto-populated):**
   ```env
   KV_URL="redis://..."
   KV_REST_API_URL="https://..."
   KV_REST_API_TOKEN="..."
   KV_REST_API_READ_ONLY_TOKEN="..."
   ```

### Step 2.3: Create KV Utility Functions
**File: `lib/kv.ts`**
```typescript
import { kv } from '@vercel/kv';

// Cache utilities
export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      return await kv.get<T>(key);
    } catch (error) {
      console.error('KV get error:', error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await kv.setex(key, ttl, JSON.stringify(value));
      } else {
        await kv.set(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('KV set error:', error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await kv.del(key);
    } catch (error) {
      console.error('KV del error:', error);
    }
  }

  // Session management
  static async setSession(sessionId: string, data: any, ttl = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  static async getSession<T>(sessionId: string): Promise<T | null> {
    return await this.get<T>(`session:${sessionId}`);
  }

  // Rate limiting
  static async rateLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await kv.incr(key);
    if (current === 1) {
      await kv.expire(key, window);
    }
    return current <= limit;
  }
}
```

## Phase 3: Update Application Code

### Step 3.1: Update API Routes for Serverless
**File: `app/api/users/route.ts`**
```typescript
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { CacheService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const cached = await CacheService.get('users:all');
    if (cached) {
      return NextResponse.json(cached);
    }

    // Query database
    const { rows } = await sql`
      SELECT id, email, name, role, created_at 
      FROM users 
      WHERE is_active = true
      ORDER BY created_at DESC
    `;

    // Cache for 5 minutes
    await CacheService.set('users:all', rows, 300);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, role } = body;

    const { rows } = await sql`
      INSERT INTO users (email, name, role)
      VALUES (${email}, ${name}, ${role})
      RETURNING id, email, name, role, created_at
    `;

    // Invalidate cache
    await CacheService.del('users:all');

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

### Step 3.2: Update Authentication with KV Sessions
**File: `lib/auth.ts`**
```typescript
import { sql } from '@vercel/postgres';
import { CacheService } from './kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function authenticateUser(email: string, password: string) {
  try {
    const { rows } = await sql`
      SELECT id, email, password_hash, name, role, permissions
      FROM users 
      WHERE email = ${email} AND is_active = true
    `;

    if (rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions
    };

    // Store in KV with 24 hour expiry
    await CacheService.setSession(sessionId, sessionData, 86400);

    // Create JWT token
    const token = jwt.sign(
      { sessionId, userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return { token, user: sessionData };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

export async function validateSession(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const sessionData = await CacheService.getSession(decoded.sessionId);
    
    if (!sessionData) {
      throw new Error('Session expired');
    }

    return sessionData;
  } catch (error) {
    throw new Error('Invalid session');
  }
}
```

### Step 3.3: Update Data Access Patterns
**File: `lib/data/projects.ts`**
```typescript
import { sql } from '@vercel/postgres';
import { CacheService } from '@/lib/kv';

export class ProjectService {
  static async getProjects(userId: string) {
    const cacheKey = `projects:user:${userId}`;

    // Try cache first
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    // Query database
    const { rows } = await sql`
      SELECT p.*, u.name as owner_name
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.owner_id = ${userId} OR ${userId} = ANY(
        SELECT jsonb_array_elements_text(p.team_members)
      )
      ORDER BY p.updated_at DESC
    `;

    // Cache for 10 minutes
    await CacheService.set(cacheKey, rows, 600);

    return rows;
  }

  static async createProject(projectData: any, userId: string) {
    const { rows } = await sql`
      INSERT INTO projects (name, description, framework, owner_id, created_by)
      VALUES (${projectData.name}, ${projectData.description}, ${projectData.framework}, ${userId}, ${userId})
      RETURNING *
    `;

    // Invalidate user's project cache
    await CacheService.del(`projects:user:${userId}`);

    return rows[0];
  }

  static async updateProject(projectId: string, updates: any, userId: string) {
    const { rows } = await sql`
      UPDATE projects
      SET name = ${updates.name},
          description = ${updates.description},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${projectId} AND (owner_id = ${userId} OR created_by = ${userId})
      RETURNING *
    `;

    // Invalidate caches
    await CacheService.del(`projects:user:${userId}`);
    await CacheService.del(`project:${projectId}`);

    return rows[0];
  }
}
```

## Phase 4: Environment Configuration

### Step 4.1: Update Next.js Configuration
**File: `next.config.mjs`**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable experimental features for better serverless performance
  experimental: {
    serverComponentsExternalPackages: ['@vercel/postgres'],
  },
}

export default nextConfig
```

### Step 4.2: Update Package.json Scripts
```json
{
  "scripts": {
    "build": "next build",
    "dev": "next dev",
    "lint": "next lint",
    "start": "next start",
    "migrate:vercel": "tsx scripts/migrate-to-vercel.ts",
    "seed:vercel": "tsx scripts/seed-vercel.ts"
  }
}
```

## Phase 5: Migration Strategy

### Step 5.1: Gradual Migration Approach
1. **Dual Setup Phase:**
   - Keep existing PostgreSQL/Redis for development
   - Set up Vercel Postgres/KV for production
   - Use environment variables to switch between them

2. **Testing Phase:**
   - Deploy to Vercel staging environment
   - Run migration scripts
   - Test all functionality
   - Performance testing

3. **Production Migration:**
   - Schedule maintenance window
   - Export data from current database
   - Import to Vercel Postgres
   - Switch DNS/environment variables
   - Monitor and rollback if needed

### Step 5.2: Data Migration Script
**File: `scripts/migrate-data.ts`**
```typescript
import { sql as vercelSql } from '@vercel/postgres';
import { pool as currentPool } from '../server/src/database/connection';

export async function migrateData() {
  console.log('🔄 Starting data migration...');

  try {
    // Migrate users
    const users = await currentPool.query('SELECT * FROM users');
    for (const user of users.rows) {
      await vercelSql`
        INSERT INTO users (id, email, password_hash, name, role, permissions, created_at, updated_at)
        VALUES (${user.id}, ${user.email}, ${user.password_hash}, ${user.name}, ${user.role}, ${user.permissions}, ${user.created_at}, ${user.updated_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✅ Migrated ${users.rows.length} users`);

    // Migrate projects
    const projects = await currentPool.query('SELECT * FROM projects');
    for (const project of projects.rows) {
      await vercelSql`
        INSERT INTO projects (id, name, description, framework, status, priority, start_date, end_date, budget, owner_id, created_by, team_members, settings, metadata, created_at, updated_at)
        VALUES (${project.id}, ${project.name}, ${project.description}, ${project.framework}, ${project.status}, ${project.priority}, ${project.start_date}, ${project.end_date}, ${project.budget}, ${project.owner_id}, ${project.created_by}, ${project.team_members}, ${project.settings}, ${project.metadata}, ${project.created_at}, ${project.updated_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✅ Migrated ${projects.rows.length} projects`);

    // Continue for other tables...

    console.log('🎉 Data migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
```

## Phase 6: Testing and Validation

### Step 6.1: Create Test Suite
**File: `__tests__/vercel-integration.test.ts`**
```typescript
import { sql } from '@vercel/postgres';
import { CacheService } from '@/lib/kv';

describe('Vercel Integration Tests', () => {
  test('should connect to Vercel Postgres', async () => {
    const result = await sql`SELECT 1 as test`;
    expect(result.rows[0].test).toBe(1);
  });

  test('should store and retrieve from KV', async () => {
    const testKey = 'test:key';
    const testValue = { message: 'Hello Vercel KV' };

    await CacheService.set(testKey, testValue, 60);
    const retrieved = await CacheService.get(testKey);

    expect(retrieved).toEqual(testValue);

    await CacheService.del(testKey);
  });

  test('should handle user authentication', async () => {
    // Test your auth flow
  });
});
```

### Step 6.2: Performance Monitoring
**File: `lib/monitoring.ts`**
```typescript
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      console.log(`⚡ ${operation} completed in ${duration}ms`);
      resolve(result);
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`❌ ${operation} failed after ${duration}ms:`, error);
      reject(error);
    }
  });
}
```

## Phase 7: Deployment and Monitoring

### Step 7.1: Vercel Deployment Configuration
**File: `vercel.json`**
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Step 7.2: Health Check Endpoints
**File: `app/api/health/route.ts`**
```typescript
import { sql } from '@vercel/postgres';
import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test database connection
    const dbResult = await sql`SELECT 1 as db_status`;

    // Test KV connection
    await kv.set('health:check', Date.now(), { ex: 60 });
    const kvResult = await kv.get('health:check');

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbResult.rows[0].db_status === 1 ? 'connected' : 'error',
        cache: kvResult ? 'connected' : 'error'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

## Summary

This implementation plan provides:

1. **Seamless Migration**: Gradual transition from your current setup to Vercel's serverless databases
2. **Performance Optimization**: Leveraging edge caching and connection pooling
3. **Scalability**: Automatic scaling with serverless architecture
4. **Cost Efficiency**: Pay-per-use model with generous free tiers
5. **Developer Experience**: Integrated dashboard and automatic environment variable management

The migration maintains your existing functionality while providing the benefits of Vercel's globally distributed, serverless database infrastructure.
