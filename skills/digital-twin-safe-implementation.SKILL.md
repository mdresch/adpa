# Skill: Digital Twin POC – Safer Implementation (Risk-Aware)

**Scope**: Risk-aware implementation of Digital Twin POC; mitigation strategies from the risk assessment.  
**Use when**: Implementing Digital Twin schema, events, triggers, connectors, RLS, or any "risky" Digital Twin change.  
**Companion**: Use with [digital-twin-implementation.SKILL.md](./digital-twin-implementation.SKILL.md) for correct usage.

---

## When to use this skill

- User says: "implement Digital Twin migrations", "add event processing", "trigger rules", "connector", "RLS for digital twin"
- User asks: "how do we safely implement Digital Twin?", "what could go wrong?", "run tests before merging?"
- Tasks involve: migrations, event system, trigger engine, ingestion/connectors, RLS policies, or performance-sensitive paths

---

## Risk overview (from risk assessment)

| Category | Risks | Focus |
|----------|-------|--------|
| Critical | Schema drift, event system complexity, trigger rule evaluation | Validation, idempotency, tests |
| High | State comparison, connector errors, multi-tenancy/RLS, timeline | Dedup, circuit breaker, RLS tests |
| Medium | Integration complexity, performance | Adapters, caching, partitioning |

**Reference**: [plans/DIGITAL_TWIN_POC_RISK_MITIGATION_PLAN.md](../plans/DIGITAL_TWIN_POC_RISK_MITIGATION_PLAN.md)

---

## Pre-implementation checks

### 1. Schema and migrations

- [ ] **Design doc as source of truth**: Schema matches [DIGITAL_TWIN_POC_DESIGN.md](../docs/roadmap/DIGITAL_TWIN_POC_DESIGN.md) and [REVISED plan](../plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md). No `digital_twin_models` / `digital_twin_states`.
- [ ] **Migration validation**: Run schema validation test (or equivalent) before merge. Example: `__tests__/migrations/digital-twin-schema-validation.test.ts`.
- [ ] **Rollback**: Migration has a rollback script; it has been tested.

**If you change schema**: Prefer updating the design doc and REVISED plan first, then migrating. Use the **ask-question** tool if unsure about a deviation.

### 2. Event system

- [ ] **Idempotent processing**: Event processing is idempotent (e.g. by `platform_event_id` + `platform_type` + `asset_id`). Duplicate events must not create duplicate states.
- [ ] **Deduplication at ingestion**: Check for existing event before insert; use `UNIQUE (platform_event_id, platform_type, asset_id)`.
- [ ] **Queue + retry**: Events are processed via a queue (e.g. Bull) with retries and dead-letter handling.
- [ ] **Replay**: Document or implement "replay failed events" (e.g. reset status, reprocess) for debugging.

**If you add or change event processing**: Add/update unit tests for idempotency and deduplication.

### 3. Trigger system

- [ ] **Rule validation**: Validate `rule_config` and `trigger_type` when creating or updating trigger rules. Reject invalid rules.
- [ ] **Unit tests**: Trigger rule evaluation has unit tests (e.g. `__tests__/services/digitalTwinTriggerService.test.ts`).
- [ ] **Rule testing UI**: Prefer a "test rule" API or UI (e.g. `POST .../triggers/rules/test`) to verify rules before use.
- [ ] **Logging**: Log rule matches and trigger creation for auditability.

**If you add new trigger types or rules**: Add tests and validation; avoid silent failures.

### 4. Connectors and ingestion

- [ ] **Circuit breaker**: Connector calls use a circuit breaker (or equivalent) to avoid cascading failures.
- [ ] **Rate limiting / backoff**: Honor platform rate limits; use backoff on errors.
- [ ] **Emit events only**: Connectors do **not** write to `digital_twin_asset_states` directly. They emit events (e.g. via `digitalTwinEventService.ingestEvent`).
- [ ] **Health checks**: Ingestion sources have health/status checks; document how to monitor them.

