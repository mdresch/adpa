# GitHub Issues - ADPA Technical Improvements (Optimized Plan)

This file contains all issues structured by phase and epic. Copy these into your GitHub project board.

---

## EPIC 1: Stabilization (Weeks 1-2)

### Issue 1.1: Implement Startup Dependency Graph
- **Phase**: 1
- **Priority**: Critical
- **Story Points**: 3
- **Assignee**: Backend Lead
- **Description**:
  Create a deterministic startup initialization order using a dependency graph (DAG).
  
  **Acceptance Criteria**:
  - [ ] Create `server/src/startup/dependencyGraph.ts`
  - [ ] Define dependencies: database, redis, neo4j, rabbitmq, ai-providers, workers
  - [ ] Each dependency has: name, init(), validate(), critical flag, timeout
  - [ ] `initializeInOrder()` runs all deps in sequence
  - [ ] Critical deps cause process.exit(1) if unstable
  - [ ] Logs show clear status: ✅ ready, ⚠️ degraded, ❌ failed
  - [ ] `npm run dev` completes without "waiting..." logs
  
  **Definition of Done**:
  - [ ] Tests passing
  - [ ] No "waiting..." logs in startup
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 1.2: Add Fail-Fast Mode Config
- **Phase**: 1
- **Priority**: High
- **Story Points**: 1
- **Assignee**: Backend Lead
- **Description**:
  Add environment variable to control strict startup validation.
  
  **Acceptance Criteria**:
  - [ ] Add `FAIL_FAST_MODE` to .env.development (default: false)
  - [ ] Add `FAIL_FAST_MODE` to .env.production (default: true)
  - [ ] Update .env.example with documentation
  - [ ] Startup validation uses flag to determine behavior
  
  **Definition of Done**:
  - [ ] Configs documented
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 1.3: Add TLS Security Hardening
- **Phase**: 1
- **Priority**: Critical
- **Story Points**: 2
- **Assignee**: Backend Lead
- **Description**:
  Ensure TLS verification is never disabled in production.
  
  **Acceptance Criteria**:
  - [ ] Create `server/src/startup/validateConfig.ts`
  - [ ] Startup throws error if `NODE_TLS_REJECT_UNAUTHORIZED=0` in production
  - [ ] Update .env.development to document dev-only settings
  - [ ] .env.production does NOT set the variable (default: 1)
  - [ ] .env.example warns about production safety
  - [ ] Startup validation runs before DB connection
  
  **Definition of Done**:
  - [ ] Tests passing
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 1.4: Create Basic Health Endpoints
- **Phase**: 1
- **Priority**: High
- **Story Points**: 2
- **Assignee**: Backend Lead
- **Description**:
  Add `/health/live` and `/health/ready` endpoints for orchestration.
  
  **Acceptance Criteria**:
  - [x] GET `/health/live` returns `{ status: 'live', timestamp, uptime }`
  - [x] GET `/health/ready` checks database, redis, neo4j
  - [x] Returns 200 if all ready, 503 if critical dep down
  - [x] Endpoints accessible without authentication
  - [x] Response time < 50ms
  
  **Definition of Done**:
  - [x] Tests passing
  - [x] Manually verified with curl
  - [x] Code review approved
  - [x] Merged to main

---

## EPIC 2: Test Harness (Weeks 3-4)

