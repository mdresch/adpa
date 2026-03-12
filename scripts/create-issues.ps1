# PowerShell Script to create ADPA GitHub Issues

function Create-Issue {
    param(
        [string]$Title,
        [string]$Body,
        [string]$Labels
    )
    Write-Host "Creating: $Title"
    gh issue create --title $Title --body $Body --label $Labels
}

# PHASE 2: TEST HARNESS (Weeks 3-4)
Create-Issue -Title "[Phase 2.1] Setup Jest, Supertest, and DB Transaction Sandbox" `
    -Body "## Description`nBuild the foundational testing infrastructure with transaction-based database isolation.`n`n## Implementation Notes`n- Install: Jest, ts-jest, Supertest, jest-mock-extended`n- Create jest.config.ts with TypeScript support`n- Create __tests__/setup.ts with database sandbox`n`n## Acceptance Criteria`n- [ ] Jest configured with ts-jest`n- [ ] __tests__/setup.ts implements BEGIN/ROLLBACK for every test`n- [ ] getTestPool() utility provides access to test database`n- [ ] npm run test runs all tests in __tests__/**/*.test.ts`n- [ ] npm run test:coverage generates coverage report`n- [ ] Coverage threshold: 40% (global)`n`n## Definition of Done`n- [ ] npm run test runs successfully`n- [ ] Coverage report generated`n- [ ] Code review approved`n`n## Story Points: 5" `
    -Labels "type:testing,priority:critical,phase:2"

Create-Issue -Title "[Phase 2.2] Implement AI Provider Test Doubles & Job Queue Mocks" `
    -Body "## Description`nCreate mocks for OpenAI, Google, and BullMQ/Job logic to allow offline, deterministic testing.`n`n## Implementation Notes`n- Create __tests__/doubles/aiProviders.ts`n- Create __tests__/doubles/jobQueue.ts`n- Implement AIProvider interface for mocks`n`n## Acceptance Criteria`n- [ ] MockOpenAIProvider allows setting simulated latency and failure states`n- [ ] MockGoogleProvider, MockAnthropicProvider implemented`n- [ ] Mock Job Queue tracks job status in-memory for testing`n- [ ] Mocks support: enqueue(), getJob(), process(), getMetrics()`n- [ ] All mocks implement required interfaces`n`n## Definition of Done`n- [ ] Mocks tested and working`n- [ ] Code review approved`n`n## Story Points: 3" `
    -Labels "type:testing,priority:high,phase:2"

Create-Issue -Title "[Phase 2.3] Write Critical Path Tests - Auth, Projects, AI Failover" `
    -Body "## Description`nImplement 25-35 tests covering core user journeys: authentication, project CRUD, and AI failover.`n`n## Implementation Notes`n- Create __tests__/modules/auth/auth.test.ts`n- Create __tests__/modules/projects/projects.test.ts`n- Create __tests__/modules/documents/documents.test.ts`n- Create __tests__/modules/ai/ai.failover.test.ts`n- Create __tests__/api/health.test.ts`n- Create __tests__/jobs/jobQueue.test.ts`n`n## Test Coverage`n- Auth: Login, Token Verification, Password Failure`n- Projects: CRUD operations, version conflict handling`n- Documents: Generation, template validation`n- AI: Failover logic (OpenAI → Google → Anthropic)`n- Health: Live, Ready endpoints`n- Jobs: Enqueue, process, error handling`n`n## Acceptance Criteria`n- [ ] 25-35 tests total`n- [ ] Minimum 40% line coverage achieved`n- [ ] All tests passing`n- [ ] No flaky tests`n`n## Definition of Done`n- [ ] All tests passing`n- [ ] Coverage report shows 40%+`n- [ ] Code review approved`n`n## Story Points: 10" `
    -Labels "type:testing,priority:high,phase:2"

