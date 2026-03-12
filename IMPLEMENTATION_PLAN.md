# Implementation Plan: ADPA Technical Improvements

**Created**: March 11, 2026  
**Duration**: 12 weeks (3 months)  
**Total Effort**: 120-160 hours  
**Priority**: Critical path first, then scale

---

## Executive Summary

This plan addresses the key findings from the Server Startup Analysis and Technical Assessment. The improvements focus on:

1. **Stabilizing core systems** (Week 1-2)
2. **Refactoring architecture** (Week 3-6)
3. **Adding test coverage** (Week 5-8)
4. **Improving operations** (Week 7-12)
5. **Polishing and optimizing** (Week 9-12)

**Expected Outcomes**:
- ✅ 75% reduction in debugging time
- ✅ 90% faster developer onboarding
- ✅ 50% fewer production incidents
- ✅ Confident refactoring without breaking changes
- ✅ Comprehensive test coverage (60%+)

---

## Phase 1: Stabilization (Weeks 1-2)

### Goal
Get the system to a known-good state and eliminate critical issues.

### 1.1: Fix TLS Certificate Verification

**Issue**: NODE_TLS_REJECT_UNAUTHORIZED='0' disabled in development, must not leak to production

**Tasks**:
- [ ] Review `.env.local.example` (ensure no '0' values in defaults)
- [ ] Review `.env.production` (verify '0' not set)
- [ ] Update `.env.development` to document development-only settings
- [ ] Add validation to startup: throw error if TLS disabled in production

**Implementation**:

```typescript
// server/src/startup/validateConfig.ts
export function validateSecurityConfig() {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      console.error('❌ CRITICAL: TLS verification disabled in production')
      process.exit(1)
    }
  }
  console.log('✅ Security config valid')
}
```

```bash
# .env.development
NODE_TLS_REJECT_UNAUTHORIZED=0  # Development only!

# .env.production
# NODE_TLS_REJECT_UNAUTHORIZED must not be set (default: 1)
```

**Timeline**: 1-2 hours  
**Owner**: Backend lead  
**Risk**: Low (config-only change)

---

### 1.2: Fix Database Connection Race Condition

**Issue**: Multiple "waiting..." logs indicate routes initialize before DB is ready

**Root Cause**: Route files loaded before database connection completes

**Tasks**:
- [ ] Audit `server/src/server.ts` initialization order
- [ ] Find which routes trigger DB queries during require/load
- [ ] Defer route registration until DB is confirmed ready
- [ ] Add explicit database readiness check

**Implementation**:

```typescript
// server/src/startup/database.ts
export async function connectDatabase(): Promise<void> {
  const startTime = Date.now()
  const maxRetries = 3
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await pool.query('SELECT 1')
      console.log(`✅ Database connected (${Date.now() - startTime}ms)`)
      return
    } catch (err) {
      console.warn(`⚠️  DB connection attempt ${i + 1}/${maxRetries} failed`, err.message)
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }
  
  throw new Error('Failed to connect to database after 3 attempts')
}

// server/src/server.ts
async function startServer() {
  try {
    // STEP 1: Connect to dependencies first
    console.log('🔧 Initializing dependencies...')
    await connectDatabase()
    await connectRedis()
    await connectNeo4j()
    
    // STEP 2: Only then register routes
    console.log('📍 Registering routes...')
    registerRoutes(app)
    
    // STEP 3: Start workers
    console.log('⚙️  Starting workers...')
    await startWorkers()
    
    // STEP 4: Listen
    server.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`)
    })
  } catch (err) {
    console.error('❌ Startup failed:', err.message)
    process.exit(1)
  }
}

startServer()
```

**Timeline**: 3-4 hours  
**Owner**: Backend lead  
**Risk**: Medium (touches startup sequence)  
**Testing**: Run `npm run dev` and verify no "waiting..." logs

---

### 1.3: Create Health Check Endpoints

**Issue**: No liveness/readiness probes for orchestration (Kubernetes, Railway)

**Tasks**:
- [ ] Create `/health/live` endpoint (quick response)
- [ ] Create `/health/ready` endpoint (check dependencies)
- [ ] Document how Railway/monitoring should use them
- [ ] Add response time metric

**Implementation**:

```typescript
// server/src/routes/health.ts
import { Router } from 'express'
import { pool } from '../db'
import { redis } from '../cache'
import { neo4j } from '../graph'

export const healthRouter = Router()

