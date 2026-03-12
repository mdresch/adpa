#!/bin/bash

# GitHub Issues Automation Script for ADPA Optimized Implementation Plan
# This script creates all 34 GitHub issues using the GitHub CLI (gh)
#
# Prerequisites:
#   1. GitHub CLI installed: https://cli.github.com
#   2. Authenticated: gh auth login
#   3. Run from project root: ./scripts/create-issues.sh
#
# Usage:
#   ./scripts/create-issues.sh [--repo OWNER/REPO] [--dry-run] [--verbose]
#
# Options:
#   --repo OWNER/REPO    Override repository (default: auto-detect from git)
#   --dry-run            Print issues without creating them
#   --verbose            Show detailed output for each issue
#   --help               Show this help message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO=""
DRY_RUN=false
VERBOSE=false
CREATED_COUNT=0
FAILED_COUNT=0

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)
      REPO="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      grep "^#" "$0" | head -20
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Helper functions
print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Detect repo if not provided
if [ -z "$REPO" ]; then
  REPO=$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')
  if [ -z "$REPO" ]; then
    print_error "Could not auto-detect repository. Use --repo OWNER/REPO"
    exit 1
  fi
fi

print_header "ADPA GitHub Issues Creator"
echo "Repository: ${BLUE}$REPO${NC}"
echo "Dry Run: ${BLUE}$DRY_RUN${NC}"
echo ""

# Verify gh CLI
if ! command -v gh &> /dev/null; then
  print_error "GitHub CLI (gh) not found. Install from: https://cli.github.com"
  exit 1
fi

# Verify authentication
if ! gh auth status > /dev/null 2>&1; then
  print_error "Not authenticated with GitHub. Run: gh auth login"
  exit 1
fi

print_success "GitHub CLI authenticated"

# ============================================================================
# PHASE 1: STABILIZATION (Weeks 1-2)
# ============================================================================

create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  
  if [ "$DRY_RUN" = true ]; then
    echo "---"
    echo "Title: $title"
    echo "Labels: $labels"
    echo "Body:"
    echo "$body"
    echo "---"
    ((CREATED_COUNT++))
    return
  fi
  
  if [ "$VERBOSE" = true ]; then
    echo "Creating: $title"
  fi
  
  if gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$labels" > /dev/null 2>&1; then
    ((CREATED_COUNT++))
    [ "$VERBOSE" = true ] && print_success "Created: $title"
  else
    ((FAILED_COUNT++))
    print_error "Failed to create: $title"
  fi
}

print_header "Phase 1: Stabilization (Weeks 1-2)"

create_issue \
  "[Phase 1.1] Implement Startup Dependency Graph & Fail-Fast Mode" \
  "## Description
Implement a deterministic initialization order for server startup to prevent race conditions (e.g., workers starting before DB is ready).

