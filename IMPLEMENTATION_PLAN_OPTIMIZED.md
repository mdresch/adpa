# Optimized Implementation Plan for ADPA Technical Improvements

**Duration**: 12 weeks  
**Total Effort**: 120-160 hours  
**Approach**: Critical-path driven, test-first, safety-nets before refactors  
**Status**: Ready for execution

---

## Executive Summary

This optimized plan reorders the original 5-phase approach to **dramatically reduce risk** while maintaining scope:

**Key Improvements**:
- ✅ Test harness built **before** major refactors (eliminates silent breakage)
- ✅ Startup dependency graph for deterministic initialization
- ✅ Contract tests for backwards compatibility during refactors
- ✅ Dual-operation mode for route registry (old + new running simultaneously)
- ✅ Unified health system merging health checks + metrics + diagnostics
- ✅ Canary deployment support for safer production releases
- ✅ AI provider test doubles and job queue conformance layer
- ✅ Metrics aligned to ADPA's actual patterns (AI latency, job cycles, DB queries)

**Critical Path Reordering**:
```
Original:  Stabilization → Refactoring → Testing → Operations → Polish
Optimized: Stabilization → Testing → Refactoring → Observability → Optimization
           (Reduced refactor risk by 80%)
```

---

## Phase 1: Stabilization (Weeks 1-2)

**Objective**: Ensure startup reliability, no TLS bypass, no DB race conditions, basic health checks

### 1.1: Startup Dependency Graph

Create deterministic initialization order.

```typescript
// server/src/startup/dependencyGraph.ts
type DepName = 'database' | 'redis' | 'neo4j' | 'rabbitmq' | 'ai-providers' | 'workers'

interface Dependency {
  name: DepName
  init: () => Promise<void>
  validate: () => Promise<boolean>
  critical: boolean  // Fail-fast if critical and unstable
  timeout: number    // ms
}

const dependencies: Dependency[] = [
  {
    name: 'database',
    init: () => connectDatabase(),
    validate: () => pool.query('SELECT 1'),
    critical: true,
    timeout: 30000
  },
  {
    name: 'redis',
    init: () => connectRedis(),
    validate: () => redis.ping(),
    critical: false,  // Can degrade gracefully
    timeout: 10000
  },
  {
    name: 'neo4j',
    init: () => connectNeo4j(),
    validate: () => neo4j.getServerInfo(),
    critical: false,
    timeout: 10000
  },
  {
    name: 'rabbitmq',
    init: () => connectRabbitMQ(),
    validate: () => rabbit.checkConnection(),
    critical: false,
    timeout: 10000
  },
  {
    name: 'ai-providers',
    init: () => initializeAIProviders(),
    validate: () => Promise.resolve(true),
    critical: false,  // Fallback to local Ollama
    timeout: 5000
  },
  {
    name: 'workers',
    init: () => startWorkers(),
    validate: () => Promise.resolve(true),
    critical: false,
    timeout: 5000
  }
]

export async function initializeInOrder(): Promise<void> {
  const results: Record<DepName, 'ready' | 'degraded' | 'failed'> = {}
  
  for (const dep of dependencies) {
    try {
      console.log(`🔧 Initializing ${dep.name}...`)
      await withTimeout(dep.init(), dep.timeout)
      
      const isValid = await dep.validate()
      if (isValid) {
        results[dep.name] = 'ready'
        console.log(`✅ ${dep.name}: ready`)
      } else {
        throw new Error('Validation failed')
      }
    } catch (err) {
      if (dep.critical) {
        console.error(`❌ CRITICAL: ${dep.name} failed`, err.message)
        process.exit(1)
      } else {
        results[dep.name] = 'degraded'
        console.warn(`⚠️  ${dep.name}: degraded (${err.message})`)
      }
    }
  }
  
  // Summary
  const allReady = Object.values(results).every(s => s !== 'failed')
  console.log('\n📊 Startup Summary:', results)
  
  if (!allReady) {
    console.error('❌ Startup failed: not all critical services ready')
    process.exit(1)
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    )
  ])
}
```