// Liveness: Just respond (pod is alive)
healthRouter.get('/live', (req, res) => {
  res.json({
    status: 'live',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Readiness: Check all dependencies
healthRouter.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    neo4j: false,
    timestamp: new Date().toISOString()
  }
  
  try {
    await pool.query('SELECT 1')
    checks.database = true
  } catch (err) {
    console.warn('Database check failed:', err.message)
  }
  
  try {
    await redis.ping()
    checks.redis = true
  } catch (err) {
    console.warn('Redis check failed:', err.message)
  }
  
  try {
    await neo4j.getServerInfo()
    checks.neo4j = true
  } catch (err) {
    console.warn('Neo4j check failed:', err.message)
  }
  
  const allReady = checks.database && checks.redis && checks.neo4j
  res.status(allReady ? 200 : 503).json(checks)
})

// Metrics endpoint for monitoring
healthRouter.get('/metrics', (req, res) => {
  const uptime = process.uptime()
  const memory = process.memoryUsage()
  
  res.json({
    uptime_seconds: Math.floor(uptime),
    memory_mb: {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      external: Math.round(memory.external / 1024 / 1024)
    }
  })
})
```

```typescript
// server/src/server.ts
import { healthRouter } from './routes/health'

app.use('/health', healthRouter)
```

**Timeline**: 2-3 hours  
**Owner**: Backend lead  
**Risk**: Low (additive, no logic change)  
**Testing**: `curl http://localhost:5000/health/live` and `curl http://localhost:5000/health/ready`

---

### 1.4: Document Stuck Job Investigation

**Issue**: Stuck job monitor exists but no clear why jobs get stuck

**Tasks**:
- [ ] Review `server/src/jobs/stuckJobMonitor.ts`
- [ ] Identify top 3 reasons jobs get stuck
- [ ] Add detailed logging to stuck job detection
- [ ] Create incident response doc

**Implementation**:

```typescript
// server/src/jobs/stuckJobMonitor.ts
async function checkForStuckJobs() {
  const STUCK_THRESHOLD = 30 * 60 * 1000  // 30 minutes
  const now = Date.now()
  
  const stuckJobs = await queue.getJobs(['active'], 0, -1)
    .then(jobs => jobs.filter(j => {
      const duration = now - (j.progress?.startedAt || j.timestamp)
      return duration > STUCK_THRESHOLD
    }))
  
  if (stuckJobs.length > 0) {
    for (const job of stuckJobs) {
      console.warn('🚨 STUCK JOB DETECTED', {
        jobId: job.id,
        type: job.name,
        duration_minutes: Math.round((now - job.timestamp) / 1000 / 60),
        progress: job.progress(),
        attempts: job.attemptsMade,
        reason: identifyStuckReason(job)
      })
      
      // Send alert
      await sendStuckJobAlert({
        jobId: job.id,
        duration: now - job.timestamp,
        reason: identifyStuckReason(job)
      })
    }
  }
}

function identifyStuckReason(job) {
  // Check common stuck patterns
  if (!job.progress?.lastProgressUpdate) {
    return 'NO_PROGRESS_UPDATE'
  }
  
  const stuckDuration = Date.now() - job.progress.lastProgressUpdate
  if (stuckDuration > 5 * 60 * 1000) {
    return 'NO_PROGRESS_UPDATE_5MIN'
  }
  
  if (job.data?.ai_provider === 'openai' && !job.progress?.tokens) {
    return 'OPENAI_STALLED'
  }
  
  return 'UNKNOWN'
}
```

**Timeline**: 2-3 hours  
**Owner**: Backend lead  
**Risk**: Low (investigation + logging)  
**Testing**: Create a test job that takes 40+ minutes and verify alert triggers

---

## Phase 2: Route & Service Refactoring (Weeks 3-4)

### Goal
Bring order to route registration and service organization.

### 2.1: Centralize Route Registration

**Issue**: 80+ sequential route registrations make it hard to understand what endpoints exist

**Tasks**:
- [ ] Create `server/src/routes/index.ts` with route registry
- [ ] Move route definitions from `server.ts` to registry
- [ ] Generate API documentation from registry
- [ ] Update `server.ts` to use registry

**Implementation**:

```typescript
// server/src/routes/index.ts
export interface RouteConfig {
  path: string
  router: Router
  description: string
  version?: string
  auth?: boolean
}

const authRoutes: RouteConfig[] = [
  {
    path: '/api/auth',
    router: authRouter,
    description: 'Authentication (login, logout, token refresh)',
    auth: false
  },
  {
    path: '/api/auth/google',
    router: googleAuthRouter,
    description: 'Google OAuth callback',
    auth: false
  },
  {
    path: '/api/auth/saml',
    router: samlRouter,
    description: 'SAML authentication',
    auth: false
  }
]

const coreRoutes: RouteConfig[] = [
  {
    path: '/api/projects',
    router: projectRoutes,
    description: 'Project management',
    auth: true
  },
  {
    path: '/api/projects',
    router: projectSettingsRoutes,
    description: 'Project settings (extends project routes)',
    auth: true
  },
  {
    path: '/api/programs',
    router: programRoutes,
    description: 'Program management',
    auth: true
  },
  {
    path: '/api/documents',
    router: documentRoutes,
    description: 'Document CRUD and generation',
    auth: true
  },
  // ... rest of core routes
]

const aiRoutes: RouteConfig[] = [
  {
    path: '/api/ai',
    router: aiRouter,
    description: 'AI generation and copilot',
    auth: true
  },
  {
    path: '/api/ai/search',
    router: aiSearchRouter,
    description: 'AI-powered search',
    auth: true
  },
  // ... rest of AI routes
]

const integrationRoutes: RouteConfig[] = [
  {
    path: '/api/integrations/confluence',
    router: confluenceRouter,
    description: 'Confluence sync and authentication',
    auth: true
  },
  {
    path: '/api/integrations/sharepoint',
    router: sharepointRouter,
    description: 'SharePoint sync and authentication',
    auth: true
  },
  // ... rest of integrations
]

export const allRoutes = [
  ...authRoutes,
  ...coreRoutes,
  ...aiRoutes,
  ...integrationRoutes,
  // ... other route categories
]

/**
 * Register all routes on an Express app
 */
export function registerRoutes(app: Express): void {
  console.log('\n📍 Registering routes...\n')
  
  for (const routeConfig of allRoutes) {
    app.use(routeConfig.path, routeConfig.router)
    
    const authLabel = routeConfig.auth ? '🔒' : '🔓'
    console.log(`  ${authLabel} ${routeConfig.path.padEnd(40)} - ${routeConfig.description}`)
  }
  
  console.log(`\n✅ Registered ${allRoutes.length} route groups\n`)
}

/**
 * Generate API documentation from routes
 */
export function generateApiDocs(): string {
  let docs = '# API Documentation\n\n'
  
  const grouped = allRoutes.reduce((acc, route) => {
    const category = route.path.split('/')[2] || 'root'
    if (!acc[category]) acc[category] = []
    acc[category].push(route)
    return acc
  }, {} as Record<string, RouteConfig[]>)
  
  for (const [category, routes] of Object.entries(grouped)) {
    docs += `## ${category}\n\n`
    for (const route of routes) {
      docs += `- \`${route.path}\` - ${route.description}\n`
    }
    docs += '\n'
  }
  
  return docs
}
```

```typescript
// server/src/server.ts
import { registerRoutes, generateApiDocs } from './routes'

