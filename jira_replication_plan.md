# Jira Replication Plan (Issues 609 - 623)

This document provides the necessary details to replicate GitHub issues 609 through 623 into Jira. Each issue is formatted with standard Jira fields.

## EPIC 2: Test Harness (Issues 609 - 618)

### [ADPA-609] Setup Jest + Supertest + Database Sandbox

**Summary**: Establish testing infrastructure with transaction-based database isolation.

**Priority**: Critical  
**Story Points**: 5

**Description**: Install and configure the core testing framework for the backend.

**Acceptance Criteria**:
- Install Jest, ts-jest, Supertest, jest-mock-extended
- Create `jest.config.ts` with TypeScript support
- Create `__tests__/setup.ts` with basic environment config
- Implement per-test transactions (beginEach, rollbackAfterEach)
- Configure test database URL from env or default localhost
- Ensure `npm run test` runs all tests in `**/*.test.ts`
- Ensure `npm run test:coverage` generates coverage reports

---

### [ADPA-610] Create Test Factories & Utilities

**Summary**: Build test data factories for consistent test setup.

**Priority**: High  
**Story Points**: 3

**Description**: Create reusable factories to generate mock data for tests.

**Acceptance Criteria**:
- Create `__tests__/factories.ts`
- Implement factory functions: `createTestUser()`, `createTestProject()`, `createTestDocument()`
- Ensure each factory generates unique IDs and timestamps
- Support overrides in factories: `createTestProject({ name: 'Custom' })`
- Create `__tests__/helpers.ts` for common assertions

---

### [ADPA-611] Implement AI Provider Test Doubles

**Summary**: Create mock AI providers for testing failover and generation.

**Priority**: High  
**Story Points**: 3

**Description**: Implement mock objects for AI providers to test logic without real API calls.

**Acceptance Criteria**:
- Create `__tests__/doubles/aiProviders.ts`
- Implement `MockOpenAIProvider`, `MockGoogleProvider`, `MockAnthropicProvider`
- Add controls: `setFailing(bool)`, `setLatency(ms)`, `generate()`, `isAvailable()`
- Ensure mocks implement `AIProvider` interface
- Track call counts and arguments for assertions

---

### [ADPA-612] Implement Job Queue Conformance Layer

**Summary**: Create mock job queue for testing job lifecycle.

**Priority**: High  
**Story Points**: 3

**Description**: Mock the job queue to verify job processing logic.

**Acceptance Criteria**:
- Create `__tests__/doubles/jobQueue.ts`
- Implement `MockJobQueue`: `enqueue()`, `getJob()`, `process()`
- Track job status: pending → processing → completed/failed
- Support error handling (`job.status = 'failed'`)
- `getMetrics()` returns queue depth by status

---

### [ADPA-613] Write Authentication Tests

**Summary**: Test login, token verification, and authentication failures.

**Priority**: High  
**Story Points**: 4

**Description**: Comprehensive unit and integration tests for the authentication module.

**Acceptance Criteria**:
- Test login with valid/invalid credentials
- Test login with non-existent user
- Test `verifyToken` with valid, expired, and tampered tokens
- Verify `createToken` returns valid JWT
- Coverage: 80%+ for auth module

---

### [ADPA-614] Write Projects CRUD Tests

**Summary**: Test project creation, retrieval, update, deletion.

**Priority**: High  
**Story Points**: 4

**Description**: Ensure all basic operations for projects are fully tested.

**Acceptance Criteria**:
- Test project creation with valid/invalid data
- Test get project with members
- Test get project for nonexistent IDs
- Test updating project fields and version conflicts
- Test project deletion
- Coverage: 80%+ for projects module

---

### [ADPA-615] Write Document Generation Tests

**Summary**: Test document generation from templates with AI enrichment.

**Priority**: High  
**Story Points**: 4

**Description**: Verify the core document generation workflow.

**Acceptance Criteria**:
- Test generation from template with required data
- Test failure cases (missing data)
- Test AI enrichment and custom provider preferences
- Verify generated document metadata and content
- Coverage: 80%+ for documents module

---

### [ADPA-616] Write AI Failover Tests

**Summary**: Test AI provider failover and error handling.

**Priority**: Critical  
**Story Points**: 4