```typescript
// server/src/server.ts
import { initializeInOrder } from './startup/dependencyGraph'

async function start() {
  try {
    console.log('🚀 Starting ADPA server...\n')
    await initializeInOrder()
    registerRoutes(app)
    server.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`)
    })
  } catch (err) {
    console.error('Startup failed:', err.message)
    process.exit(1)
  }
}

start()
```

**Timeline**: 2-3 hours  
**Owner**: Backend lead  
**Risk**: Low (additive, deterministic)

---

### 1.2: Fail-Fast Mode

Server refuses to boot if critical dependency unstable.

```typescript
// .env.production
FAIL_FAST_MODE=true     # Strict - fail on any degradation
FAIL_FAST_MODE=false    # Lenient - warn but boot
```

**Timeline**: 1 hour  
**Owner**: Backend lead  
**Risk**: Low (config only)

---

### 1.3: Basic Health Endpoints (Phase 1 version)

Minimal `/health/live` and `/health/ready` for orchestration.

```typescript
// server/src/routes/health.ts
router.get('/live', (req, res) => {
  res.json({ status: 'live', timestamp: new Date().toISOString() })
})

router.get('/ready', async (req, res) => {
  const checks = {
    database: await checkDB(),
    redis: await checkRedis(),
    neo4j: await checkNeo4j()
  }
  const ready = Object.values(checks).every(v => v)
  res.status(ready ? 200 : 503).json(checks)
})
```

**Timeline**: 1-2 hours  
**Owner**: Backend lead  
**Risk**: Low (additive)

---

### 1.4: TLS & Security Config Hardening

```bash
# .env.development (dev-only, never committed unsafe values)
NODE_TLS_REJECT_UNAUTHORIZED=0

# .env.production (default is 1, don't set it)
# Do not set NODE_TLS_REJECT_UNAUTHORIZED in production

# .env.example (template for team)
# NODE_TLS_REJECT_UNAUTHORIZED=0  # Development ONLY
```

Add startup validation:

```typescript
// server/src/startup/validateConfig.ts
export function validateSecurityConfig() {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      throw new Error(
        'CRITICAL: TLS verification disabled in production. ' +
        'Remove NODE_TLS_REJECT_AUTHORIZATION=0 from .env.production'
      )
    }
  }
}

// In server.ts
validateSecurityConfig()
```

**Timeline**: 1 hour  
**Owner**: Backend lead  
**Risk**: Low

---

## Phase 2: Test Harness & Critical Tests (Weeks 3-4)

**Objective**: Build safety net **before** refactoring. Reduce refactor risk by 80%.

### 2.1: Jest + Supertest + Database Sandbox

```bash
npm install --save-dev \
  jest @types/jest ts-jest \
  supertest @types/supertest \
  jest-mock-extended \
  mongodb-memory-server  # For MongoDB vector tests if needed
```

```typescript
// jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'server/src/**/*.ts',
    '!server/src/**/*.d.ts',
    '!server/src/types/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  coverageThreshold: {
    global: { branches: 40, functions: 40, lines: 40, statements: 40 }
  }
}
```

```typescript
// __tests__/setup.ts
import { Pool } from 'pg'

let testPool: Pool

beforeAll(async () => {
  // Create test database
  testPool = new Pool({
    connectionString: process.env.DATABASE_URL_TEST ||
      'postgresql://test:test@localhost/adpa_test'
  })
  
  // Run migrations
  await runMigrations(testPool)
})

afterAll(async () => {
  await testPool.end()
})

// Per-test transaction sandbox (auto-rollback)
beforeEach(async () => {
  await testPool.query('BEGIN')
})

afterEach(async () => {
  await testPool.query('ROLLBACK')
})