// Initialize
registerRoutes(app)

// Serve docs at /api/docs
app.get('/api/docs', (req, res) => {
  res.set('Content-Type', 'text/markdown')
  res.send(generateApiDocs())
})
```

**Timeline**: 4-5 hours  
**Owner**: Backend lead  
**Risk**: Medium (touches route loading)  
**Testing**: `npm run dev` and verify `curl http://localhost:5000/api/docs` returns markdown

---

### 2.2: Create Module Architecture for Services

**Issue**: Services are monolithic and hard to navigate

**Tasks**:
- [ ] Create `server/src/modules/` directory structure
- [ ] Move AI service to `modules/ai/`
- [ ] Extract document repository to `modules/documents/`
- [ ] Update imports throughout codebase
- [ ] Create module index files for public APIs

**Implementation**:

```typescript
// server/src/modules/ai/index.ts
// Public API for AI module
export { AIService } from './service'
export { AIProvider, AIProviderConfig } from './types'
export { createOpenAIProvider, createGoogleProvider } from './providers'
export { AIProviderError, ProviderUnavailableError } from './errors'
```

```typescript
// server/src/modules/ai/types.ts
export interface AIProvider {
  name: string
  isAvailable(): Promise<boolean>
  generate(prompt: string, options: GenerateOptions): Promise<string>
}

export interface GenerateOptions {
  temperature?: number
  maxTokens?: number
  model?: string
  retryCount?: number
}

export interface GenerationResult {
  content: string
  provider: string
  tokensUsed: number
  costEstimate: number
}
```

```typescript
// server/src/modules/ai/service.ts
import { AIProvider, GenerateOptions, GenerationResult } from './types'
import { AIProviderError, ProviderUnavailableError } from './errors'

export class AIService {
  private providers: AIProvider[] = []
  private fallbackOrder: string[] = []
  
  constructor(providers: AIProvider[], fallbackOrder: string[]) {
    this.providers = providers
    this.fallbackOrder = fallbackOrder
  }
  
  async generate(prompt: string, options?: GenerateOptions): Promise<GenerationResult> {
    const errors: Array<{ provider: string; error: Error }> = []
    
    for (const providerName of this.fallbackOrder) {
      const provider = this.providers.find(p => p.name === providerName)
      if (!provider) continue
      
      try {
        const isAvailable = await provider.isAvailable()
        if (!isAvailable) {
          console.warn(`⚠️  Provider ${providerName} unavailable`)
          continue
        }
        
        const content = await provider.generate(prompt, options || {})
        
        return {
          content,
          provider: providerName,
          tokensUsed: options?.maxTokens || 0,
          costEstimate: this.estimateCost(providerName, content)
        }
      } catch (error) {
        errors.push({ provider: providerName, error })
        console.error(`❌ Provider ${providerName} failed:`, error.message)
      }
    }
    
    throw new ProviderUnavailableError(
      `All providers failed. Errors: ${errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')}`
    )
  }
  
  private estimateCost(provider: string, content: string): number {
    // Estimate based on provider pricing
    const words = content.split(' ').length
    const costPerK = {
      'openai': 0.002,
      'google': 0.0001,
      'anthropic': 0.003
    }
    return (words / 1000) * (costPerK[provider] || 0)
  }
}
```

```typescript
// server/src/modules/ai/providers/openai.ts
import OpenAI from 'openai'
import { AIProvider, GenerateOptions } from '../types'

export class OpenAIProvider implements AIProvider {
  name = 'openai'
  private client: OpenAI
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Quick availability check
      await this.client.models.retrieve('gpt-4')
      return true
    } catch (err) {
      return false
    }
  }
  
  async generate(prompt: string, options: GenerateOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options.model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000
    })
    
    return response.choices[0]?.message?.content || ''
  }
}
```

**Timeline**: 8-10 hours  
**Owner**: Backend lead  
**Risk**: High (large refactoring, potential breakage)  
**Testing**: Run full test suite, verify AI generation still works

---

### 2.3: Extract Database Queries to Repository

**Issue**: Database queries scattered in routes and duplicated

**Tasks**:
- [ ] Identify duplicated query patterns
- [ ] Create `repository.ts` for each entity (projects, documents, etc.)
- [ ] Move queries to repositories
- [ ] Update routes to use repositories
- [ ] Add query optimization (batching, caching)

**Implementation**:

```typescript
// server/src/modules/projects/repository.ts
export class ProjectRepository {
  private pool: Pool
  