# PHASE 3: MODULAR REFACTORING (Weeks 5-7)
Create-Issue -Title "[Phase 3.1] Route Registry with Auto-Discovery" `
    -Body "## Description`nReplace manual route registration with automated scanner that looks for modules/*/routes.ts.`n`n## Implementation Notes`n- Create server/src/routes/registry.ts`n- Implement discoverRoutes() utility`n- Support USE_NEW_ROUTE_REGISTRY flag for dual-operation mode`n`n## Acceptance Criteria`n- [ ] discoverRoutes() scans modules/*/routes.ts`n- [ ] Support dual-operation mode (old + new routes simultaneously)`n- [ ] Route metadata required: path, version, auth, description, category`n- [ ] Logs show all discovered routes at startup`n- [ ] Old routes still active under flag (backwards compatible)`n- [ ] No breaking changes to existing API`n`n## Definition of Done`n- [ ] Tests passing`n- [ ] Dual-operation mode working`n- [ ] Code review approved`n`n## Story Points: 5" `
    -Labels "type:architecture,priority:high,phase:3"

Create-Issue -Title "[Phase 3.2] Module Extraction & Repository Pattern" `
    -Body "## Description`nMigrate logic from monolithic controllers into scoped modules (/ai, /documents, /projects, /integrations, /analysis).`n`n## Implementation Notes`n- Create server/src/modules/ directory structure`n- Create index.ts for each module (public API)`n- Create service.ts, repository.ts, routes.ts, types.ts, errors.ts per module`n- Implement Query Context for tracing`n- Implement @RepositoryCache decorator`n`n## Modules to Create`n- [ ] ai/ (with providers: openai, google, anthropic, ollama, etc.)`n- [ ] documents/ (with repository pattern)`n- [ ] projects/ (with repository pattern)`n- [ ] integrations/ (confluence, sharepoint, github)`n- [ ] analysis/ (analytics, drift, search)`n`n## Acceptance Criteria`n- [ ] All 80+ routes organized into modules`n- [ ] No circular dependencies`n- [ ] All tests passing`n- [ ] Backwards compatibility maintained`n- [ ] Query Context implemented for all repositories`n- [ ] @RepositoryCache decorator working`n`n## Definition of Done`n- [ ] All tests passing`n- [ ] TypeScript strict mode enabled`n- [ ] Code review approved`n`n## Story Points: 12" `
    -Labels "type:refactor,priority:high,phase:3"

Create-Issue -Title "[Phase 3.3] Extract Repositories with Query Context & Caching" `
    -Body "## Description`nMove all database queries to repository layer with caching and N+1 prevention.`n`n## Implementation Notes`n- Create ProjectRepository, DocumentRepository, etc.`n- Add Query Context for tracing + metrics`n- Add @RepositoryCache decorator for read-heavy queries`n- Prevent N+1 queries during development (echo warnings)`n`n## Acceptance Criteria`n- [ ] All CRUD operations in repositories`n- [ ] Query Context logs duration and query count`n- [ ] @RepositoryCache decorator working`n- [ ] Redis caching enabled (5 min TTL)`n- [ ] No N+1 queries detected`n- [ ] All existing queries return same results`n`n## Definition of Done`n- [ ] All tests passing`n- [ ] No query regressions`n- [ ] Code review approved`n`n## Story Points: 8" `
    -Labels "type:refactor,priority:high,phase:3"

# PHASE 4: OBSERVABILITY & OPERATIONS (Weeks 7-10)
Create-Issue -Title "[Phase 4.1] Unified Health & Diagnostics System" `
    -Body "## Description`nCreate a unified health router providing /live, /ready, /metrics, and /deps endpoints.`n`n## Implementation Notes`n- Consolidate health checks from Phase 1`n- Add Prometheus metrics endpoint`n- Add deep diagnostics for admins`n`n## Endpoints`n- [ ] GET /health/live - Quick liveness (< 10ms)`n- [ ] GET /health/ready - Dependency checks (< 100ms)`n- [ ] GET /health/metrics - Prometheus metrics`n- [ ] GET /health/deps - Deep diagnostics (admin only)`n`n## Acceptance Criteria`n- [ ] All endpoints return JSON`n- [ ] Liveness returns < 10ms`n- [ ] Readiness returns < 100ms`n- [ ] Diagnostics include process, memory, workers, queues`n- [ ] All tests passing`n`n## Definition of Done`n- [ ] All tests passing`n- [ ] Endpoints verified with curl`n- [ ] Code review approved`n`n## Story Points: 4" `
    -Labels "type:ops,priority:high,phase:4"