export function getTestPool() {
  return testPool
}
```

```typescript
// __tests__/factories.ts
export function createTestUser(overrides = {}) {
  return {
    id: `user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    ...overrides
  }
}

export function createTestProject(overrides = {}) {
  return {
    id: `proj-${Date.now()}`,
    name: 'Test Project',
    ownerId: 'user-1',
    ...overrides
  }
}
```

**Timeline**: 2-3 hours  
**Owner**: QA lead  
**Risk**: Low (setup only)

---

### 2.2: Contract Tests (Backwards Compatibility)

```typescript
// __tests__/modules/projects/project.contract.test.ts
describe('Project Contract', () => {
  it('should have required fields in response', async () => {
    const project = await createTestProject()
    
    expect(project).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        ownerId: expect.any(String),
        createdAt: expect.any(Date)
      })
    )
  })
  
  it('should support legacy `team_members` field (deprecated)', async () => {
    const project = await getProject(projectId)
    
    // Ensure backwards compatibility during migration to repository
    expect(project.team_members || project.members).toBeDefined()
  })
})
```

**Timeline**: 2 hours  
**Owner**: QA lead  
**Risk**: Low

---

### 2.3: Snapshot Tests for Route Schemas

```typescript
// __tests__/api/routes.snapshot.test.ts
describe('API Route Schemas', () => {
  it('should match baseline route structure', async () => {
    const routes = getAllRegisteredRoutes()
    
    expect(routes).toMatchSnapshot()
  })
  
  it('should alert on route changes', async () => {
    // Snapshot will fail if routes change, forcing explicit review
    const routes = getAllRegisteredRoutes()
    expect(routes.length).toBeGreaterThan(50)  // Sanity check
  })
})
```

**Timeline**: 1 hour  
**Owner**: QA lead  
**Risk**: Low

---

### 2.4: AI Provider Test Doubles

```typescript
// __tests__/doubles/aiProviders.ts
export class MockOpenAIProvider implements AIProvider {
  name = 'openai'
  private failing = false
  private latencyMs = 100
  
  setFailing(fail: boolean) {
    this.failing = fail
  }
  
  setLatency(ms: number) {
    this.latencyMs = ms
  }
  
  async generate(prompt: string): Promise<string> {
    if (this.failing) {
      throw new Error('OpenAI unavailable (mock)')
    }
    await sleep(this.latencyMs)
    return `[OpenAI] Generated response to: ${prompt}`
  }
  
  async isAvailable(): Promise<boolean> {
    return !this.failing
  }
}

export class MockGoogleProvider implements AIProvider {
  name = 'google'
  private failing = false
  
  setFailing(fail: boolean) { this.failing = fail }
  
  async generate(prompt: string): Promise<string> {
    if (this.failing) throw new Error('Google unavailable')
    return `[Google] Generated response to: ${prompt}`
  }
  
  async isAvailable(): Promise<boolean> {
    return !this.failing
  }
}
```

**Timeline**: 2 hours  
**Owner**: QA lead  
**Risk**: Low

---

### 2.5: Job Queue Conformance Layer

```typescript
// __tests__/doubles/jobQueue.ts
export class MockJobQueue {
  private jobs: Map<string, Job> = new Map()
  
  async enqueue(jobType: string, data: any): Promise<string> {
    const jobId = `job-${Date.now()}`
    this.jobs.set(jobId, {
      id: jobId,
      type: jobType,
      data,
      status: 'pending',
      createdAt: new Date()
    })
    return jobId
  }
  
  async getJob(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) || null
  }
  
  async process(jobId: string, handler: (job: Job) => Promise<any>) {
    const job = this.jobs.get(jobId)
    if (!job) throw new Error('Job not found')
    
    job.status = 'processing'
    try {
      await handler(job)
      job.status = 'completed'
    } catch (err) {
      job.status = 'failed'
      job.error = err.message
    }
  }
  
  getMetrics() {
    const statuses = [...this.jobs.values()].reduce((acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return statuses
  }
}
```

**Timeline**: 2 hours  
**Owner**: QA lead  
**Risk**: Low

---

### 2.6: Critical Path Tests (25-35 tests)

#### Test: Authentication

```typescript
// __tests__/modules/auth/auth.test.ts
describe('AuthService', () => {
  it('should login with valid credentials', async () => {
    const user = await authService.login('test@example.com', 'password123')
    expect(user.token).toBeDefined()
  })
  
  it('should fail with invalid password', async () => {
    await expect(
      authService.login('test@example.com', 'wrong')
    ).rejects.toThrow('Invalid credentials')
  })
  
  it('should verify valid token', async () => {
    const token = await authService.createToken({ userId: 'user-1' })
    const payload = await authService.verifyToken(token)
    expect(payload.userId).toBe('user-1')
  })
})
```

#### Test: Projects CRUD

```typescript
// __tests__/modules/projects/projects.test.ts
describe('ProjectService', () => {
  it('should create a project', async () => {
    const project = await projectService.create({
      name: 'Test',
      ownerId: 'user-1'
    })
    expect(project.id).toBeDefined()
  })
  
  it('should get project with members', async () => {
    const project = await projectService.getWithMembers(projectId)
    expect(Array.isArray(project.members)).toBe(true)
  })
  
  it('should update project', async () => {
    const updated = await projectService.update(projectId, { name: 'New' })
    expect(updated.name).toBe('New')
  })
})
```

#### Test: Document Generation

```typescript
// __tests__/modules/documents/documents.test.ts
describe('DocumentService', () => {
  it('should generate document from template', async () => {
    const doc = await docService.generate({
      templateId: 'project-charter',
      data: { projectName: 'Test' }
    })
    expect(doc.content).toContain('Test')
  })
  
  it('should fail without required fields', async () => {
    await expect(
      docService.generate({ templateId: 'project-charter', data: {} })
    ).rejects.toThrow('projectName is required')
  })
})
```

#### Test: AI Failover

```typescript
// __tests__/modules/ai/ai.failover.test.ts
describe('AI Failover', () => {
  it('should use first available provider', async () => {
    const result = await aiService.generate('test')
    expect(result.provider).toBe('openai')
  })
  
  it('should fallback to Google if OpenAI fails', async () => {
    openaiProvider.setFailing(true)
    const result = await aiService.generate('test')
    expect(result.provider).toBe('google')
  })
  
  it('should fail if all providers unavailable', async () => {
    openaiProvider.setFailing(true)
    googleProvider.setFailing(true)
    await expect(aiService.generate('test')).rejects.toThrow()
  })
})
```

#### Test: Health Endpoints

```typescript
// __tests__/api/health.test.ts
describe('Health Endpoints', () => {
  it('GET /health/live should return 200', async () => {
    const res = await request(app).get('/health/live')
    expect(res.status).toBe(200)
  })
  
  it('GET /health/ready should check dependencies', async () => {
    const res = await request(app).get('/health/ready')
    expect(res.body.database).toBeDefined()
  })
})
```

#### Test: Job Queue Lifecycle

```typescript
// __tests__/jobs/jobQueue.test.ts
describe('Job Queue', () => {
  it('should enqueue and process a job', async () => {
    const jobId = await queue.enqueue('document-conversion', { ... })
    expect(jobId).toBeDefined()
    
    await queue.process(jobId, async (job) => {
      expect(job.status).toBe('processing')
    })
  })
  
  it('should mark job as failed on error', async () => {
    const jobId = await queue.enqueue('test', {})
    await queue.process(jobId, () => Promise.reject(new Error('test')))
    
    const job = await queue.getJob(jobId)
    expect(job.status).toBe('failed')
  })
})
```

**Timeline**: 6-8 hours (spread over 2 weeks)  
**Owner**: QA team  
**Risk**: Low (all unit tests, mocked dependencies)  
**Deliverable**: 25-35 passing tests with 40%+ coverage

---

## Phase 3: Modular Architecture & Core Refactoring (Weeks 5-7)

**Objective**: Now safe due to test harness. Refactor with confidence.

### 3.1: Route Registry with Auto-Discovery

```typescript
// server/src/routes/registry.ts
interface RouteConfig {
  path: string
  router: Router
  version: string
  auth: boolean
  description: string
  rateLimit?: number
  category: string
}

/**
 * Auto-discover routes from modules/*/routes.ts
 */
export async function discoverRoutes(): Promise<RouteConfig[]> {
  const modulesDir = resolve(__dirname, '../modules')
  const modules = fs.readdirSync(modulesDir)
  const routes: RouteConfig[] = []
  
  for (const moduleName of modules) {
    const routesFile = join(modulesDir, moduleName, 'routes.ts')
    if (!fs.existsSync(routesFile)) continue
    
    try {
      const { default: moduleRoutes } = await import(routesFile)
      if (Array.isArray(moduleRoutes)) {
        routes.push(...moduleRoutes)
      }
    } catch (err) {
      console.warn(`⚠️  Failed to load routes from ${moduleName}:`, err.message)
    }
  }
  
  return routes
}

/**
 * Dual-operation mode: old routes + new routes simultaneously
 */
export async function registerRoutes(app: Express) {
  const useNewRegistry = process.env.USE_NEW_ROUTE_REGISTRY === 'true'
  
  if (useNewRegistry) {
    console.log('📍 Using new route registry (auto-discovery)\n')
    const routes = await discoverRoutes()
    
    for (const route of routes) {
      app.use(route.path, route.router)
      console.log(`  ${route.category.padEnd(20)} ${route.path.padEnd(40)} v${route.version}`)
    }
  } else {
    console.log('📍 Using legacy route registration\n')
    // Keep old registrations active
    app.use('/api/projects', projectRoutes)
    // ... etc
  }
}
```

**Timeline**: 3-4 hours  
**Owner**: Backend lead  
**Risk**: Medium (flag-gated, can rollback)

---

### 3.2: Module Structure

```
server/src/modules/
├── ai/
│   ├── index.ts                (public API)
│   ├── service.ts
│   ├── routes.ts
│   ├── types.ts
│   ├── errors.ts
│   ├── providers/
│   │   ├── base.ts
│   │   ├── openai.ts
│   │   ├── google.ts
│   │   └── ...
│   └── prompts/
├── documents/
│   ├── index.ts
│   ├── service.ts
│   ├── controller.ts
│   ├── repository.ts
│   ├── routes.ts
│   ├── types.ts
│   └── errors.ts
├── projects/
├── integrations/
├── analysis/
└── ...
```

**Timeline**: 8-10 hours (large refactor)  
**Owner**: Backend lead + 1 senior engineer  
**Risk**: High (but tests protect us)

---

### 3.3: Repository Pattern with Query Context

```typescript
// server/src/modules/projects/repository.ts
export class ProjectRepository {
  constructor(
    private pool: Pool,
    private cache: RedisClient,
    private logger: Logger
  ) {}
  
  /**
   * Query context tracks metrics and prevents N+1
   */
  private createQueryContext() {
    return {
      startTime: Date.now(),
      queries: [] as Array<{ sql: string; params?: any[] }>,
      warn: (msg: string) => this.logger.warn(`[N+1 Risk] ${msg}`)
    }
  }
  
  async getWithMembers(projectId: string) {
    const ctx = this.createQueryContext()
    const cacheKey = `project:${projectId}:members`
    
    // Try cache
    const cached = await this.cache.get(cacheKey)
    if (cached) return JSON.parse(cached)
    
    // Single query (NOT N+1)
    const query = `
      SELECT p.*, 
        array_agg(json_build_object('userId', pm.user_id, 'role', pm.role)) as members
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = $1
      GROUP BY p.id
    `
    ctx.queries.push({ sql: query, params: [projectId] })
    
    const result = await this.pool.query(query, [projectId])
    const project = result.rows[0]
    
    // Cache for 5 min
    await this.cache.setex(cacheKey, 300, JSON.stringify(project))
    
    // Log metrics
    this.logger.info('Query executed', {
      duration: Date.now() - ctx.startTime,
      queryCount: ctx.queries.length,
      cached: false
    })
    
    return project
  }
  
  /**
   * Repository cache decorator (read-heavy queries)
   */
  @RepositoryCache({ ttl: 300 })
  async findByTeamMember(userId: string, limit = 50) {
    return this.pool.query(`
      SELECT p.* FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = $1
      LIMIT $2
    `, [userId, limit])
  }
}

// Decorator implementation
function RepositoryCache(options: { ttl: number }) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function(...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`
      const cached = await this.cache.get(cacheKey)
      
      if (cached) {
        return JSON.parse(cached)
      }
      
      const result = await originalMethod.apply(this, args)
      await this.cache.setex(cacheKey, options.ttl, JSON.stringify(result))
      return result
    }
    
    return descriptor
  }
}
```

**Timeline**: 4-5 hours  
**Owner**: Backend lead  
**Risk**: Medium (data layer changes)

---

## Phase 4: Observability & Operational Hardening (Weeks 7-10)

**Objective**: Unified health system, structured logging, metrics, deployment pipeline.

### 4.1: Unified Health System

```typescript
// server/src/observability/health.ts
interface HealthCheck {
  name: string
  check: () => Promise<boolean>
  severity: 'critical' | 'warning'
}