  constructor(pool: Pool) {
    this.pool = pool
  }
  
  /**
   * Get project with all members in a single query
   */
  async getWithMembers(projectId: string) {
    const result = await this.pool.query(`
      SELECT 
        p.*,
        json_agg(json_build_object(
          'userId', pm.user_id,
          'role', pm.role,
          'addedAt', pm.added_at
        )) as members
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = $1
      GROUP BY p.id
    `, [projectId])
    
    return result.rows[0]
  }
  
  /**
   * Get projects for a user (with caching)
   */
  async findByTeamMember(userId: string, limit = 50) {
    const cacheKey = `user-projects:${userId}`
    
    // Try cache first
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }
    
    // Query if not cached
    const result = await this.pool.query(`
      SELECT p.* FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = $1
      ORDER BY p.updated_at DESC
      LIMIT $2
    `, [userId, limit])
    
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(result.rows))
    
    return result.rows
  }
  
  /**
   * Batch get projects (efficient for lists)
   */
  async findByIds(projectIds: string[]) {
    if (projectIds.length === 0) return []
    
    const result = await this.pool.query(`
      SELECT * FROM projects
      WHERE id = ANY($1)
      ORDER BY updated_at DESC
    `, [projectIds])
    
    return result.rows
  }
  
  /**
   * Update project with conflict detection
   */
  async update(projectId: string, data: Partial<Project>, version: number) {
    const result = await this.pool.query(`
      UPDATE projects
      SET 
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        updated_at = NOW(),
        version = version + 1
      WHERE id = $1 AND version = $4
      RETURNING *
    `, [projectId, data.name, data.description, version])
    
    if (result.rows.length === 0) {
      throw new ConflictError('Project was modified by another user')
    }
    
    // Invalidate cache
    await redis.del(`project:${projectId}`)
    
    return result.rows[0]
  }
}

// server/src/modules/projects/controller.ts
export class ProjectController {
  constructor(private repo: ProjectRepository) {}
  
  async getWithMembers(req: Request, res: Response) {
    const project = await this.repo.getWithMembers(req.params.id)
    res.json(project)
  }
  
  async list(req: Request, res: Response) {
    const projects = await this.repo.findByTeamMember(req.user.id)
    res.json(projects)
  }
  
  async update(req: Request, res: Response) {
    const updated = await this.repo.update(
      req.params.id,
      req.body,
      req.body.version
    )
    res.json(updated)
  }
}
```

**Timeline**: 6-8 hours  
**Owner**: Backend lead + senior engineer  
**Risk**: High (data layer refactoring)  
**Testing**: Run database tests, verify queries return same results as before

---

## Phase 3: Testing Infrastructure (Weeks 5-8)

### Goal
Establish test framework and write critical path tests.

### 3.1: Set Up Test Framework

**Issue**: Only 17 test files, need infrastructure for systematic testing

**Tasks**:
- [ ] Install testing libraries (Jest, Supertest, MongoDB memory server)
- [ ] Create test utilities and factories
- [ ] Set up CI/CD test pipeline
- [ ] Create test coverage reports

**Implementation**:

```bash
# package.json
{
  "devDependencies": {
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "supertest": "^6.3.0",
    "ts-jest": "^29.0.0",
    "mongodb-memory-server": "^8.0.0",
    "@testing-library/react": "^14.0.0",
    "jest-mock-extended": "^3.0.0"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest --testPathPattern=e2e"
  }
}
```

```typescript
// jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'server/src/**/*.ts',
    '!server/src/**/*.d.ts',
    '!server/src/types/**'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
}
```

```typescript
// __tests__/setup.ts
import { Pool } from 'pg'

// Test database setup
export async function setupTestDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_TEST || 'postgresql://test:test@localhost/adpa_test'
  })
  
  // Run migrations
  await runMigrations(pool)
  
  return pool
}

export async function teardownTestDatabase(pool: Pool) {
  await pool.end()
}

// Test data factories
export function createTestProject(overrides = {}) {
  return {
    id: 'proj-test-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Project',
    description: 'For testing',
    ownerId: 'user-test-1',
    ...overrides
  }
}