## Implementation Notes
- Create \`server/src/startup/dependencyGraph.ts\`
- Implement \`Dependency\` interface with \`init\`, \`validate\`, and \`critical\` flag
- Add \`FAIL_FAST_MODE\` environment variable logic
- Support 6 dependencies: database, redis, neo4j, rabbitmq, ai-providers, workers

## Acceptance Criteria
- [ ] Server refuses to boot if a \`critical: true\` dependency fails validation
- [ ] Startup summary is printed to console on boot
- [ ] Timeouts are enforced for each dependency initialization (configurable)
- [ ] \`npm run dev\` completes without 'waiting...' logs
- [ ] Tests passing for dependency graph logic

## Definition of Done
- [ ] Code review approved
- [ ] Tests passing
- [ ] Merged to main
- [ ] Verified in local development

## Story Points: 3" \
  "type:infrastructure,priority:critical,phase:1"

create_issue \
  "[Phase 1.2] Security Hardening - TLS & Config Validation" \
  "## Description
Ensure production environments cannot bypass TLS verification.

## Implementation Notes
- Create \`server/src/startup/validateConfig.ts\`
- Add validation in startup sequence
- Document environment variable safety

## Acceptance Criteria
- [ ] \`validateSecurityConfig()\` throws error if \`NODE_TLS_REJECT_UNAUTHORIZED=0\` in production
- [ ] \`.env.example\` updated with safe defaults
- [ ] Startup graph includes security validation step
- [ ] No TLS warnings in logs for production

## Definition of Done
- [ ] Configuration documented
- [ ] Code review approved
- [ ] Tests passing

## Story Points: 1" \
  "type:security,priority:critical,phase:1"

create_issue \
  "[Phase 1.3] Add Basic Health Endpoints" \
  "## Description
Add \`/health/live\` and \`/health/ready\` endpoints for orchestration and monitoring.

## Implementation Notes
- Create \`server/src/routes/health.ts\`
- Integrate with dependency graph from 1.1

## Acceptance Criteria
- [ ] GET \`/health/live\` returns \`{ status: 'live', timestamp, uptime }\`
- [ ] GET \`/health/ready\` checks database, redis, neo4j
- [ ] Returns 200 if all ready, 503 if critical dep down
- [ ] Endpoints accessible without authentication
- [ ] Response time < 50ms

## Definition of Done
- [ ] Tests passing
- [ ] Manually verified with curl
- [ ] Code review approved

## Story Points: 2" \
  "type:infrastructure,priority:high,phase:1"

# ============================================================================
# PHASE 2: TEST HARNESS (Weeks 3-4)
# ============================================================================

print_header "Phase 2: Test Harness & Safety Net (Weeks 3-4)"

create_issue \
  "[Phase 2.1] Setup Jest, Supertest, and DB Transaction Sandbox" \
  "## Description
Build the foundational testing infrastructure with transaction-based database isolation.

## Implementation Notes
- Install: Jest, ts-jest, Supertest, jest-mock-extended
- Create \`jest.config.ts\` with TypeScript support
- Create \`__tests__/setup.ts\` with database sandbox

## Acceptance Criteria
- [ ] Jest configured with ts-jest
- [ ] \`__tests__/setup.ts\` implements BEGIN/ROLLBACK for every test
- [ ] \`getTestPool()\` utility provides access to test database
- [ ] \`npm run test\` runs all tests in \`__tests__/**/*.test.ts\`
- [ ] \`npm run test:coverage\` generates coverage report
- [ ] Coverage threshold: 40% (global)

## Definition of Done
- [ ] \`npm run test\` runs successfully
- [ ] Coverage report generated
- [ ] Code review approved

## Story Points: 5" \
  "type:testing,priority:critical,phase:2"

create_issue \
  "[Phase 2.2] Implement AI Provider Test Doubles & Job Queue Mocks" \
  "## Description
Create mocks for OpenAI, Google, and BullMQ/Job logic to allow offline, deterministic testing.

## Implementation Notes
- Create \`__tests__/doubles/aiProviders.ts\`
- Create \`__tests__/doubles/jobQueue.ts\`
- Implement AIProvider interface for mocks

## Acceptance Criteria
- [ ] MockOpenAIProvider allows setting simulated latency and failure states
- [ ] MockGoogleProvider, MockAnthropicProvider implemented
- [ ] Mock Job Queue tracks job status in-memory for testing
- [ ] Mocks support: enqueue(), getJob(), process(), getMetrics()
- [ ] All mocks implement required interfaces

## Definition of Done
- [ ] Mocks tested and working
- [ ] Code review approved

## Story Points: 3" \
  "type:testing,priority:high,phase:2"

create_issue \
  "[Phase 2.3] Write Critical Path Tests - Auth, Projects, AI Failover" \
  "## Description
Implement 25-35 tests covering core user journeys: authentication, project CRUD, and AI failover.

## Implementation Notes
- Create \`__tests__/modules/auth/auth.test.ts\`
- Create \`__tests__/modules/projects/projects.test.ts\`
- Create \`__tests__/modules/documents/documents.test.ts\`
- Create \`__tests__/modules/ai/ai.failover.test.ts\`
- Create \`__tests__/api/health.test.ts\`
- Create \`__tests__/jobs/jobQueue.test.ts\`

## Test Coverage
- Auth: Login, Token Verification, Password Failure
- Projects: CRUD operations, version conflict handling
- Documents: Generation, template validation
- AI: Failover logic (OpenAI → Google → Anthropic)
- Health: Live, Ready endpoints
- Jobs: Enqueue, process, error handling

## Acceptance Criteria
- [ ] 25-35 tests total
- [ ] Minimum 40% line coverage achieved
- [ ] All tests passing
- [ ] No flaky tests

## Definition of Done
- [ ] All tests passing
- [ ] Coverage report shows 40%+
- [ ] Code review approved

## Story Points: 10" \
  "type:testing,priority:high,phase:2"

# ============================================================================
# PHASE 3: MODULAR REFACTORING (Weeks 5-7)
# ============================================================================

print_header "Phase 3: Modular Refactoring (Weeks 5-7)"

create_issue \
  "[Phase 3.1] Route Registry with Auto-Discovery" \
  "## Description
Replace manual route registration with automated scanner that looks for \`modules/*/routes.ts\`.

## Implementation Notes
- Create \`server/src/routes/registry.ts\`
- Implement \`discoverRoutes()\` utility
- Support \`USE_NEW_ROUTE_REGISTRY\` flag for dual-operation mode

## Acceptance Criteria
- [ ] \`discoverRoutes()\` scans \`modules/*/routes.ts\`
- [ ] Support dual-operation mode (old + new routes simultaneously)
- [ ] Route metadata required: path, version, auth, description, category
- [ ] Logs show all discovered routes at startup
- [ ] Old routes still active under flag (backwards compatible)
- [ ] No breaking changes to existing API

## Definition of Done
- [ ] Tests passing
- [ ] Dual-operation mode working
- [ ] Code review approved

## Story Points: 5" \
  "type:architecture,priority:high,phase:3"

create_issue \
  "[Phase 3.2] Module Extraction & Repository Pattern" \
  "## Description
Migrate logic from monolithic controllers into scoped modules (/ai, /documents, /projects, /integrations, /analysis).

## Implementation Notes
- Create \`server/src/modules/\` directory structure
- Create index.ts for each module (public API)
- Create service.ts, repository.ts, routes.ts, types.ts, errors.ts per module
- Implement Query Context for tracing
- Implement @RepositoryCache decorator

## Modules to Create
- [ ] ai/ (with providers: openai, google, anthropic, ollama, etc.)
- [ ] documents/ (with repository pattern)
- [ ] projects/ (with repository pattern)
- [ ] integrations/ (confluence, sharepoint, github)
- [ ] analysis/ (analytics, drift, search)

## Acceptance Criteria
- [ ] All 80+ routes organized into modules
- [ ] No circular dependencies
- [ ] All tests passing
- [ ] Backwards compatibility maintained
- [ ] Query Context implemented for all repositories
- [ ] @RepositoryCache decorator working

## Definition of Done
- [ ] All tests passing
- [ ] TypeScript strict mode enabled
- [ ] Code review approved

## Story Points: 12" \
  "type:refactor,priority:high,phase:3"

create_issue \
  "[Phase 3.3] Extract Repositories with Query Context & Caching" \
  "## Description
Move all database queries to repository layer with caching and N+1 prevention.

## Implementation Notes
- Create ProjectRepository, DocumentRepository, etc.
- Add Query Context for tracing + metrics
- Add @RepositoryCache decorator for read-heavy queries
- Prevent N+1 queries during development (echo warnings)

## Acceptance Criteria
- [ ] All CRUD operations in repositories
- [ ] Query Context logs duration and query count
- [ ] @RepositoryCache decorator working
- [ ] Redis caching enabled (5 min TTL)
- [ ] No N+1 queries detected
- [ ] All existing queries return same results

## Definition of Done
- [ ] All tests passing
- [ ] No query regressions
- [ ] Code review approved

## Story Points: 8" \
  "type:refactor,priority:high,phase:3"

# ============================================================================
# PHASE 4: OBSERVABILITY & OPERATIONS (Weeks 7-10)
# ============================================================================

print_header "Phase 4: Observability & Operations (Weeks 7-10)"

create_issue \
  "[Phase 4.1] Unified Health & Diagnostics System" \
  "## Description
Create a unified health router providing /live, /ready, /metrics, and /deps endpoints.

## Implementation Notes
- Consolidate health checks from Phase 1
- Add Prometheus metrics endpoint
- Add deep diagnostics for admins

## Endpoints
- [ ] GET \`/health/live\` - Quick liveness (< 10ms)
- [ ] GET \`/health/ready\` - Dependency checks (< 100ms)
- [ ] GET \`/health/metrics\` - Prometheus metrics
- [ ] GET \`/health/deps\` - Deep diagnostics (admin only)

## Acceptance Criteria
- [ ] All endpoints return JSON
- [ ] Liveness returns < 10ms
- [ ] Readiness returns < 100ms
- [ ] Diagnostics include process, memory, workers, queues
- [ ] All tests passing

## Definition of Done
- [ ] All tests passing
- [ ] Endpoints verified with curl
- [ ] Code review approved

## Story Points: 4" \
  "type:ops,priority:high,phase:4"

create_issue \
  "[Phase 4.2] Structured Logging with Pino & Correlation IDs" \
  "## Description
Replace console.log with structured logging and ensure every request has unique correlation ID.

## Implementation Notes
- Install pino + pino-pretty
- Create logger instance in \`server/src/observability/logger.ts\`
- Add correlation ID middleware
- Update 20+ high-value log calls

## Acceptance Criteria
- [ ] Logs include: timestamp, level, correlationId, message, data
- [ ] Production: single-line JSON logs
- [ ] Development: pretty-printed with colors
- [ ] Correlation IDs persist through HTTP calls and Job logs
- [ ] All tests passing

## Definition of Done
- [ ] Logs output correctly in dev and prod modes
- [ ] Code review approved

## Story Points: 3" \
  "type:ops,priority:high,phase:4"

create_issue \
  "[Phase 4.3] Expose Prometheus Metrics" \
  "## Description
Add Prometheus metrics for HTTP requests, AI latency, job queue, and database queries.

## Implementation Notes
- Install prom-client
- Create \`server/src/observability/metrics.ts\`
- Expose at GET \`/health/metrics\`

## Metrics to Add
- [ ] http_request_duration_ms (histogram)
- [ ] ai_request_duration_ms (histogram)
- [ ] job_queue_depth (gauge)
- [ ] ai_tokens_total (counter)
- [ ] db_query_duration_ms (histogram)
- [ ] ai_cost_estimate_usd (counter)

## Acceptance Criteria
- [ ] Metrics collected during requests
- [ ] \`/metrics\` returns Prometheus format
- [ ] All tests passing
- [ ] Ready for Prometheus scraping

## Definition of Done
- [ ] Metrics verified with curl /metrics
- [ ] Code review approved

## Story Points: 4" \
  "type:ops,priority:high,phase:4"

create_issue \
  "[Phase 4.4] Deployment Pipeline with Canary Support" \
  "## Description
Update GitHub Actions to support canary deployments and automated health monitoring.

## Implementation Notes
- Create \`.github/workflows/deploy.yml\`
- Implement 5-stage deployment process
- Add validation gates and error spike detection

## Deployment Stages
- [ ] Stage 1: Test (lint, coverage, build)
- [ ] Stage 2: Deploy to staging
- [ ] Stage 3: Deploy canary (20% traffic) to production
- [ ] Stage 4: Monitor for 5 minutes (error spike detection)
- [ ] Stage 5: Full deploy (100%)

## Acceptance Criteria
- [ ] Workflow runs successfully on main branch pushes
- [ ] Staging deploy verified before production
- [ ] Canary deploy works with 20% traffic split
- [ ] Auto-rollback on error spike
- [ ] CI validates: route drift, schema drift, slow queries

## Definition of Done
- [ ] Workflow runs successfully
- [ ] Staging deploy verified
- [ ] Code review approved

## Story Points: 5" \
  "type:devops,priority:critical,phase:4"

create_issue \
  "[Phase 4.5] Setup Staging Environment" \
  "## Description
Create separate Railway staging environment for testing deployments before production.

## Implementation Notes
- Create \`railway-staging.json\`
- Separate database, Redis, Neo4j, RabbitMQ instances
- Configure staging endpoint: https://staging-api.adpa.io

## Acceptance Criteria
- [ ] Staging environment created in Railway
- [ ] Separate database (staging_adpa)
- [ ] Deploy pipeline targets staging first
- [ ] Run smoke tests on staging deploy
- [ ] All dependencies (DB, Redis, Neo4j, RabbitMQ) separate from prod

## Definition of Done
- [ ] Staging environment created
- [ ] Deploy pipeline targeting staging works
- [ ] Code review approved

## Story Points: 3" \
  "type:devops,priority:high,phase:4"

# ============================================================================
# PHASE 5: OPTIMIZATION & POLISH (Weeks 10-12)
# ============================================================================

print_header "Phase 5: Optimization & Polish (Weeks 10-12)"

create_issue \
  "[Phase 5.1] Query Performance Optimization & Indexing" \
  "## Description
Identify and optimize top 10 slowest queries based on pg_stat_statements.

## Implementation Notes
- Enable PostgreSQL query logging
- Capture slow query baseline
- Create indexes for high-traffic queries
- Verify with EXPLAIN ANALYZE

## Acceptance Criteria
- [ ] Enable query logging: log_min_duration_statement = 100ms
- [ ] Capture top 10 slow queries baseline
- [ ] Create indexes for owner_id, project_id, job_status
- [ ] All P95 latencies for core queries < 100ms
- [ ] Performance improvement: 30%+ vs baseline
- [ ] Re-baseline after optimization

## Definition of Done
- [ ] Baseline captured and documented
- [ ] Indexes created and tested
- [ ] Performance re-baseline shows improvement
- [ ] Code review approved

## Story Points: 4" \
  "type:performance,priority:high,phase:5"

create_issue \
  "[Phase 5.2] Frontend App Router Restructuring" \
  "## Description
Clean up 35+ directories by adopting Segmented Layouts in Next.js App Router.

## Implementation Notes
- Reorganize app/ directory structure
- Move shared components to /app/ui
- Move shared hooks to /app/lib
- Group core routes under (protected) and (auth)

## New Structure
\`\`\`
app/
├── (auth)/
├── (protected)/
│   ├── [core]/
│   ├── [analysis]/
│   └── [admin]/
├── /ui
└── /lib
\`\`\`

## Acceptance Criteria
- [ ] No route functionality changed
- [ ] All E2E tests passing
- [ ] Navigation works correctly
- [ ] Build succeeds
- [ ] No performance regression

## Definition of Done
- [ ] E2E tests passing
- [ ] Manual verification of all routes
- [ ] Code review approved

## Story Points: 6" \
  "type:frontend,priority:high,phase:5"

create_issue \
  "[Phase 5.3] Expand Test Coverage to 50+ Tests (60%+ Coverage)" \
  "## Description
Write integration and E2E tests for main workflows beyond Phase 2 critical paths.

## Implementation Notes
- Write integration tests for document generation, AI search, real-time collaboration
- Write E2E tests for full user journeys
- Target: 50+ tests total (25-35 from Phase 2 + 15-20 new)

## Test Categories
- [ ] Integration: Document generation workflow
- [ ] Integration: AI-driven search
- [ ] Integration: Real-time collaboration
- [ ] E2E: Complete user journey (signup → project → document)
- [ ] E2E: Export functionality
- [ ] E2E: Settings persistence

## Acceptance Criteria
- [ ] 50+ tests total
- [ ] Coverage: 60%+ globally
- [ ] All tests passing
- [ ] No flaky tests

## Definition of Done
- [ ] All tests passing consistently
- [ ] Coverage report shows 60%+
- [ ] Code review approved

## Story Points: 8" \
  "type:testing,priority:medium,phase:5"

create_issue \
  "[Phase 5.4] Establish Performance Baseline & Monitoring" \
  "## Description
Document performance baselines and add real-time monitoring with Grafana.

## Implementation Notes
- Document API response time baselines (p95, p99)
- Document database query baselines
- Document job processing baselines
- Create performance validation in CI
- Setup Grafana dashboard

## Acceptance Criteria
- [ ] Baselines documented in code
- [ ] Performance validation in CI
- [ ] Alert on regression (e.g., p95 > baseline + 10%)
- [ ] Grafana dashboard created for real-time monitoring
- [ ] All metrics visible in /health/metrics

## Definition of Done
- [ ] Baselines documented
- [ ] Monitoring active
- [ ] Code review approved

## Story Points: 3" \
  "type:ops,priority:medium,phase:5"

# ============================================================================
# Summary
# ============================================================================

print_header "Summary"

if [ "$DRY_RUN" = true ]; then
  echo "Dry run mode: No issues created"
  echo "Issues to be created: $CREATED_COUNT"
else
  print_success "Issues created: $CREATED_COUNT"
  if [ $FAILED_COUNT -gt 0 ]; then
    print_error "Failed: $FAILED_COUNT"
  fi
fi

echo ""
echo "Repository: ${BLUE}$REPO${NC}"
echo ""

if [ "$DRY_RUN" = false ] && [ $CREATED_COUNT -gt 0 ]; then
  echo "Next steps:"
  echo "  1. View issues: ${BLUE}gh issue list --repo $REPO${NC}"
  echo "  2. Create project board: ${BLUE}gh project create --repo $REPO${NC}"
  echo "  3. Add issues to project: ${BLUE}gh issue edit <issue_number> --add-project <project_number>${NC}"
fi

exit $FAILED_COUNT