Create-Issue -Title "[Phase 4.2] Structured Logging with Pino & Correlation IDs" `
    -Body "## Description`nReplace console.log with structured logging and ensure every request has unique correlation ID.`n`n## Implementation Notes`n- Install pino + pino-pretty`n- Create logger instance in server/src/observability/logger.ts`n- Add correlation ID middleware`n- Update 20+ high-value log calls`n`n## Acceptance Criteria`n- [ ] Logs include: timestamp, level, correlationId, message, data`n- [ ] Production: single-line JSON logs`n- [ ] Development: pretty-printed with colors`n- [ ] Correlation IDs persist through HTTP calls and Job logs`n- [ ] All tests passing`n`n## Definition of Done`n- [ ] Logs output correctly in dev and prod modes`n- [ ] Code review approved`n`n## Story Points: 3" `
    -Labels "type:ops,priority:high,phase:4"

Create-Issue -Title "[Phase 4.3] Expose Prometheus Metrics" `
    -Body "## Description`nAdd Prometheus metrics for HTTP requests, AI latency, job queue, and database queries.`n`n## Implementation Notes`n- Install prom-client`n- Create server/src/observability/metrics.ts`n- Expose at GET /health/metrics`n`n## Metrics to Add`n- [ ] http_request_duration_ms (histogram)`n- [ ] ai_request_duration_ms (histogram)`n- [ ] job_queue_depth (gauge)`n- [ ] ai_tokens_total (counter)`n- [ ] db_query_duration_ms (histogram)`n- [ ] ai_cost_estimate_usd (counter)`n`n## Acceptance Criteria`n- [ ] Metrics collected during requests`n- [ ] /metrics returns Prometheus format`n- [ ] All tests passing`n- [ ] Ready for Prometheus scraping`n`n## Definition of Done`n- [ ] Metrics verified with curl /metrics`n- [ ] Code review approved`n`n## Story Points: 4" `
    -Labels "type:ops,priority:high,phase:4"

Create-Issue -Title "[Phase 4.4] Deployment Pipeline with Canary Support" `
    -Body "## Description`nUpdate GitHub Actions to support canary deployments and automated health monitoring.`n`n## Implementation Notes`n- Create .github/workflows/deploy.yml`n- Implement 5-stage deployment process`n- Add validation gates and error spike detection`n`n## Deployment Stages`n- [ ] Stage 1: Test (lint, coverage, build)`n- [ ] Stage 2: Deploy to staging`n- [ ] Stage 3: Deploy canary (20% traffic) to production`n- [ ] Stage 4: Monitor for 5 minutes (error spike detection)`n- [ ] Stage 5: Full deploy (100%)`n`n## Acceptance Criteria`n- [ ] Workflow runs successfully on main branch pushes`n- [ ] Staging deploy verified before production`n- [ ] Canary deploy works with 20% traffic split`n- [ ] Auto-rollback on error spike`n- [ ] CI validates: route drift, schema drift, slow queries`n`n## Definition of Done`n- [ ] Workflow runs successfully`n- [ ] Staging deploy verified`n- [ ] Code review approved`n`n## Story Points: 5" `
    -Labels "type:devops,priority:critical,phase:4"

Create-Issue -Title "[Phase 4.5] Setup Staging Environment" `
    -Body "## Description`nCreate separate Railway staging environment for testing deployments before production.`n`n## Implementation Notes`n- Create railway-staging.json`n- Separate database, Redis, Neo4j, RabbitMQ instances`n- Configure staging endpoint: https://staging-api.adpa.io`n`n## Acceptance Criteria`n- [ ] Staging environment created in Railway`n- [ ] Separate database (staging_adpa)`n- [ ] Deploy pipeline targets staging first`n- [ ] Run smoke tests on staging deploy`n- [ ] All dependencies (DB, Redis, Neo4j, RabbitMQ) separate from prod`n`n## Definition of Done`n- [ ] Staging environment created`n- [ ] Deploy pipeline targeting staging works`n- [ ] Code review approved`n`n## Story Points: 3" `
    -Labels "type:devops,priority:high,phase:4"