export function createTestUser(overrides = {}) {
  return {
    id: 'user-test-' + Math.random().toString(36).substr(2, 9),
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    ...overrides
  }
}
```

**Timeline**: 3-4 hours  
**Owner**: QA lead + backend engineer  
**Risk**: Low (additive)

---

### 3.2: Write Critical Path Tests (Tier 1)

**Tests to write first** (highest impact):

#### 3.2.1: Authentication Tests

```typescript
// __tests__/modules/auth/service.test.ts
describe('AuthService', () => {
  let authService: AuthService
  let userRepo: MockUserRepository
  
  beforeEach(() => {
    userRepo = new MockUserRepository()
    authService = new AuthService(userRepo)
  })
  
  describe('login', () => {
    it('should login with valid credentials', async () => {
      const user = await authService.login('test@example.com', 'password')
      expect(user.id).toBeDefined()
      expect(user.token).toBeDefined()
    })
    
    it('should fail with invalid credentials', async () => {
      await expect(
        authService.login('test@example.com', 'wrong')
      ).rejects.toThrow('Invalid credentials')
    })
    
    it('should fail with non-existent user', async () => {
      await expect(
        authService.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('User not found')
    })
  })
  
  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const token = await authService.createToken({ userId: 'user-1' })
      const payload = await authService.verifyToken(token)
      expect(payload.userId).toBe('user-1')
    })
    
    it('should reject expired token', async () => {
      const expiredToken = jwt.sign({ userId: 'user-1' }, 'secret', { expiresIn: '-1h' })
      await expect(authService.verifyToken(expiredToken)).rejects.toThrow()
    })
    
    it('should reject tampered token', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature'
      await expect(authService.verifyToken(token)).rejects.toThrow()
    })
  })
})
```

#### 3.2.2: Project CRUD Tests

```typescript
// __tests__/modules/projects/service.test.ts
describe('ProjectService', () => {
  let service: ProjectService
  let repo: MockProjectRepository
  
  beforeEach(() => {
    repo = new MockProjectRepository()
    service = new ProjectService(repo)
  })
  
  describe('createProject', () => {
    it('should create a project with valid data', async () => {
      const project = await service.createProject({
        name: 'Test Project',
        ownerId: 'user-1'
      })
      
      expect(project.id).toBeDefined()
      expect(project.name).toBe('Test Project')
      expect(project.createdAt).toBeDefined()
    })
    
    it('should fail without required fields', async () => {
      await expect(
        service.createProject({ ownerId: 'user-1' })
      ).rejects.toThrow('name is required')
    })
  })
  
  describe('getProject', () => {
    it('should get project with members', async () => {
      const projectId = await setupTestProject()
      const project = await service.getProject(projectId)
      
      expect(project.members).toBeDefined()
      expect(Array.isArray(project.members)).toBe(true)
    })
    
    it('should return null for nonexistent project', async () => {
      const project = await service.getProject('nonexistent')
      expect(project).toBeNull()
    })
  })
  
  describe('updateProject', () => {
    it('should update project fields', async () => {
      const projectId = await setupTestProject()
      const updated = await service.updateProject(projectId, {
        name: 'Updated Name'
      }, 1)
      
      expect(updated.name).toBe('Updated Name')
      expect(updated.version).toBe(2)
    })
    
    it('should fail with version mismatch', async () => {
      const projectId = await setupTestProject()
      await expect(
        service.updateProject(projectId, { name: 'New' }, 999)
      ).rejects.toThrow('Project was modified')
    })
  })
  
  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const projectId = await setupTestProject()
      await service.deleteProject(projectId)
      
      const project = await service.getProject(projectId)
      expect(project).toBeNull()
    })
  })
})
```

#### 3.2.3: Document Generation Tests

```typescript
// __tests__/modules/documents/service.test.ts
describe('DocumentService', () => {
  let service: DocumentService
  let aiService: MockAIService
  
  beforeEach(() => {
    aiService = new MockAIService()
    service = new DocumentService(aiService)
  })
  
  describe('generateDocument', () => {
    it('should generate document from template', async () => {
      const doc = await service.generateDocument({
        templateId: 'project-charter',
        data: {
          projectName: 'Test Project',
          projectDescription: 'A test'
        }
      })
      
      expect(doc.id).toBeDefined()
      expect(doc.content).toContain('Test Project')
      expect(doc.format).toBe('pdf')
    })
    
    it('should fail without required data fields', async () => {
      await expect(
        service.generateDocument({
          templateId: 'project-charter',
          data: {}
        })
      ).rejects.toThrow('projectName is required')
    })
    
    it('should use AI provider for enrichment', async () => {
      const doc = await service.generateDocument({
        templateId: 'project-charter',
        data: { projectName: 'Test' },
        enrichWithAI: true
      })
      
      expect(aiService.generate).toHaveBeenCalled()
      expect(doc.aiEnhanced).toBe(true)
    })
  })
  
  describe('failover', () => {
    it('should fallback to Google AI if OpenAI fails', async () => {
      aiService.setProviderUnavailable('openai')
      
      const doc = await service.generateDocument({
        templateId: 'test',
        data: { projectName: 'Test' },
        preferredProvider: 'openai'
      })
      
      expect(doc.provider).toBe('google')
    })
  })
})
```

#### 3.2.4: AI Failover Tests

```typescript
// __tests__/modules/ai/service.test.ts
describe('AIService', () => {
  let service: AIService
  let providers: AIProvider[]
  
  beforeEach(() => {
    providers = [
      new MockOpenAIProvider(),
      new MockGoogleProvider(),
      new MockAnthropicProvider()
    ]
    service = new AIService(providers, ['openai', 'google', 'anthropic'])
  })
  
  it('should use first available provider', async () => {
    const result = await service.generate('Test prompt')
    expect(result.provider).toBe('openai')
  })
  
  it('should failover if first provider fails', async () => {
    providers[0]!.setFailing(true)  // Fail OpenAI
    
    const result = await service.generate('Test prompt')
    expect(result.provider).toBe('google')
  })
  
  it('should try all providers before failing', async () => {
    providers[0]!.setFailing(true)  // Fail OpenAI
    providers[1]!.setFailing(true)  // Fail Google
    
    const result = await service.generate('Test prompt')
    expect(result.provider).toBe('anthropic')
  })
  
  it('should fail if all providers unavailable', async () => {
    providers.forEach(p => p.setFailing(true))
    
    await expect(
      service.generate('Test prompt')
    ).rejects.toThrow('All providers failed')
  })
})
```

**Timeline**: 12-16 hours (spread over 2 weeks)  
**Owner**: QA team + backend engineers  
**Risk**: Medium (writing new tests, may find bugs)  
**Target Coverage**: 60%+ for core modules

---

## Phase 4: Operations & Observability (Weeks 7-12)

### Goal
Add monitoring, logging, and deployment automation.

### 4.1: Add Prometheus Metrics

**Issue**: HTTP request latency, queue depth not tracked

**Tasks**:
- [ ] Install Prometheus client library
- [ ] Add HTTP request histogram
- [ ] Add job queue metrics
- [ ] Create Grafana dashboard
- [ ] Expose `/metrics` endpoint

**Implementation**:

```typescript
// server/src/observability/metrics.ts
import * as prometheus from 'prom-client'