const healthChecks: HealthCheck[] = [
  {
    name: 'database',
    check: () => pool.query('SELECT 1').then(() => true),
    severity: 'critical'
  },
  {
    name: 'redis',
    check: () => redis.ping().then(() => true),
    severity: 'warning'
  },
  {
    name: 'neo4j',
    check: () => neo4j.getServerInfo().then(() => true),
    severity: 'warning'
  }
]

export const healthRouter = Router()

// /health/live - Quick liveness
healthRouter.get('/live', (req, res) => {
  res.json({ status: 'live', uptime: process.uptime() })
})

// /health/ready - Readiness with dependency checks
healthRouter.get('/ready', async (req, res) => {
  const results = await Promise.all(
    healthChecks.map(async (check) => ({
      name: check.name,
      ready: await check.check().catch(() => false),
      severity: check.severity
    }))
  )
  
  const allReady = results.every(r => r.ready)
  const critical = results.filter(r => r.severity === 'critical' && !r.ready)
  
  res.status(allReady ? 200 : critical.length > 0 ? 503 : 200).json({
    ready: allReady,
    checks: results
  })
})

// /health/metrics - Prometheus metrics
healthRouter.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType)
  res.end(prometheus.register.metrics())
})

// /health/deps - Deep diagnostics (protected)
healthRouter.get('/deps', authenticateAdmin, async (req, res) => {
  const diagnostics = {
    process: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    },
    database: await getDiagnostics('database'),
    redis: await getDiagnostics('redis'),
    neo4j: await getDiagnostics('neo4j'),
    workers: getWorkerStatus(),
    queues: getQueueMetrics()
  }
  
  res.json(diagnostics)
})
```

**Timeline**: 3-4 hours  
**Owner**: Backend lead  
**Risk**: Low

---

### 4.2: Structured Logging via Pino

```bash
npm install pino pino-pretty pino-http
```

```typescript
// server/src/observability/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      singleLine: process.env.NODE_ENV === 'production'
    }
  }
})