**Description**: Verify that the system gracefully handles AI provider outages.

**Acceptance Criteria**:
- Test failover to first available provider
- Test sequential failover (1st fails → 2nd, 2nd fails → 3rd)
- Verify failure when all providers are unavailable
- Ensure priority order is respected
- Coverage: 90%+ for AI failover logic

---

### [ADPA-617] Write Health Endpoint Tests

**Summary**: Test health endpoints with Supertest.

**Priority**: High  
**Story Points**: 2

**Description**: Verify the reliability of liveness and readiness checks.

**Acceptance Criteria**:
- `GET /health/live` returns 200
- `GET /health/ready` correctly checks dependencies
- `GET /health/ready` returns 503 if critical dependencies are down

---

### [ADPA-618] Write Job Queue Lifecycle Tests

**Summary**: Test job enqueue, processing, and error handling.

**Priority**: High  
**Story Points**: 3

**Description**: Verify the end-to-end lifecycle of background jobs.

**Acceptance Criteria**:
- Test job enqueue and successful processing
- Verify error handling and failure status
- Track full lifecycle of a job
- Verify `getMetrics()` accuracy

---

## EPIC 3: Modular Architecture (Issues 619 - 623)

### [ADPA-619] Implement Route Auto-Discovery

**Summary**: Create route registry with auto-discovery from modules.

**Priority**: High  
**Story Points**: 5

**Description**: Automate route registration based on module structure.

**Acceptance Criteria**:
- Create `server/src/routes/registry.ts`
- Implement `discoverRoutes()` to scan `modules/*/routes.ts`
- Support dual-operation mode (flag controlled)
- Capture route metadata (path, version, auth, etc.)
- Ensure backwards compatibility with old routes

---

### [ADPA-620] Create Module Structure

**Summary**: Refactor services into a clean module structure.

**Priority**: Critical  
**Story Points**: 8

**Description**: Reorganize the monolithic codebase into domain-specific modules.

**Acceptance Criteria**:
- Create modules for `ai`, `documents`, `projects`, `integrations`, and `analysis`
- Implement standard structure (`index.ts`, `service.ts`, `routes.ts`, etc.)
- Export only public interfaces
- Ensure no circular dependencies
- Maintain backwards compatibility

---

### [ADPA-621] Extract Projects Repository

**Summary**: Move project queries to a dedicated repository with caching.

**Priority**: High  
**Story Points**: 4

**Description**: Isolate data access for projects into a repository pattern.

**Acceptance Criteria**:
- Create `server/src/modules/projects/repository.ts`
- Implement methods: `getWithMembers()`, `findByTeamMember()`, `findByIds()`, `update()`
- Add query context for tracing and metrics
- Implement Redis caching (5 min TTL)
- Prevent N+1 query issues

---

### [ADPA-622] Extract Documents Repository

**Summary**: Move document queries to a dedicated repository with optimization.

**Priority**: High  
**Story Points**: 4

**Description**: Isolate and optimize data access for documents.

**Acceptance Criteria**:
- Create `server/src/modules/documents/repository.ts`
- Implement methods: `getByProject()`, `getWithContent()`, `update()`, `delete()`
- Optimize queries and implement batch operations
- Add query context for metrics
- Implement caching for read-heavy queries

---

### [ADPA-623] Refactor AI Service to Module

**Summary**: Isolate AI providers and failover logic into a standalone module.

**Priority**: High  
**Story Points**: 6

**Description**: Finalize the modularization of AI services.

**Acceptance Criteria**:
- Create `server/src/modules/ai/service.ts`
- Create provider sub-modules (`openai`, `google`, etc.)
- Ensure all providers implement the `AIProvider` interface
- Centralize failover logic in the module service
- Track provider latency and cost metrics

---

## Implementation Notes

**Target Jira Project**: COG (CogniSync)  
**Epic Structure**:
- Epic 1: "ADPA Test Harness Implementation" (Issues 609-618)
- Epic 2: "ADPA Modular Architecture Refactoring" (Issues 619-623)

**Labels**: `testing`, `architecture`, `refactoring`, `technical-debt`

**Priority Mapping**:
- Critical → Highest
- High → High
- Medium → Medium
- Low → Low