// HTTP metrics
export const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request latency in milliseconds',
  labelNames: ['method', 'endpoint', 'status'],
  buckets: [10, 50, 100, 500, 1000, 5000]
})

export const httpRequestSize = new prometheus.Gauge({
  name: 'http_request_bytes',
  help: 'HTTP request/response size in bytes',
  labelNames: ['method', 'endpoint']
})

// Queue metrics
export const jobQueueDepth = new prometheus.Gauge({
  name: 'job_queue_depth',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue_name']
})

export const jobProcessingTime = new prometheus.Histogram({
  name: 'job_processing_time_ms',
  help: 'Time to process a job in milliseconds',
  labelNames: ['job_type', 'status'],
  buckets: [100, 500, 1000, 5000, 30000]
})

export const jobsCompleted = new prometheus.Counter({
  name: 'jobs_completed_total',
  help: 'Total number of jobs completed',
  labelNames: ['job_type', 'status']
})

// Database metrics
export const dbConnections = new prometheus.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['pool']
})

export const dbQueryTime = new prometheus.Histogram({
  name: 'db_query_time_ms',
  help: 'Database query execution time',
  labelNames: ['query_type'],
  buckets: [1, 10, 50, 100, 500, 1000]
})

// AI metrics
export const aiRequestTime = new prometheus.Histogram({
  name: 'ai_request_time_ms',
  help: 'AI provider request latency',
  labelNames: ['provider', 'model'],
  buckets: [100, 500, 1000, 5000, 10000]
})

export const aiTokensUsed = new prometheus.Counter({
  name: 'ai_tokens_total',
  help: 'Total AI tokens used',
  labelNames: ['provider', 'model', 'type']  // type: input/output
})

export const aiCostEstimate = new prometheus.Counter({
  name: 'ai_cost_estimate_usd',
  help: 'Estimated cost of AI calls in USD',
  labelNames: ['provider']
})

// System metrics (collected automatically)
prometheus.collectDefaultMetrics()
```

```typescript
// server/src/server.ts
import { httpRequestDuration, httpRequestSize } from './observability/metrics'

// Middleware to track HTTP metrics
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration)
  })
  
  next()
})

// Expose metrics endpoint
app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', prometheus.register.contentType)
  res.end(prometheus.register.metrics())
})
```

**Timeline**: 4-5 hours  
**Owner**: DevOps + backend engineer  
**Risk**: Low (additive, no business logic changes)

---

### 4.2: Create Deployment Pipeline

**Issue**: No clear deployment process or staging environment

**Tasks**:
- [ ] Create Railway staging environment
- [ ] Set up deployment workflow (Dev → Staging → Production)
- [ ] Automate database migrations on deploy
- [ ] Create rollback procedure
- [ ] Document deployment checklist

**Implementation**:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: docker.io
  IMAGE_NAME: adpa/backend

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run test:coverage
      - run: pnpm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway Staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_STAGING }}
        run: |
          curl -X POST https://api.railway.app/deploy/webhook \
            -H "Authorization: Bearer $RAILWAY_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"branch":"main","environment":"staging"}'
      
      - name: Verify staging deployment
        run: |
          sleep 30
          curl -f https://staging-api.adpa.io/health/ready || exit 1

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway Production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PRODUCTION }}
        run: |
          curl -X POST https://api.railway.app/deploy/webhook \
            -H "Authorization: Bearer $RAILWAY_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"branch":"main","environment":"production"}'
      
      - name: Verify production deployment
        run: |
          sleep 30
          curl -f https://api.adpa.io/health/ready || exit 1
      
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "text": "✅ Deployment to production successful",
              "blocks": [{"type": "section", "text": {"type": "mrkdwn", "text": "*Deployment Status*\n✅ Production deployment complete\nCommit: ${{ github.sha }}"}}]
            }
```

```bash
# scripts/deploy.sh
#!/bin/bash
set -e

ENVIRONMENT=$1
if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: ./deploy.sh [staging|production]"
  exit 1
fi

echo "🚀 Deploying to $ENVIRONMENT..."

# 1. Run tests
echo "✅ Running tests..."
pnpm run test

# 2. Build
echo "✅ Building..."
pnpm run build

# 3. Run migrations (dry-run first)
echo "✅ Checking migrations..."
pnpm run migrate:validate

# 4. Create backup
if [ "$ENVIRONMENT" = "production" ]; then
  echo "✅ Creating database backup..."
  pg_dump $DATABASE_URL > backups/backup-$(date +%Y%m%d-%H%M%S).sql
fi

# 5. Deploy
echo "✅ Deploying..."
railway deploy --environment $ENVIRONMENT

# 6. Verify
echo "✅ Verifying deployment..."
sleep 30
curl -f https://api-$ENVIRONMENT.adpa.io/health/ready || {
  echo "❌ Health check failed"
  exit 1
}

echo "✅ Deployment successful!"
```