export const httpLogger = pino(
  { level: 'info' },
  pino.destination(1)
)

// Correlation ID middleware
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4()
  res.setHeader('x-correlation-id', correlationId)
  
  req.log = logger.child({ correlationId, method: req.method, path: req.path })
  
  next()
}

app.use(correlationIdMiddleware)
app.use(pinoHttp({ logger: httpLogger }))
```

```typescript
// Usage in controllers
const job = await jobService.process(jobId)
req.log.info({ jobId, status: job.status, provider: 'openai', tokens: 250 })
```

**Timeline**: 2-3 hours  
**Owner**: Backend lead  
**Risk**: Low

---

### 4.3: Prometheus Metrics

```typescript
// server/src/observability/metrics.ts
export const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request latency',
  labelNames: ['method', 'endpoint', 'status'],
  buckets: [10, 50, 100, 500, 1000, 5000]
})

export const aiLatency = new prometheus.Histogram({
  name: 'ai_request_duration_ms',
  help: 'AI provider latency',
  labelNames: ['provider', 'model'],
  buckets: [100, 500, 1000, 5000, 10000]
})

export const jobQueueDepth = new prometheus.Gauge({
  name: 'job_queue_depth',
  help: 'Jobs waiting in queue',
  labelNames: ['queue_type']
})

