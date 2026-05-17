# ADPA: Provider-Independent SQL Strategy - Execution Checklist Companion

Date: May 17, 2026  
Project: Advanced Data Processing Automation (ADPA)  
Companion To: 2026-05-17-provider-independent-sql-strategy.md  
Status: Execution Checklist (Sprint-Ready)

---

## How To Use This Companion

- Use this file as the operational tracker for delivery.
- Keep the strategic plan for direction; use this checklist for execution.
- Assign an owner and due date for each unchecked item.
- Do not mark a phase complete until all acceptance gates pass.

Suggested status tags:
- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Blocked

---

## Workstream 0: Governance and Readiness

### Scope Lock
- [ ] Confirm migration target: Render first, Railway second, self-hosted baseline.
- [ ] Freeze provider-specific feature additions until parity milestones complete.
- [ ] Approve standard schema boundary: adpa_core.

### Ownership and Cadence
- [ ] Assign DRI for database portability.
- [ ] Assign DRI for application auth abstraction.
- [ ] Assign DRI for performance validation.
- [ ] Schedule weekly portability review (architecture + infra + data).

### Baseline Capture
- [ ] Record current Supabase behavior for critical flows.
- [ ] Capture baseline metrics: p95 query latency, embedding insert throughput, search recall proxy.
- [ ] Export current migration inventory and identify provider-specific SQL.

Acceptance gate:
- [ ] A signed baseline report exists and is stored in docs.

---

## Workstream 1: Environment Parity (Render)

### Provisioning
- [ ] Provision Render Postgres for development.
- [ ] Provision Render Postgres for staging.
- [ ] Confirm PostgreSQL major/minor versions match expected migration support.

### Extension and Capability Validation
- [ ] Verify pgvector availability.
- [ ] Validate extension creation path (if required): CREATE EXTENSION IF NOT EXISTS vector.
- [ ] Verify support for required vector index types (HNSW, IVFFlat).

### Connectivity
- [ ] Wire app development environment to Render database.
- [ ] Validate secure connectivity using Render internal networking where applicable.
- [ ] Confirm TLS and secret handling for all environments.

Acceptance gate:
- [ ] Environment parity checklist signed off by platform and backend owners.

---

## Workstream 2: SQL Portability Hardening

### PLpgSQL Standardization
- [ ] Inventory all database functions used by ADPA services.
- [ ] Move non-portable logic into standard PLpgSQL equivalents.
- [ ] Normalize schema placement under adpa_core.
- [ ] Verify function signatures are backward compatible.

### Migration Hygiene
- [ ] Ensure all migration files are provider-neutral SQL.
- [ ] Add explicit UP and DOWN where missing.
- [ ] Ensure migrations are transaction-safe and repeatable where possible.
- [ ] Add comments for any unavoidable provider nuance.

### Provider-Specific Dependency Removal
- [ ] Remove direct Supabase-specific SQL patterns in application queries.
- [ ] Confirm no application code relies on provider metadata columns.
- [ ] Verify row-level security assumptions are SQL-standard and policy-driven.

Acceptance gate:
- [ ] SQL portability audit reports zero blocking provider-specific dependencies.

---

## Workstream 3: Schema and Data Migration

### Export and Import
- [ ] Export adpa_core schema from current source provider.
- [ ] Import schema into Render Postgres via migration pipeline.
- [ ] Validate sequence/defaults/UUID behavior post-import.

### RLS and Access Behavior
- [ ] Validate role mappings for application and service accounts.
- [ ] Execute RLS parity test matrix across critical entities.
- [ ] Confirm authorization behavior matches baseline.

### Data Validation
- [ ] Validate table counts and checksum samples for critical datasets.
- [ ] Validate embedding table dimensional consistency.
- [ ] Validate document ingestion and retrieval integrity.

Acceptance gate:
- [ ] Migration parity report approved with no critical variance.

---

## Workstream 4: Vector Indexing and RAG Performance

### Index Definitions
- [ ] Define pgvector indexes in migrations for each embedding table.
- [ ] Validate HNSW configuration for low-latency retrieval paths.
- [ ] Validate IVFFlat configuration for high-throughput workloads.

### Query Performance
- [ ] Benchmark nearest-neighbor query latency against baseline.
- [ ] Benchmark embedding write throughput.
- [ ] Validate retrieval quality/recall proxy on representative datasets.