```markdown
# Deployment Checklist

## Pre-Deployment
- [ ] All tests passing (`pnpm run test`)
- [ ] No linting errors (`pnpm run lint`)
- [ ] Code review approved
- [ ] Changelog updated

## Staging Deployment
- [ ] Deploy to staging environment
- [ ] Verify all services healthy: `curl https://staging-api.adpa.io/health/ready`
- [ ] Check logs for errors: `railway logs --environment staging`
- [ ] Run smoke tests
- [ ] Performance baseline OK

## Production Deployment
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Alert team
- [ ] Deploy to production
- [ ] Verify all services healthy
- [ ] Monitor metrics for 10 minutes
- [ ] Check error rates
- [ ] Notify stakeholders

## Rollback (if needed)
```bash
railway deploy --environment production --revision <previous-sha>
pnpm run migrate:rollback  # If schema changed
```

**Timeline**: 6-8 hours  
**Owner**: DevOps engineer  
**Risk**: High (deployment critical path)  
**Testing**: Test workflow with staging environment first

---

### 4.3: Document API and Setup

**Issue**: No centralized API documentation

**Tasks**:
- [ ] Generate API documentation from route registry
- [ ] Create OpenAPI/Swagger spec
- [ ] Document all environment variables
- [ ] Create local setup guide
- [ ] Create troubleshooting guide

**Implementation**:

```typescript
// server/src/observability/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ADPA API',
      version: '1.0.0',
      description: 'AI-Driven Portfolio Analysis API'
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
      { url: 'https://api.adpa.io', description: 'Production' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./server/src/modules/**/*.ts']
}

export const swaggerSpec = swaggerJsdoc(options)

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
  app.get('/api/docs.json', (req, res) => {
    res.json(swaggerSpec)
  })
}
```

```typescript
// server/src/modules/projects/routes.ts
import { Router } from 'express'

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 */
router.get('/', (req, res) => {
  // Handler
})
```

**Timeline**: 4-6 hours  
**Owner**: Backend lead + documentation specialist  
**Risk**: Low (documentation only)

---

## Phase 5: Optimization & Polish (Weeks 9-12)

### 5.1: Database Performance Optimization

**Issue**: Schema has normalization issues, queries may be slow

**Tasks**:
- [ ] Add missing indexes
- [ ] Optimize JOIN queries
- [ ] Implement query result caching
- [ ] Monitor slow query log
- [ ] Create performance baseline

**Implementation**:

```sql
-- Add indexes for common queries
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_jobs_status ON jobs(status) WHERE status IN ('pending', 'active');

-- Add composite indexes for common filters
CREATE INDEX idx_documents_project_created ON documents(project_id, created_at DESC);
CREATE INDEX idx_projects_updated ON projects(updated_at DESC);

-- Partial indexes for active records
CREATE INDEX idx_jobs_active ON jobs(queue_id) WHERE status = 'active';
CREATE INDEX idx_users_active ON users(created_at) WHERE deleted_at IS NULL;
```

```typescript
// server/src/observability/slowQueryLog.ts
export function setupSlowQueryLogging(pool: Pool, thresholdMs = 1000) {
  const originalQuery = pool.query.bind(pool)
  
  pool.query = async function(...args) {
    const start = Date.now()
    try {
      return await originalQuery(...args)
    } finally {
      const duration = Date.now() - start
      if (duration > thresholdMs) {
        console.warn('🐌 SLOW QUERY', {
          query: args[0],
          duration_ms: duration,
          params: args[1]?.length ? `${args[1].length} params` : 'none'
        })
      }
    }
  }
}
```

**Timeline**: 4-5 hours  
**Owner**: Database specialist + backend engineer  
**Risk**: Medium (database changes require testing)

---

### 5.2: Frontend App Router Restructuring

**Issue**: 35+ directories at root level, unclear hierarchy

**Plan**:
- [ ] Map current structure
- [ ] Design new hierarchy
- [ ] Move directories (with tests)
- [ ] Update imports
- [ ] Verify builds and E2E tests pass

**New Structure**:

```
app/
├── (auth)/                      # Public routes
│   ├── login/
│   ├── signup/
│   └── forgot-password/
├── (protected)/                 # Authenticated routes
│   ├── layout.tsx              # Protected layout
│   ├── dashboard/              # Main dashboard
│   ├── [core]/                 # Core features
│   │   ├── projects/
│   │   ├── programs/
│   │   ├── portfolios/
│   │   └── documents/
│   ├── [analysis]/             # Analysis features
│   │   ├── ai-search/
│   │   ├── analytics/
│   │   ├── portfolio-financial/
│   │   └── drift/
│   ├── [admin]/                # Admin features
│   │   ├── admin/
│   │   ├── roles/
│   │   ├── users/
│   │   └── integrations/
│   └── settings/               # Settings
├── api/                        # Route handlers
├── error.tsx
├── not-found.tsx
└── layout.tsx                  # Root layout
```

**Timeline**: 8-10 hours  
**Owner**: Frontend lead  
**Risk**: High (large refactoring)  
**Testing**: Full E2E suite must pass

---

### 5.3: Expand Test Coverage

**Goal**: Increase from 17 test files to 50+ (60%+ coverage)

**Tier 2 Tests** (after Tier 1 complete):

```typescript
// Integration tests
- Confluence sync workflows
- SharePoint sync workflows
- WebSocket real-time collaboration
- Job queue processing

// API endpoint tests
- All GET/POST/PUT/DELETE endpoints
- Error handling (400, 403, 404, 500)
- Authentication/authorization
- Rate limiting
```

