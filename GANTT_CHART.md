# Gantt Chart - ADPA Optimized Implementation Plan

## Timeline Overview (12 Weeks)

```
Week 1   Week 2   Week 3   Week 4   Week 5   Week 6   Week 7   Week 8   Week 9   Week 10  Week 11  Week 12
├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤

Phase 1: Stabilization
├────────┼────────┤
 Startup Graph
       ├────┤
           Fail-Fast Mode
               ├────┤
                     TLS Hardening
                         ├────────┤
                             Health Endpoints

Phase 2: Test Harness (Moved before refactoring - Critical)
                ├────────┼────────┤
                 Jest Setup & DB Sandbox
                     ├────┤
                        Test Factories
                         ├────┤
                            AI Provider Mocks
                             ├────┤
                                Job Queue Mock
                            ├───────────────────────────────────┤ (5-7 Auth tests)
                            ├───────────────────────────────────┤ (5-7 Project tests)
                            ├───────────────────────────────────┤ (4-6 Document tests)
                            ├───────────────────────────────────┤ (4-5 AI Failover tests)
                            ├──┤ (3 Health tests)
                            ├──┤ (3-4 Job Queue tests)

Phase 3: Modular Refactoring (Now protected by tests)
                        ├────────┼────────┼────────┤
                         Route Registry
                            ├─────────────────┤
                                Module Structure
                                   ├──────────┤
                                    Projects Repository
                                      ├──────────┤
                                       Documents Repository
                                         ├─────────────┤
                                          AI Module Refactor

Phase 4: Observability & Operations
                                    ├────────┼────────┼────────┤
                                     Unified Health System
                                        ├────┤
                                           Structured Logging (Pino)
                                             ├────┤
                                                Prometheus Metrics
                                                  ├─────────┤
                                                   Deployment Pipeline
                                                     ├──────────┤
                                                        Staging Env

Phase 5: Performance & Polish
                                              ├────────┼────────┼────────┤
                                               Query Optimization
                                                  ├────┤
                                                     Frontend Restructuring
                                                        ├──────────┤
                                                           Expand Tests
                                                             ├─────────────┤
                                                                Performance Baseline

Parallel Activities (can happen with Phase 5)
                                                           ├─────────────┤ Doc updates
```

---

## Detailed Phase Breakdown

### Phase 1: Stabilization (Weeks 1-2) - 8 hours total

```
Week 1                                Week 2
Mon  Tue  Wed  Thu  Fri               Mon  Tue  Wed  Thu  Fri
├────┼────┼────┼────┼────┤            ├────┼────┼────┼────┼────┤

[Startup Dependency Graph]             [Testing] [Review]
2-3h ▓▓▓▓▓▓

     [Fail-Fast Mode]
     1h ▓▓

           [TLS Hardening]
           1h ▓▓

                [Health Endpoints]
                2h ▓▓▓

                          [Buffer/Review]  ← 1h slack for fixes
                          1h ▓
```

**Key**: All Phase 1 tasks are **sequential and low-risk**. No parallelization needed. Total = 8 hours.

---

### Phase 2: Test Harness (Weeks 3-4) - 24 hours total

```
Week 3                                Week 4
Mon  Tue  Wed  Thu  Fri               Mon  Tue  Wed  Thu  Fri
├────┼────┼────┼────┼────┤            ├────┼────┼────┼────┼────┤

[Jest + DB Sandbox]
2-3h ▓▓▓▓

     [Test Factories]                    [Auth Tests]
     1-2h ▓▓                              2h ▓▓▓▓

           [AI Mocks] [Job Queue Mock]    [Project Tests]
           2h ▓▓      2h ▓▓                2h ▓▓▓▓

                      ├─────────────────┤
                      Parallel: All Core Tests Run (5-7 tests each)
                      4h ▓▓▓▓▓▓▓▓
                      (Auth, Projects, Documents, AI Failover, Health, Jobs)

                                [Coverage Report] [Review]
                                2h ▓▓
```