### Tuning and Safeguards
- [ ] Tune index and query settings based on benchmark evidence.
- [ ] Add regression thresholds for latency and retrieval quality.
- [ ] Document recommended index profile per workload class.

Acceptance gate:
- [ ] Performance SLOs are met or waivers are approved with remediation plan.

---

## Workstream 5: Auth and Service Abstraction

### JWT and Middleware
- [ ] Centralize JWT validation in application middleware.
- [ ] Confirm token parsing/validation has no provider lock-in.
- [ ] Validate claim-based authorization behavior end-to-end.

### Config and Secrets
- [ ] Standardize DB/auth environment variable names across providers.
- [ ] Remove provider-specific config branching where unnecessary.
- [ ] Confirm secret rotation procedures work in Render pipeline.

### App-DB Contract
- [ ] Verify service layer does not depend on provider-specific SDK features.
- [ ] Validate all DB calls use generic PostgreSQL drivers/contracts.

Acceptance gate:
- [ ] Auth and config portability review approved by security owner.

---

## Workstream 6: Networking and Cutover Preparation

### Internal Networking
- [ ] Switch app services to Render internal database connection strings.
- [ ] Remove or restrict public database ingress where possible.
- [ ] Validate failover behavior and retry strategy.

### Deployment Readiness
- [ ] Add rollout plan with rollback checkpoints.
- [ ] Add database backup and restore verification for cutover window.
- [ ] Dry-run cutover in staging with production-like load.

### Observability
- [ ] Instrument DB connection, query latency, and error rates.
- [ ] Create dashboard panels for migration-era KPIs.
- [ ] Add alert thresholds for parity regressions.

Acceptance gate:
- [ ] Cutover readiness review approved by platform, backend, and SRE.

---

## Workstream 7: Multi-Provider Verification

### Render Certification
- [ ] Certify all critical ADPA paths on Render.

### Railway Verification
- [ ] Re-run schema migration and test suite on Railway.
- [ ] Confirm no provider-specific SQL branches introduced.

### Self-Hosted Baseline
- [ ] Validate Docker/local PostgreSQL bootstrap path.
- [ ] Confirm developer setup and test workflows remain intact.

Acceptance gate:
- [ ] At least 2 managed providers plus local baseline verified.

---

## Test and Validation Matrix

### Automated Validation
- [ ] Run frontend tests: pnpm test
- [ ] Run backend tests: cd server && npm test
- [ ] Run integration tests for RAG/indexing/embeddings.
- [ ] Run migration tests against clean and existing databases.

### Manual Validation
- [ ] Execute critical user journeys involving retrieval and generation.
- [ ] Validate admin and standard-user RLS behavior.
- [ ] Validate system behavior under degraded database latency.

### Sign-off Criteria
- [ ] No Sev-1 or Sev-2 portability defects open.
- [ ] Performance metrics within agreed thresholds.
- [ ] Runbook and rollback docs finalized.

---

## Deliverables Checklist

- [ ] Portability baseline report
- [ ] Provider-neutral migration pack
- [ ] Render environment parity report
- [ ] RLS parity validation report
- [ ] Vector performance benchmark report
- [ ] Cutover runbook and rollback playbook
- [ ] Multi-provider verification summary

---

## Risk Register Tracker

| Risk | Impact | Likelihood | Owner | Mitigation | Status |
|---|---|---|---|---|---|
| Provider config drift | High | Medium | TBD | Baseline snapshots + parity tests | Open |
| Vector query regressions | High | Medium | TBD | Benchmarks + index tuning gates | Open |
| RLS mismatch | High | Low-Med | TBD | Automated policy parity tests | Open |
| Cutover outage risk | High | Low-Med | TBD | Staging dry-run + rollback drills | Open |

---

## Sprint Tracking Template

### Sprint Goal
- [ ] Define sprint objective for SQL portability milestone.

### Planned Items
- [ ] Item 1:
- [ ] Item 2:
- [ ] Item 3:

### End-of-Sprint Exit Check
- [ ] Acceptance gates for targeted workstreams passed.
- [ ] Evidence links added (PRs, dashboards, reports).
- [ ] Remaining blockers triaged with owners and dates.

---

## Final Go/No-Go Checklist

- [ ] All acceptance gates complete across Workstreams 0-7.
- [ ] Production cutover dry-run succeeded.
- [ ] Rollback tested and timed.
- [ ] Security and compliance sign-off complete.
- [ ] Leadership go/no-go decision recorded.