### Issue 2.1: Setup Jest + Supertest + Database Sandbox
- **Phase**: 2
- **Priority**: Critical
- **Story Points**: 5
- **Assignee**: QA Lead
- **Description**:
  Establish testing infrastructure with transaction-based database isolation.
  
  **Acceptance Criteria**:
  - [ ] Install Jest, ts-jest, Supertest, jest-mock-extended
  - [ ] Create `jest.config.ts` with TypeScript support
  - [ ] Create `__tests__/setup.ts` with database sandbox
  - [ ] Per-test transactions (beginEach, rollbackAfterEach)
  - [ ] Test database URL from env or default localhost
  - [ ] `npm run test` runs all tests in `__tests__/**/*.test.ts`
  - [ ] `npm run test:watch` runs in watch mode
  - [ ] `npm run test:coverage` generates coverage report
  - [ ] Coverage threshold: 40% (global)
  
  **Definition of Done**:
  - [ ] `npm run test` runs successfully
  - [ ] Coverage report generated
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 2.2: Create Test Factories & Utilities
- **Phase**: 2
- **Priority**: High
- **Story Points**: 3
- **Assignee**: QA Lead
- **Description**:
  Build test data factories for consistent test setup.
  
  **Acceptance Criteria**:
  - [ ] Create `__tests__/factories.ts`
  - [ ] Factory functions: createTestUser(), createTestProject(), createTestDocument()
  - [ ] Each factory generates unique IDs and timestamps
  - [ ] Factories support overrides: `createTestProject({ name: 'Custom' })`
  - [ ] Create `__tests__/helpers.ts` for common assertions
  - [ ] Helper: compareProjectFields(), compareDocumentFields()
  
  **Definition of Done**:
  - [ ] Factories tested manually
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 2.3: Implement AI Provider Test Doubles
- **Phase**: 2
- **Priority**: High
- **Story Points**: 3
- **Assignee**: QA Lead
- **Description**:
  Create mock AI providers for testing failover and generation.
  
  **Acceptance Criteria**:
  - [ ] Create `__tests__/doubles/aiProviders.ts`
  - [ ] MockOpenAIProvider, MockGoogleProvider, MockAnthropicProvider
  - [ ] Each mock has: setFailing(bool), setLatency(ms), generate(), isAvailable()
  - [ ] Mocks implement AIProvider interface
  - [ ] Track call counts and arguments for assertions
  
  **Definition of Done**:
  - [ ] Mocks tested and working
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 2.4: Implement Job Queue Conformance Layer
- **Phase**: 2
- **Priority**: High
- **Story Points**: 3
- **Assignee**: QA Lead
- **Description**:
  Create mock job queue for testing job lifecycle.
  
  **Acceptance Criteria**:
  - [ ] Create `__tests__/doubles/jobQueue.ts`
  - [ ] MockJobQueue: enqueue(), getJob(), process()
  - [ ] Track job status: pending → processing → completed/failed
  - [ ] Support error handling (job.status = 'failed')
  - [ ] getMetrics() returns queue depth by status
  
  **Definition of Done**:
  - [ ] Mock tested and working
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 2.5: Write Authentication Tests (5-7 tests)
- **Phase**: 2
- **Priority**: High
- **Story Points**: 4
- **Assignee**: QA Lead
- **Description**:
  Test login, token verification, and authentication failures.
  
  **Tests**:
  - [ ] login with valid credentials
  - [ ] login with invalid password
  - [ ] login with non-existent user
  - [ ] verifyToken with valid token
  - [ ] verifyToken with expired token
  - [ ] verifyToken with tampered token
  - [ ] createToken returns valid JWT
  
  **Definition of Done**:
  - [ ] All tests passing
  - [ ] Coverage: 80%+ for auth module
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 2.6: Write Projects CRUD Tests (5-7 tests)
- **Phase**: 2
- **Priority**: High
- **Story Points**: 4
- **Assignee**: QA Lead
- **Description**:
  Test project creation, retrieval, update, deletion.
  
  **Tests**:
  - [ ] create project with valid data
  - [ ] create project fails without required fields
  - [ ] get project with members
  - [ ] get project returns null for nonexistent
  - [ ] update project fields
  - [ ] update fails with version conflict
  - [ ] delete project
  
  **Definition of Done**:
  - [ ] All tests passing
  - [ ] Coverage: 80%+ for projects module
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 2.7: Write Document Generation Tests (4-6 tests)
- **Phase**: 2
- **Priority**: High
- **Story Points**: 4
- **Assignee**: QA Lead
- **Description**:
  Test document generation from templates with AI enrichment.
  
  **Tests**:
  - [ ] generate document from template
  - [ ] generate fails without required data
  - [ ] generate with AI enrichment enabled
  - [ ] generate with custom provider preference
  - [ ] generated document has content + metadata
  
  **Definition of Done**:
  - [ ] All tests passing
  - [ ] Coverage: 80%+ for documents module
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 2.8: Write AI Failover Tests (4-5 tests)
- **Phase**: 2
- **Priority**: Critical
- **Story Points**: 4
- **Assignee**: QA Lead
- **Description**:
  Test AI provider failover and error handling.
  
  **Tests**:
  - [ ] failover uses first available provider
  - [ ] failover to second provider if first fails
  - [ ] failover to third provider if first two fail
  - [ ] failover fails if all providers unavailable
  - [ ] failover respects provider priority order
  
  **Definition of Done**:
  - [ ] All tests passing
  - [ ] Coverage: 90%+ for AI failover logic
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 2.9: Write Health Endpoint Tests (3 tests)
- **Phase**: 2
- **Priority**: High
- **Story Points**: 2
- **Assignee**: QA Lead
- **Description**:
  Test health endpoints with Supertest.
  
  **Tests**:
  - [ ] GET /health/live returns 200
  - [ ] GET /health/ready checks dependencies
  - [ ] GET /health/ready returns 503 if critical dep down
  
  **Definition of Done**:
  - [ ] All tests passing
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 2.10: Write Job Queue Lifecycle Tests (3-4 tests)
- **Phase**: 2
- **Priority**: High
- **Story Points**: 3
- **Assignee**: QA Lead
- **Description**:
  Test job enqueue, processing, and error handling.
  
  **Tests**:
  - [ ] enqueue job and process successfully
  - [ ] mark job as failed on error
  - [ ] track job status lifecycle
  - [ ] getMetrics() returns queue depth
  
  **Definition of Done**:
  - [ ] All tests passing
  - [ ] Code review approved
  - [ ] Merged to main