# PHASE 5: OPTIMIZATION & POLISH (Weeks 10-12)
Create-Issue -Title "[Phase 5.1] Query Performance Optimization & Indexing" `
    -Body "## Description`nIdentify and optimize top 10 slowest queries based on pg_stat_statements.`n`n## Implementation Notes`n- Enable PostgreSQL query logging`n- Capture slow query baseline`n- Create indexes for high-traffic queries`n- Verify with EXPLAIN ANALYZE`n`n## Acceptance Criteria`n- [ ] Enable query logging: log_min_duration_statement = 100ms`n- [ ] Capture top 10 slow queries baseline`n- [ ] Create indexes for owner_id, project_id, job_status`n- [ ] All P95 latencies for core queries < 100ms`n- [ ] Performance improvement: 30%+ vs baseline`n- [ ] Re-baseline after optimization`n`n## Definition of Done`n- [ ] Baseline captured and documented`n- [ ] Indexes created and tested`n- [ ] Performance re-baseline shows improvement`n- [ ] Code review approved`n`n## Story Points: 4" `
    -Labels "type:performance,priority:high,phase:5"

Create-Issue -Title "[Phase 5.2] Frontend App Router Restructuring" `
    -Body "## Description`nClean up 35+ directories by adopting Segmented Layouts in Next.js App Router.`n`n## Implementation Notes`n- Reorganize app/ directory structure`n- Move shared components to /app/ui`n- Move shared hooks to /app/lib`n- Group core routes under (protected) and (auth)`n`n## New Structure`napp/`n├── (auth)/`n├── (protected)/`n│   ├── [core]/`n│   ├── [analysis]/`n│   └── [admin]/`n├── /ui`n└── /lib`n`n## Acceptance Criteria`n- [ ] No route functionality changed`n- [ ] All E2E tests passing`n- [ ] Navigation works correctly`n- [ ] Build succeeds`n- [ ] No performance regression`n`n## Definition of Done`n- [ ] E2E tests passing`n- [ ] Manual verification of all routes`n- [ ] Code review approved`n`n## Story Points: 6" `
    -Labels "type:frontend,priority:high,phase:5"

Create-Issue -Title "[Phase 5.3] Expand Test Coverage to 50+ Tests (60%+ Coverage)" `
    -Body "## Description`nWrite integration and E2E tests for main workflows beyond Phase 2 critical paths.`n`n## Implementation Notes`n- Write integration tests for document generation, AI search, real-time collaboration`n- Write E2E tests for full user journeys`n- Target: 50+ tests total (25-35 from Phase 2 + 15-20 new)`n`n## Test Categories`n- [ ] Integration: Document generation workflow`n- [ ] Integration: AI-driven search`n- [ ] Integration: Real-time collaboration`n- [ ] E2E: Complete user journey (signup -> project -> document)`n- [ ] E2E: Export functionality`n- [ ] E2E: Settings persistence`n`n## Acceptance Criteria`n- [ ] 50+ tests total`n- [ ] Coverage: 60%+ globally`n- [ ] All tests passing`n- [ ] No flaky tests`n`n## Definition of Done`n- [ ] All tests passing consistently`n- [ ] Coverage report shows 60%+`n- [ ] Code review approved`n`n## Story Points: 8" `
    -Labels "type:testing,priority:medium,phase:5"

Create-Issue -Title "[Phase 5.4] Establish Performance Baseline & Monitoring" `
    -Body "## Description`nDocument performance baselines and add real-time monitoring with Grafana.`n`n## Implementation Notes`n- Document API response time baselines (p95, p99)`n- Document database query baselines`n- Document job processing baselines`n- Create performance validation in CI`n- Setup Grafana dashboard`n`n## Acceptance Criteria`n- [ ] Baselines documented in code`n- [ ] Performance validation in CI`n- [ ] Alert on regression (e.g., p95 > baseline + 10%)`n- [ ] Grafana dashboard created for real-time monitoring`n- [ ] All metrics visible in /health/metrics`n`n## Definition of Done`n- [ ] Baselines documented`n- [ ] Monitoring active`n- [ ] Code review approved`n`n## Story Points: 3" `
    -Labels "type:ops,priority:medium,phase:5"