**Key**: Test doubles created first (Jest + Factories), then **parallel test writing** (3 QA engineers writing 25-35 tests). Total = 24 hours.

---

### Phase 3: Module Refactoring (Weeks 5-7) - 32 hours total

```
Week 5                                Week 6                           Week 7
Mon  Tue  Wed  Thu  Fri               Mon  Tue  Wed  Thu  Fri         Mon  Tue  Wed  Thu  Fri
├────┼────┼────┼────┼────┤            ├────┼────┼────┼────┼────┤     ├────┼────┼────┼────┼────┤

[Route Registry + Auto-Discovery]
3h ▓▓▓

   [Dual-Operation Mode Test]
   2h ▓▓

           ├──────────────────────┤
           Module Structure: Core Modules (ai, documents, projects, integrations)
           8h ▓▓▓▓▓▓▓▓
           (Backend Lead + Senior Eng parallel work)

                            ├─────────────┤
                            Projects Repository Extraction
                            4h ▓▓▓▓

                                   ├─────────────┤
                                   Documents Repository Extraction
                                   4h ▓▓▓▓

                                          ├──────────────┤
                                          AI Module Refactor
                                          6h ▓▓▓▓▓▓

                                                 [Integration Tests]
                                                 3h ▓▓▓

                                                    [Review + Cleanup]
                                                    2h ▓▓
```

**Key**: 
- Route registry first (unblocks dual mode)
- Module structure created in parallel by 2 engineers
- Repositories extracted sequentially (each unblocks the next)
- All protected by Phase 2 tests (no silent breakage)
- Total = 32 hours

---

### Phase 4: Observability & Operations (Weeks 7-10) - 28 hours total

```
Week 7 (overlap with Phase 3)        Week 8                           Week 9                           Week 10
Mon  Tue  Wed  Thu  Fri              Mon  Tue  Wed  Thu  Fri         Mon  Tue  Wed  Thu  Fri         Mon  Tue  Wed  Thu  Fri
├────┼────┼────┼────┼────┤           ├────┼────┼────┼────┼────┤     ├────┼────┼────┼────┼────┤     ├────┼────┼────┼────┼────┤

                                [Unified Health System]             [Monitoring Setup]
                                2h ▓▓▓▓                               1h ▓▓

                                   [Structured Logging (Pino)]
                                   2h ▓▓▓

                                      [Prometheus Metrics]           [Grafana Dashboard]
                                      2h ▓▓▓                         1h ▓

                                         ├──────────────────┤
                                         Deployment Pipeline + CI/CD
                                         5h ▓▓▓▓▓▓▓▓
                                         (DevOps engineer leads)

                                              ├──────┤
                                              Staging Environment
                                              3h ▓▓▓▓

                                                   ├────────────────────────────┤
                                                   Pipeline Testing & Validation
                                                   4h ▓▓▓▓▓▓

                                                         [Documentation]
                                                         3h ▓▓▓

                                                            [Buffer/Fixes]
                                                            2h ▓▓
```

**Key**:
- Health and logging work in parallel (Week 8)
- Deployment pipeline is critical path (can start earlier if needed)
- Staging environment depends on pipeline
- All non-critical tasks have buffer time
- Total = 28 hours

---

### Phase 5: Performance & Polish (Weeks 10-12) - 32 hours total

```
Week 10                              Week 11                          Week 12
Mon  Tue  Wed  Thu  Fri              Mon  Tue  Wed  Thu  Fri         Mon  Tue  Wed  Thu  Fri
├────┼────┼────┼────┼────┤           ├────┼────┼────┼────┼────┤     ├────┼────┼────┼────┼────┤

[Query Optimization Baseline]
2h ▓▓

   [Index Creation + Testing]
   2h ▓▓

          ├────────────────────────┤
          Frontend App Router Restructuring
          6h ▓▓▓▓▓▓
          (Frontend Lead + 1 engineer)

                          ├─────────────────────────────────────────────┤
                          Expand Test Coverage (25+ new tests)
                          8h ▓▓▓▓▓▓▓▓
                          (QA team parallel writing)

                                  ├───────────┤
                                  Performance Baseline Documentation
                                  2h ▓▓

                                        ├──────────────────────┤
                                        Load Testing (optional)
                                        3h ▓▓▓

                                           ├─────────────────┤
                                           Final Integration Tests
                                           3h ▓▓▓

                                                 ├────────────────┤
                                                 Documentation Update
                                                 3h ▓▓▓

                                                     ├────────┤
                                                     Final Review
                                                     2h ▓▓
```