---

## EPIC 3: Modular Architecture (Weeks 5-7)

### Issue 3.1: Implement Route Auto-Discovery
- **Phase**: 3
- **Priority**: High
- **Story Points**: 5
- **Assignee**: Backend Lead
- **Description**:
  Create route registry with auto-discovery from modules.
  
  **Acceptance Criteria**:
  - [ ] Create `server/src/routes/registry.ts`
  - [ ] `discoverRoutes()` scans `modules/*/routes.ts`
  - [ ] Dual-operation mode: `USE_NEW_ROUTE_REGISTRY=true|false` flag
  - [ ] Route metadata: path, version, auth, description, category
  - [ ] Logs show all discovered routes at startup
  - [ ] Old routes still active under flag (backwards compatible)
  - [ ] No breaking changes to existing API
  
  **Definition of Done**:
  - [ ] Tests passing
  - [ ] Dual-operation mode working (old routes still active)
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 3.2: Create Module Structure
- **Phase**: 3
- **Priority**: Critical
- **Story Points**: 8
- **Assignee**: Backend Lead + Senior Eng
- **Description**:
  Refactor services into module structure.
  
  **Modules to Create**:
  - [ ] `server/src/modules/ai/`
  - [ ] `server/src/modules/documents/`
  - [ ] `server/src/modules/projects/`
  - [ ] `server/src/modules/integrations/`
  - [ ] `server/src/modules/analysis/`
  
  **Per Module**:
  - [ ] Create index.ts (public API)
  - [ ] Create service.ts, routes.ts, types.ts, errors.ts
  - [ ] Export only public interfaces
  - [ ] Document module contract
  
  **Acceptance Criteria**:
  - [ ] All 80+ routes organized into modules
  - [ ] No circular dependencies
  - [ ] All tests passing
  - [ ] Backwards compatibility maintained
  
  **Definition of Done**:
  - [ ] All tests passing
  - [ ] TypeScript strict mode enabled
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 3.3: Extract Projects Repository
- **Phase**: 3
- **Priority**: High
- **Story Points**: 4
- **Assignee**: Backend Lead
- **Description**:
  Move project queries to repository with caching + query context.
  
  **Acceptance Criteria**:
  - [ ] Create `server/src/modules/projects/repository.ts`
  - [ ] Methods: getWithMembers(), findByTeamMember(), findByIds(), update()
  - [ ] Add query context for tracing + metrics
  - [ ] Add @RepositoryCache decorator for read-heavy queries
  - [ ] Prevent N+1 queries (single query for members, not loop)
  - [ ] Cache results in Redis (5 min TTL)
  - [ ] Update routes to use repository
  - [ ] All existing queries return same results (verified by tests)
  
  **Definition of Done**:
  - [ ] All tests passing
  - [ ] No query regressions
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 3.4: Extract Documents Repository
- **Phase**: 3
- **Priority**: High
- **Story Points**: 4
- **Assignee**: Backend Lead + Senior Eng
- **Description**:
  Move document queries to repository with optimization.
  
  **Acceptance Criteria**:
  - [ ] Create `server/src/modules/documents/repository.ts`
  - [ ] Methods: getByProject(), getWithContent(), update(), delete()
  - [ ] Optimize queries (batch operations, avoid N+1)
  - [ ] Add query context for metrics
  - [ ] Cache read-heavy queries
  - [ ] All tests passing
  - [ ] No performance regressions
  
  **Definition of Done**:
  - [ ] All tests passing
  - [ ] Performance baseline met
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 3.5: Refactor AI Service to Module
- **Phase**: 3
- **Priority**: High
- **Story Points**: 6
- **Assignee**: Backend Lead + Senior Eng
- **Description**:
  Isolate AI providers and failover logic into module.
  
  **Acceptance Criteria**:
  - [ ] Create `server/src/modules/ai/service.ts`
  - [ ] Create `server/src/modules/ai/providers/` (openai, google, anthropic, ollama, etc.)
  - [ ] Each provider implements AIProvider interface
  - [ ] Failover logic: try providers in order, skip unavailable
  - [ ] Track provider latency and cost
  - [ ] All tests passing (especially failover)
  - [ ] No functionality loss
  
  **Definition of Done**:
  - [ ] All tests passing
  - [ ] AI failover tests all green
  - [ ] Code review approved
  - [ ] Merged to main