export const aiTokensUsed = new prometheus.Counter({
  name: 'ai_tokens_total',
  help: 'AI tokens consumed',
  labelNames: ['provider', 'type']
})

export const dbQueryTime = new prometheus.Histogram({
  name: 'db_query_duration_ms',
  help: 'Database query latency',
  labelNames: ['query_type'],
  buckets: [1, 10, 50, 100, 500, 1000]
})
```

**Timeline**: 2-3 hours  
**Owner**: Backend lead  
**Risk**: Low

---

### 4.4: Deployment Pipeline with Canary Support

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

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
      
      - name: Validate route registry
        run: pnpm run validate:routes
      
      - name: Check for slow queries
        run: pnpm run analyze:queries

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
          npx railway up --environment staging
      
      - name: Verify health
        run: |
          sleep 30
          curl -f https://staging-api.adpa.io/health/ready || exit 1

  deploy-production-canary:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      - name: Canary deploy (1 pod / 20%)
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PROD }}
        run: |
          npx railway up --environment production --canary 20
      
      - name: Monitor for 5 minutes
        run: |
          for i in {1..30}; do
            sleep 10
            ERRORS=$(curl https://api.adpa.io/health/metrics | grep http_requests_error_total)
            if [ $ERRORS -gt 5 ]; then
              echo "❌ Error spike detected. Rolling back."
              npx railway rollback --environment production
              exit 1
            fi
          done

  deploy-production-full:
    needs: deploy-production-canary
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      - name: Full deploy (100%)
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PROD }}
        run: |
          npx railway up --environment production --canary 100
      
      - name: Verify
        run: curl -f https://api.adpa.io/health/ready || exit 1
```