**If you add a new connector**: Implement error handling, circuit breaker, and event-only emission.

### 5. Multi-tenancy and RLS

- [ ] **RLS on all `digital_twin_*` tables**: Policies enforce access by `project_id` / `company_id` and project membership.
- [ ] **RLS tests**: Automated tests verify RLS (e.g. user A cannot see project B’s assets).
- [ ] **No tenant leakage**: Queries always scope by `project_id` (or equivalent); avoid cross-tenant data exposure.

**If you add or change RLS**: Run RLS tests and integration tests; use the **ask-question** tool if policies are complex.

### 6. State comparison and performance

- [ ] **State hash**: Use `digitalTwinStateUtils.calculateStateHash`; consider multi-hash or field-level diff where the mitigation plan suggests.
- [ ] **Size limits**: Enforce reasonable limits on `state_snapshot` size; consider compression for large payloads.
- [ ] **Indexing**: Use indexes from the REVISED plan (`idx_dt_*`). Add new indexes only when justified by queries.
- [ ] **Caching**: Consider caching for hot paths (e.g. current state) per mitigation plan.

---

## Safer implementation workflow

1. **Clarify**: For risky changes (migrations, RLS, new connectors, trigger engine), use the **ask-question** tool to confirm scope, rollback, and testing.
2. **Implement**: Follow [digital-twin-implementation.SKILL.md](./digital-twin-implementation.SKILL.md) (schema, services, API, React).
3. **Apply mitigations**: Use the checklists above; add tests, validation, and logging as per [DIGITAL_TWIN_POC_RISK_MITIGATION_PLAN.md](../plans/DIGITAL_TWIN_POC_RISK_MITIGATION_PLAN.md).
4. **Test**: Run relevant unit and integration tests. For schema/RLS, run validation and RLS tests.
5. **Review**: Prefer a second pair of eyes on migrations, RLS, and connector code.

---

## Quick reference – mitigations by area

| Area | Mitigations (summary) |
|------|------------------------|
| **Schema** | Design doc = source of truth; schema validation test; migration template; review process |
| **Events** | Idempotent processing; dedup at ingest; queue + retry; monitoring; replay |
| **Triggers** | Rule validation; unit tests; rule test UI; execution logging |
| **State** | Hash + optional multi-hash; field-level diff; normalization; size limits; caching |
| **Connectors** | Circuit breaker; rate limit/backoff; health checks; graceful degradation; manual sync/recover |
| **RLS** | RLS tests; policy audit log; documentation; staging verification; monitoring |
| **Timeline** | Phased delivery; standups; scope management; parallel workstreams; buffer |

---

## Reference

- **Risk mitigation plan**: [plans/DIGITAL_TWIN_POC_RISK_MITIGATION_PLAN.md](../plans/DIGITAL_TWIN_POC_RISK_MITIGATION_PLAN.md)
- **Risk assessment**: [plans/DIGITAL_TWIN_POC_RISK_ASSESSMENT.md](../plans/DIGITAL_TWIN_POC_RISK_ASSESSMENT.md)
- **Implementation (usage)**: [digital-twin-implementation.SKILL.md](./digital-twin-implementation.SKILL.md)
- **iTwin.js (connectors)**: [https://www.itwinjs.org/](https://www.itwinjs.org/) – when implementing iTwin connector or ingestion; use Platform API, emit events only. See implementation skill § iTwin.js resources.
- **iTwinUI (Viewer & UI)**: [https://itwinui.bentley.com/docs](https://itwinui.bentley.com/docs) – Bentley React UI library for Viewer or Bentley-aligned Digital Twin UI; `@itwin/itwinui-react`, ThemeProvider, components. See implementation skill § iTwin.js resources.

---

## Invocation

- **Slash command**: Use when user invokes `/digital-twin-safe` or `/digital-twin-risks` (if configured).
- **Natural language**: Apply when implementing Digital Twin **migrations, events, triggers, connectors, RLS**, or when the user asks for **safer** or **risk-aware** Digital Twin implementation.