---

## EPIC 4: Observability & Operations (Weeks 7-10)

### Issue 4.1: Implement Unified Health System
- **Phase**: 4
- **Priority**: High
- **Story Points**: 4
- **Assignee**: Backend Lead
- **Description**:
  Merge health checks, readiness, metrics into single system.
  
  **Endpoints**:
  - [ ] GET `/health/live` - quick liveness
  - [ ] GET `/health/ready` - dependency checks
  - [ ] GET `/health/metrics` - Prometheus metrics
  - [ ] GET `/health/deps` - deep diagnostics (admin only)
  
  **Acceptance Criteria**:
  - [ ] All endpoints return JSON
  - [ ] Liveness returns < 10ms
  - [ ] Readiness returns < 100ms
  - [ ] Diagnostics include process, memory, workers, queues
  - [ ] All tests passing
  
  **Definition of Done**:
  - [ ] All tests passing
  - [ ] Endpoints verified with curl
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 4.2: Setup Structured Logging via Pino
- **Phase**: 4
- **Priority**: High
- **Story Points**: 3
- **Assignee**: Backend Lead
- **Description**:
  Replace console.log with structured logging.
  
  **Acceptance Criteria**:
  - [ ] Install pino + pino-pretty
  - [ ] Create logger instance in `server/src/observability/logger.ts`
  - [ ] Add correlation ID middleware
  - [ ] Each request gets unique correlationId
  - [ ] Logs include: timestamp, level, correlationId, message, data
  - [ ] Production: single-line JSON logs
  - [ ] Development: pretty-printed with colors
  - [ ] Update 20+ high-value log calls
  
  **Definition of Done**:
  - [ ] Logs output correctly in dev and prod modes
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 4.3: Expose Prometheus Metrics
- **Phase**: 4
- **Priority**: High
- **Story Points**: 4
- **Assignee**: Backend Lead
- **Description**:
  Add Prometheus metrics for HTTP, AI, jobs, database.
  
  **Metrics**:
  - [ ] http_request_duration_ms (histogram)
  - [ ] ai_request_duration_ms (histogram)
  - [ ] job_queue_depth (gauge)
  - [ ] ai_tokens_total (counter)
  - [ ] db_query_duration_ms (histogram)
  - [ ] Expose at GET `/health/metrics`
  
  **Acceptance Criteria**:
  - [ ] Metrics collected during requests
  - [ ] `/metrics` returns Prometheus format
  - [ ] All tests passing
  - [ ] Ready for Prometheus scraping
  
  **Definition of Done**:
  - [ ] Metrics verified with curl /metrics
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 4.4: Create Deployment Pipeline with Canary Support
- **Phase**: 4
- **Priority**: Critical
- **Story Points**: 5
- **Assignee**: DevOps Engineer
- **Description**:
  Setup GitHub Actions with staging, canary, and full production deploys.
  
  **Acceptance Criteria**:
  - [ ] Create `.github/workflows/deploy.yml`
  - [ ] Stage 1: Test (lint, coverage, build)
  - [ ] Stage 2: Deploy to staging
  - [ ] Stage 3: Deploy canary (20% traffic) to production
  - [ ] Stage 4: Monitor for 5 minutes (error spike detection)
  - [ ] Stage 5: Full deploy (100%)
  - [ ] Auto-migrations in staging, manual gate for production
  - [ ] CI validates: route drift, schema drift, slow queries
  - [ ] Rollback on error spike
  
  **Definition of Done**:
  - [ ] Workflow runs successfully
  - [ ] Staging deploy verified
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 4.5: Setup Staging Environment
- **Phase**: 4
- **Priority**: High
- **Story Points**: 3
- **Assignee**: DevOps Engineer
- **Description**:
  Create staging Railway environment separate from production.
  
  **Acceptance Criteria**:
  - [ ] Create `railway-staging.json`
  - [ ] Separate database (staging_adpa)
  - [ ] Separate Redis, Neo4j, RabbitMQ instances
  - [ ] Staging endpoint: https://staging-api.adpa.io
  - [ ] Deploy to staging before production
  - [ ] Run smoke tests on staging deploy
  
  **Definition of Done**:
  - [ ] Staging environment created
  - [ ] Deploy pipeline targeting staging works
  - [ ] Code review approved
  - [ ] Merged to main