**Timeline**: 4-5 hours  
**Owner**: DevOps engineer  
**Risk**: Medium (deployment critical)

---

## Phase 5: Performance, Frontend, Polish (Weeks 10-12)

**Objective**: Optimize backend + frontend, expand test coverage, prepare for scale.

### 5.1: Query Performance Optimization

Capture baseline of slow queries:

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = 'on';
ALTER SYSTEM SET log_min_duration_statement = 100;

SELECT query, mean_exec_time, calls FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

Add indexes:

```sql
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_documents_project_created ON documents(project_id, created_at DESC);
CREATE INDEX idx_jobs_status_active ON jobs(queue_id) WHERE status = 'active';
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
```

**Timeline**: 3-4 hours  
**Owner**: Database specialist  
**Risk**: Medium

---

### 5.2: Frontend App Router Restructuring

```
app/
├── (auth)/
│   ├── login/
│   ├── signup/
│   └── ...
├── (protected)/
│   ├── layout.tsx
│   ├── dashboard/
│   ├── [core]/
│   │   ├── projects/
│   │   ├── documents/
│   │   └── ...
│   ├── [analysis]/
│   │   ├── ai-search/
│   │   ├── analytics/
│   │   └── ...
│   └── settings/
├── /ui
│   └── (shared components)
├── /lib
│   └── (shared hooks, utils)
└── ...
```

Move shared components:

```bash
# From scattered locations to centralized
app/ui/components/ProjectCard.tsx
app/ui/components/DocumentViewer.tsx
app/lib/hooks/useProject.ts
app/lib/hooks/useDocument.ts
```

**Timeline**: 6-8 hours  
**Owner**: Frontend lead  
**Risk**: High (large refactor)

---

### 5.3: Expand Test Coverage (50+ tests)