**Key**:
- Query optimization happens early (allows time for re-baselining)
- Frontend restructuring in parallel with testing (independent)
- Load testing is optional (time-permitting)
- Final week is integration + documentation
- Total = 32 hours

---

## Critical Path Analysis

**Critical tasks** (if delayed, entire project delayed):

1. **Phase 1.1** - Dependency Graph (foundational)
2. **Phase 2.1** - Jest Setup (blocks all testing)
3. **Phase 2.x** - Core tests (blocks Phase 3 confidence)
4. **Phase 3.1** - Route Registry (unblocks dual mode)
5. **Phase 3.2** - Module Structure (large refactor)
6. **Phase 4.4** - Deployment Pipeline (production blocker)

**Non-critical tasks** (can slip without full delay):
- Phase 1.2 (Fail-Fast Mode) - can merge after Phase 1.1
- Phase 5.2 (Frontend Restructure) - independent, can slip to Week 13
- Phase 5.3 (Additional Tests) - can increase to 60% after project ends

---

## Risk Timeline

```
Risk Level Over Time

  HIGH ┤     ╱╲
       │    ╱  ╲      ╱╲
       │   ╱    ╲    ╱  ╲
MEDIUM ┤  ╱      ╲──╱    ╲___
       │ ╱                    ╲
  LOW  ┤╱_____________________  ╲___
       └────┬────┬────┬────┬────┬────┬─
           W1-2 W3-4 W5-7 W7-10 W10-12
           P1   P2   P3   P4   P5

Risk drivers:
- W1-2: Low (config only)
- W3-4: MEDIUM → HIGH (test harness setup, mocks)
- W5-7: HIGH → MEDIUM (large refactor, but tests protect)
- W7-10: MEDIUM (deployment pipeline critical)
- W10-12: LOW (polish, no core logic changes)
```

---

## Resource Utilization

```
        W1  W2  W3  W4  W5  W6  W7  W8  W9  W10 W11 W12
Backend  50% 50% 30% 40% 50% 60% 40% 30% 20% 20% 20% 20%
Senior   -   -   30% 40% 60% 60% 40% 30% 30% 30% 20% 10%
QA       -   -   60% 80% 40% 40% 40% 40% 40% 40% 60% 40%
DevOps   -   -   -   -   -   10% 30% 40% 40% 40% -   -
Frontend -   -   -   -   -   -   -   -   -   20% 40% 30%

Utilization = person * hours / (40 hours/week)
```

---

## Contingency Timeline

**If slippage occurs**:

1. **1 week slip on Phase 2 (Tests)** → Reduce Phase 3 to 2 weeks (single engineer instead of 2)
2. **1 week slip on Phase 3 (Refactoring)** → Compress Phase 4 to 2 weeks (defer non-critical observability)
3. **1 week slip on Phase 4 (Ops)** → Keep Phase 5 unchanged, defer non-critical polish to Week 13

**Maximum safe slip**: 2 weeks (push full completion to Week 14)

---

## Dependencies Graph

```
Phase 1 (Weeks 1-2)
    ↓
Phase 2 (Weeks 3-4)
    ↓
Phase 3 (Weeks 5-7)  ← Phase 2 tests protect Phase 3
    ↓
Phase 4 (Weeks 7-10) ← Can start end of W6, full startup by W8
    ↓
Phase 5 (Weeks 10-12) ← Some parallelization possible with W9-10

Key Dependencies:
- Phase 1 must complete before Phase 2 (startup must be stable)
- Phase 2 must complete before Phase 3 (tests protect refactoring)
- Phase 3 must complete before Phase 4 (route registry needed for metrics)
- Phase 4.4 (Deployment Pipeline) is critical for production readiness
- Phase 5 is mostly independent (can start early if Phase 4 healthy)
```