---

## EPIC 5: Performance & Polish (Weeks 10-12)

### Issue 5.1: Query Performance Optimization
- **Phase**: 5
- **Priority**: High
- **Story Points**: 4
- **Assignee**: Database Specialist
- **Description**:
  Identify and optimize slow queries.
  
  **Acceptance Criteria**:
  - [ ] Enable PostgreSQL query logging (log_min_duration_statement = 100ms)
  - [ ] Capture top 10 slow queries baseline
  - [ ] Create indexes for high-traffic queries
  - [ ] Verify query plans with EXPLAIN ANALYZE
  - [ ] Add caching for read-heavy queries (Redis)
  - [ ] Re-baseline after optimization
  - [ ] Performance improvement: 30%+
  
  **Definition of Done**:
  - [ ] Baseline captured and documented
  - [ ] Indexes created and tested
  - [ ] Performance re-baseline shows improvement
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 5.2: Frontend App Router Restructuring
- **Phase**: 5
- **Priority**: Medium
- **Story Points**: 6
- **Assignee**: Frontend Lead
- **Description**:
  Reorganize 35+ directories into logical hierarchy.
  
  **New Structure**:
  - [ ] app/(auth)/ - public routes
  - [ ] app/(protected)/ - authenticated routes with layout
  - [ ] app/(protected)/[core]/ - core features (projects, documents)
  - [ ] app/(protected)/[analysis]/ - analysis features
  - [ ] app/(protected)/[admin]/ - admin features
  - [ ] app/ui/ - shared components
  - [ ] app/lib/ - shared hooks, utils
  
  **Acceptance Criteria**:
  - [ ] No route functionality changed
  - [ ] All E2E tests passing
  - [ ] Navigation works correctly
  - [ ] Build succeeds
  - [ ] No performance regression
  
  **Definition of Done**:
  - [ ] E2E tests passing
  - [ ] Manual verification of all routes
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 5.3: Expand Test Coverage (50+ tests)
- **Phase**: 5
- **Priority**: Medium
- **Story Points**: 6
- **Assignee**: QA Team
- **Description**:
  Write integration and E2E tests for main workflows.
  
  **Test Categories**:
  - [ ] Integration: Document generation workflow
  - [ ] Integration: AI-driven search
  - [ ] Integration: Real-time collaboration
  - [ ] E2E: Complete user journey (signup → project → document)
  - [ ] E2E: Export functionality
  - [ ] E2E: Settings persistence
  
  **Acceptance Criteria**:
  - [ ] 50+ tests total (25-35 from Phase 2 + 15-20 new)
  - [ ] Coverage: 60%+ globally
  - [ ] All tests passing
  - [ ] No flaky tests
  
  **Definition of Done**:
  - [ ] All tests passing consistently
  - [ ] Coverage report shows 60%+
  - [ ] Code review approved
  - [ ] Merged to main