```typescript
// E2E tests
- Complete user journey: signup → create project → generate document
- Multi-user collaboration
- Real-time updates
- Export functionality
```

**Timeline**: 16-20 hours (spread over 4 weeks)  
**Owner**: QA team  
**Target**: 60%+ line coverage

---

### 5.4: Performance Tuning

**Tasks**:
- [ ] Benchmark API endpoints (p95 latency < 200ms)
- [ ] Optimize image loading (frontend)
- [ ] Compress response payloads
- [ ] Enable HTTP/2 Server Push
- [ ] Profile memory usage

**Timeline**: 6-8 hours  
**Owner**: Senior backend engineer + frontend engineer  
**Risk**: Medium (performance work is iterative)

---

## Success Criteria & Metrics

### By End of Phase 1 (Week 2)
- ✅ No "TLS disabled" warnings
- ✅ No "DB connection waiting..." logs
- ✅ Health check endpoint returns 200
- ✅ Stuck job monitor tested and working

### By End of Phase 2 (Week 4)
- ✅ Route registry centralized and documented
- ✅ AI service module isolated and testable
- ✅ Database queries in repositories (no N+1 queries)
- ✅ Route count in registry: 80+, all documented

### By End of Phase 3 (Week 8)
- ✅ Test coverage: 60%+
- ✅ Tier 1 critical paths tested (auth, projects, documents, AI failover)
- ✅ GitHub Actions CI/CD running tests on every PR
- ✅ All tests passing consistently

### By End of Phase 4 (Week 12)
- ✅ Prometheus metrics collected and exposed
- ✅ Grafana dashboard showing key metrics
- ✅ Staging environment ready for testing
- ✅ API documentation auto-generated
- ✅ Deployment pipeline automated
- ✅ Database backup/restore procedures documented

### Final Metrics (End of Phase 5, Week 12)
- ✅ Developer onboarding time: < 1 day
- ✅ Debugging time: 75% reduction
- ✅ Production incidents: 50% reduction
- ✅ Test coverage: 60%+
- ✅ API response time p95: < 200ms
- ✅ Zero security warnings
- ✅ Full API documentation available

---

## Resource Allocation

| Role | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Total |
|------|---------|---------|---------|---------|---------|-------|
| Backend Lead | 16h | 20h | 8h | 4h | 4h | 52h |
| Senior Backend Engineer | 0h | 16h | 16h | 8h | 8h | 48h |
| QA/Test Engineer | 4h | 4h | 32h | 0h | 8h | 48h |
| DevOps Engineer | 0h | 0h | 0h | 12h | 0h | 12h |
| **Total** | **20h** | **40h** | **56h** | **24h** | **20h** | **160h** |

---

## Risk Mitigation

### High-Risk Items
1. **Phase 2.1 - Route Registry Refactoring**
   - Risk: Breaking existing routes
   - Mitigation: Test all endpoints before and after, run full E2E suite

2. **Phase 2.2 - Module Architecture**
   - Risk: Large refactoring, import breakage
   - Mitigation: Use TypeScript strict mode, verify imports with linter

3. **Phase 2.3 - Database Query Refactoring**
   - Risk: Data access bugs
   - Mitigation: Add repository tests, compare old vs new query results

4. **Phase 4.2 - Deployment Pipeline**
   - Risk: Broken deployments
   - Mitigation: Test on staging first, have rollback plan ready

---

## Communication Plan

- **Weekly Status**: Send to team with blockers, progress, next week's work
- **Phase Completion**: Demo to stakeholders, get feedback
- **Risk Issues**: Escalate immediately to technical lead
- **Documentation**: Update wiki/docs as changes made

---

## Success Indicators

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Developer onboarding time | 5 days | < 1 day | Track new hire setup time |
| Debugging time | High | 75% reduction | Track PR review → merge time |
| Production incidents | Varies | 50% reduction | Monitor Sentry/error tracking |
| Test coverage | 5% | 60% | Run `npm run test:coverage` |
| API response time (p95) | Unknown | < 200ms | Monitor Prometheus histogram |
| Security warnings | Multiple | Zero | Run `npm audit` |
| Deployment frequency | Ad-hoc | Daily | Track deployments in GitHub |
| Mean time to deploy | Unknown | < 15 min | Measure from merge to live |

---

## Timeline Summary

```
Week 1-2:   Stabilization          (20h)
Week 3-4:   Refactoring            (40h)
Week 5-8:   Testing                (56h)
Week 7-12:  Operations & Polish    (44h)
          ────────
Total:      120-160h over 12 weeks
```

**Critical Path** (must complete in order):
1. Phase 1 (Weeks 1-2) - Stabilize core
2. Phase 2 (Weeks 3-4) - Refactor architecture
3. Phase 3 (Weeks 5-8) - Add tests
4. Phase 4 + 5 (Weeks 7-12) - Operations & polish (can overlap with testing)

---

## Next Steps

1. **Assign owners** to each phase and task
2. **Schedule kickoff** meeting with team
3. **Set up project board** (GitHub Issues or Jira)
4. **Create sprint schedule** (2-week sprints recommended)
5. **Define "done" criteria** for each task
6. **Schedule weekly status** syncs

---

**Document Version**: 1.0  
**Last Updated**: March 11, 2026  
**Status**: Ready for implementation  
**Approval**: [Technical Lead, Engineering Manager]