---

## Milestones & Gates

### Milestone 1: End of Week 2 (Phase 1 Complete)
- ✅ Startup deterministic
- ✅ No TLS bypass in production
- ✅ Health endpoints working
- **Gate**: All Phase 1 tests passing, no warnings in logs

### Milestone 2: End of Week 4 (Phase 2 Complete)
- ✅ Test harness active (25-35 tests)
- ✅ 40%+ coverage
- ✅ All critical paths tested
- **Gate**: CI/CD running tests on all PRs, no flaky tests

### Milestone 3: End of Week 7 (Phase 3 Complete)
- ✅ Module structure in place
- ✅ Dual-operation mode active
- ✅ All tests still passing
- ✅ Zero functionality loss
- **Gate**: Feature parity maintained, no regressions

### Milestone 4: End of Week 10 (Phase 4 Complete)
- ✅ Unified health system active
- ✅ Metrics exposed
- ✅ Deployment pipeline working
- ✅ Staging environment ready
- **Gate**: Successful canary deploy to staging

### Milestone 5: End of Week 12 (Phase 5 Complete)
- ✅ Query optimization baseline established
- ✅ Frontend restructured
- ✅ 50+ tests (60%+ coverage)
- ✅ Performance baselines documented
- **Gate**: All metrics green, ready for production scale

---

## Success Metrics by Week

```
Week 2:  Stabilization ✅
         - 0 TLS warnings in prod
         - 0 "waiting..." logs
         - Health endpoints: 3/3 working
         
Week 4:  Tests ✅
         - Coverage: 40%+
         - Tests: 25-35 passing
         - Critical paths: auth, projects, docs, AI, health
         
Week 7:  Refactoring ✅
         - Route registry active
         - Modules: 5/5 created
         - Functionality: 100% preserved
         - Tests: still 35+ passing
         
Week 10: Operations ✅
         - Health: /live, /ready, /metrics, /deps
         - Metrics: Prometheus exposed
         - Logging: Structured (Pino)
         - Deploy: Canary tested
         
Week 12: Polish ✅
         - Tests: 50+ (60%+ coverage)
         - Frontend: Restructured (35 dirs → logical hierarchy)
         - Performance: Baseline established, 30%+ improvement
         - Deployment: Ready for production scale
```

---

## Burn-Down Chart (Hypothetical)

```
Hours Remaining
160 ├
    │ ╱
140 ├╱
    │
120 ├────────────────────────╲
    │                        ╲
100 ├                         ╲
    │                          ╲
80  ├                           ╲
    │                            ╲
60  ├                             ╲
    │                              ╲
40  ├                               ╲
    │                                ╲
20  ├                                 ╲
    │                                  ╲
0   └─────────────────────────────────────
    W1  W2  W3  W4  W5  W6  W7  W8  W9 W10 W11 W12

Ideal burn: ~13 hours/week
- Weeks 1-2:   8 hours (Phase 1)
- Weeks 3-4:  24 hours (Phase 2)
- Weeks 5-7:  32 hours (Phase 3)
- Weeks 7-10: 28 hours (Phase 4, with overlap)
- Weeks 10-12: 32 hours (Phase 5)
```

---

## Key Dates & Reviews

- **Week 2 Friday**: Phase 1 review + demo (health endpoints)
- **Week 4 Friday**: Phase 2 review + coverage report
- **Week 7 Friday**: Phase 3 review + dual-mode validation
- **Week 10 Friday**: Phase 4 review + first canary deploy
- **Week 12 Friday**: Phase 5 review + final metrics + go/no-go for production scale

---

**Document Version**: 1.0  
**Last Updated**: March 2026  
**Status**: Ready for execution

All timelines include 10-15% slack for unexpected issues. Monitor weekly and adjust as needed.