---

### Issue 5.4: Establish Performance Baseline & Monitoring
- **Phase**: 5
- **Priority**: Medium
- **Story Points**: 2
- **Assignee**: Backend Lead
- **Description**:
  Document performance baselines and add monitoring.
  
  **Acceptance Criteria**:
  - [ ] Document API response time baselines (p95, p99)
  - [ ] Document database query baselines
  - [ ] Document job processing baselines
  - [ ] Create performance validation in CI
  - [ ] Alert on regression (e.g., p95 > baseline + 10%)
  - [ ] Setup Grafana dashboard for real-time monitoring
  
  **Definition of Done**:
  - [ ] Baselines documented
  - [ ] Monitoring active
  - [ ] Code review approved
  - [ ] Merged to main

---

## Summary

**Total Issues**: 34 + 4 optional = 38  
**Total Effort**: 120-160 hours  
**Critical Path**: Issues 1.1, 1.3, 2.1, 3.1, 3.2, 4.4  

### Timeline
- **Weeks 1-2**: Phase 1 (5 issues)
- **Weeks 3-4**: Phase 2 (10 issues)
- **Weeks 5-7**: Phase 3 (5 issues)
- **Weeks 7-10**: Phase 4 (5 issues)
- **Weeks 10-12**: Phase 5 (4 issues)

### Recommended Sprint Structure
- **Sprint 1** (2 weeks): Phase 1 + prep for Phase 2
- **Sprint 2** (2 weeks): Phase 2 core tests
- **Sprint 3** (2 weeks): Phase 3 refactoring
- **Sprint 4** (2 weeks): Phase 4 observability
- **Sprint 5** (2 weeks): Phase 5 polish
- **Sprint 6** (2 weeks): Buffer + optimization

---

**Ready to copy into GitHub Issues**. Each issue includes:
- Clear description
- Acceptance criteria (checkboxes)
- Definition of done
- Story points for planning