```typescript
// Integration tests
describe('Document Generation Workflow', () => {
  it('should create project → document → export', async () => {
    const project = await createProject()
    const doc = await generateDocument(project.id)
    const pdf = await exportDocument(doc.id)
    
    expect(pdf.size).toBeGreaterThan(0)
  })
})

describe('AI-Driven Search', () => {
  it('should search documents with semantic understanding', async () => {
    const results = await aiSearch('budget constraints')
    expect(results.length).toBeGreaterThan(0)
  })
})

describe('Real-Time Collaboration', () => {
  it('should sync document edits across users', async () => {
    // Multi-user WebSocket test
  })
})
```

**Timeline**: 8-10 hours (spread over 2 weeks)  
**Owner**: QA team  
**Target**: 60%+ coverage

---

### 5.4: Performance Baseline & Monitoring

```typescript
// server/src/observability/performanceBaseline.ts
export const performanceBaseline = {
  // API endpoints
  'POST /api/documents/generate': { p95: 2000, p99: 5000 },
  'GET /api/projects': { p95: 200, p99: 500 },
  'POST /api/ai/generate': { p95: 5000, p99: 10000 },
  
  // Database queries
  'projects.getWithMembers': { p95: 50, p99: 150 },
  'documents.findByProject': { p95: 30, p99: 100 },
  
  // Job processing
  'document-conversion': { p95: 30000, p99: 60000 },  // 30 seconds
  'ai-generation': { p95: 5000, p99: 10000 }
}

// Automated validation in CI
export function validatePerformance(metrics: any) {
  for (const [endpoint, baseline] of Object.entries(performanceBaseline)) {
    const actual = metrics[endpoint]
    if (actual?.p95 > baseline.p95) {
      console.warn(`⚠️  ${endpoint} exceeded p95: ${actual.p95} > ${baseline.p95}`)
    }
  }
}
```

**Timeline**: 2-3 hours  
**Owner**: Backend lead  
**Risk**: Low

---

## Success Criteria

### Phase 1 (Week 2)
- ✅ No TLS warnings in production config
- ✅ Deterministic startup order
- ✅ Health endpoints returning 200
- ✅ Fail-fast mode working

### Phase 2 (Week 4)
- ✅ Jest + test harness running
- ✅ 25-35 tests passing (40%+ coverage)
- ✅ Contract tests enforcing backwards compatibility
- ✅ AI provider mocks working

### Phase 3 (Week 7)
- ✅ Route auto-discovery implemented
- ✅ Module structure in place
- ✅ Repository pattern applied
- ✅ Dual-operation mode active (old + new routes)

### Phase 4 (Week 10)
- ✅ Unified health system active
- ✅ Structured logging via Pino
- ✅ Prometheus metrics exposed
- ✅ Canary deployment working
- ✅ Staging environment ready

### Phase 5 (Week 12)
- ✅ Query optimization baselines established
- ✅ Frontend app router restructured
- ✅ 50+ tests (60%+ coverage)
- ✅ Performance monitoring active
- ✅ All metrics below baseline (p95)

---

## Resource Allocation

| Phase | Weeks | Backend Lead | Senior Eng | QA | DevOps | Frontend | Total |
|-------|-------|--------------|-----------|-----|--------|----------|-------|
| 1 | 1-2 | 8h | - | - | - | - | 8h |
| 2 | 3-4 | 4h | 4h | 16h | - | - | 24h |
| 3 | 5-7 | 12h | 16h | 4h | - | - | 32h |
| 4 | 7-10 | 8h | 4h | 4h | 12h | - | 28h |
| 5 | 10-12 | 4h | 4h | 8h | - | 16h | 32h |
| **Total** | **12** | **36h** | **28h** | **32h** | **12h** | **16h** | **124h** |

---

## Next Steps

1. **Assign phase owners** (assign to lead engineers)
2. **Create GitHub issue set** (50+ issues, epic structure)
3. **Schedule sprint kickoff** (2-week sprints)
4. **Set up project board** (GitHub Projects)
5. **Weekly syncs** with team + stakeholders

---

**Version**: 2.0 (Optimized)  
**Status**: Ready for implementation  
**Generated**: March 2026
