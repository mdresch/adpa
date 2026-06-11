---
name: adpa-governed-feature-loop
description: Institutional pattern for governed feature delivery in ADPA — spec → requirements → Jest tests → SKILL.md → manifest registration → code → dual-loop guard. Use when creating or extending any feature packet. Register in server/governed-features.manifest.json; npm run test:features runs all packets automatically. Canonical references — RAG (modules/rag) and doc-gen (documentGenerationService tests).
---

# ADPA Governed Feature Loop

## When to Use

- **Creating** a new backend or cross-cutting feature (not a one-line fix).
- **Extending** a feature that **overlaps** another (Feature 2 may break Feature 1).
- **Agent work** where tests must be correct by design, not reactive patches.

**Do not use** for trivial UI copy, config-only changes, or chores with no behavioral contract.

Works alongside `adpa-aev-workflow` (atomic scope + validation gates). This skill defines **what to build**; AEV defines **how to land it safely**.

## Core Principle

```
Business intent (spec) → Requirements → Tests (truth) → Skill (intent) → Code → Loop until green
```

Jest tests are **not invented** — they are **derived from requirements and interaction rules** in the spec.

## Maturity Levels

| Level | State |
| ----- | ----- |
| 1 | Code-driven |
| 2 | Test-driven |
| 3 | Test + skills (per-feature) |
| 4 | **Feature packet standardized** ← target for new work |
| 5 | CI-enforced governance (`npm run test:features` on every PR) |
| 5.5 | Cross-artifact validation (`verify:governed-features` — manifest, skills, guards) |

**Canonical Level 4 examples:**

- **RAG packet** (`id: rag`) — module tests under `__tests__/modules/rag/`; skills `adpa-rag-context-injection`, `adpa-rag-dynamic-fallback`.
- **Doc-gen packet** (`id: doc-gen`) — integration tests under `__tests__/documentGenerationService.*.test.ts`; skills `adpa-doc-gen-queue`, `adpa-template-driven-generation`.

All registered packets run via **`npm run test:features`** (manifest-driven; no manual `test:features` chaining).

---

## The Feature Packet (Required Artifacts)

One feature (or tightly coupled feature pair) = one packet:

| Layer | Path | Role |
| ----- | ---- | ---- |
| Governance | `docs/superpowers/specs/YYYY-MM-DD-<feature>-design.md` | Why, REQs, interactions, risks, test plan |
| Truth | `server/src/__tests__/**/<feature>.test.ts` | Executable requirements |
| Intent | `.agents/skills/adpa-<feature>/SKILL.md` | Invariants, file map, commands |
| Execution | `server/src/**` | Implementation |

Optional for overlap pairs:

| Layer | Path | Role |
| ----- | ---- | ---- |
| Contract | `server/src/modules/<area>/<feature>Contract.ts` | `validate*Contract()` + guard |
| Guard runner | `server/src/modules/<area>/<feature>Guard.ts` | `run*FeatureGuard()` for CI |

---

## Execution Order (Mandatory)

Agents **must** follow this order for new features:

```
1. Write / update design spec (REQs + interaction rules)
2. Write initial feature SKILL.md (intent draft — invariants, overlap rules)
3. Write Jest tests derived from REQs (RED — imports may fail until step 5)
4. Refine SKILL.md after test plan exposes gaps (stable system model)
5. Write minimal production code (GREEN)
6. Wire integration (if needed)
7. Register in `server/governed-features.manifest.json` (+ `jest.config.unit.js` if tests are outside default unit globs)
8. Run `npm run verify:governed-features` + `npm run test:features`; loop until pass
9. If overlap feature exists → run `npm run test:features` (all packets) or each affected id: `npm run test:features -- <id>`
```

**Skills evolve with tests** — the first SKILL anchors intent; tests expose missing rules; the final SKILL stabilizes the model.

**Never** skip tests to “move faster.” **Never** ship Feature 2 without an overlap guard when Feature 1 has a contract.

---

## Step 1 — Design Spec Template

Create `docs/superpowers/specs/YYYY-MM-DD-<feature>-design.md`:

```markdown
# <Feature Name>

Date: YYYY-MM-DD
Status: Draft | Approved | Implemented

## Problem
(One paragraph — what breaks today without this feature.)

## Success Criteria
- [ ] Measurable outcome 1
- [ ] Measurable outcome 2

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-001 | … | P0 |
| REQ-002 | … | P1 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- `<existing-feature-a>` — how they compose
- `<existing-feature-b>` — execution order / shared invariants

New interaction tests required when:
- Feature 2 transforms input Feature 1 assumed was final
- Shared data model or API contract changes

## Risks

| Risk | Mitigation |
|------|------------|
| Feature 2 regresses Feature 1 | Overlap guard + interaction tests |
| Weak test coverage | Every REQ maps to ≥1 test |

## Test Plan

| REQ | Test file / describe block |
|-----|---------------------------|
| REQ-001 | `feature.test.ts` → "…" |
```

Keep the spec **one to three pages**. Deep tactical detail lives in the feature SKILL.

---

## Step 2 — REQ → Test Rules

1. **Every REQ** → at least one `it(...)` (name should reference REQ id in comment or describe).
2. **Every interaction rule** → at least one cross-feature or contract test.
3. **Edge cases** called out in spec → explicit tests (empty input, both providers fail, etc.).
4. Prefer **`jest.config.unit.js`** for pure unit tests (mocks, no DB).
5. Test file location:
   - **Module packet:** `server/src/__tests__/modules/<testModuleDir>/`
   - **Service integration packet:** `server/src/__tests__/<pattern>.test.ts` (set `testPathPattern` in manifest)

```typescript
// REQ-001: context scoped to project + document ids
it('builds a context envelope scoped to project and source documents', () => { ... })
```

---

## Step 3 — Feature SKILL Template

Create `.agents/skills/adpa-<feature>/SKILL.md`:

```markdown
---
name: adpa-<feature>
description: <one line — when to load this skill>
---

# ADPA <Feature Title>

## Purpose
(What this feature does in one short paragraph.)

## Invariants
- Must always: …
- Must never: …

## Interaction Rules
- Depends on: `<other-feature>` — load that skill first
- Must not break: `validate<Other>Contract()`

## Key Files
| File | Role |
|------|------|

## Commands
\`\`\`powershell
cd server
npm run test:features -- <feature-id>   # this packet only
npm run test:features                   # all governed packets (CI)
npm run verify:governed-features
\`\`\`

Optional convenience alias in `server/package.json`:
\`"test:<feature-id>": "node scripts/run-governed-features.mjs <feature-id>"\`

## Related Skills
- `adpa-<related-feature>`
```

---

## Step 4 — Overlap Guard Pattern (Required When Features Stack)

When Feature B depends on Feature A:

### A. Contract function (Feature A)

```typescript
/** Foundational contract — Feature B must not ship if this fails. */
export function validate<Context>InjectionContract(): { ok: boolean; errors: string[] } {
  // Probe invariants programmatically (not only via full integration)
  return { ok: errors.length === 0, errors }
}
```

### B. Guard in Feature B tests

```typescript
import { validateContextInjectionContract } from '../ragContextInjection'

describe('Feature 2: adpa-rag-dynamic-fallback', () => {
  beforeEach(() => {
    const contract = validateContextInjectionContract()
    if (!contract.ok) {
      throw new Error(`Feature 1 contract broken: ${contract.errors.join('; ')}`)
    }
  })
  // ...
})
```

### C. CI / ops guard (optional)

```typescript
export async function runRagFeatureGuard(): Promise<{
  feature1: boolean
  feature2Ready: boolean
  errors: string[]
  remediation: string[]
}> { ... }
```

### D. Document in both SKILL files

Feature A skill: “This contract is the self-healing gate for dependents.”  
Feature B skill: “Requires Feature A contract; see `beforeEach` guard.”

**Reference implementation:**

- `server/src/modules/rag/ragContextInjection.ts` → `validateContextInjectionContract`
- `server/src/modules/rag/ragFeatureGuard.ts` → `runRagFeatureGuard`
- `server/src/__tests__/modules/rag/ragDynamicFallback.test.ts` → `beforeEach` guard

---

## Step 5 — Dual-Loop Behavior

### Loop A — Feature loop (local)

```
REQ → initial SKILL → test (RED) → refined SKILL → code (GREEN) → re-test
```

### Loop B — System loop (overlap)

Triggered when **Feature 2 work causes Feature 1 tests or contract to fail**:

```
STOP patching blindly
→ Add interaction test(s) to spec test plan
→ Update both SKILL files (interaction rules)
→ Fix Feature A contract and/or Feature B implementation
→ Re-run ALL feature test scripts
```

**Signal:** both `test:<feature-a>` and `test:<feature-b>` fail after a Feature B change → **model inconsistency**, not a one-line bug.

---

## Step 6 — Manifest Registration & CI (Level 5 / 5.5)

### Single source of truth

`server/governed-features.manifest.json` lists every governed packet.  
`server/scripts/run-governed-features.mjs` reads the manifest and runs Jest per feature.  
`server/package.json` → `"test:features": "node scripts/run-governed-features.mjs"`.

**Adding a new packet does not require editing `test:features`.** Register in the manifest only.

### Manifest entry schema

```json
{
  "id": "my-feature",
  "description": "One-line summary for humans/agents",
  "skills": ["adpa-my-feature"],
  "spec": "docs/superpowers/specs/YYYY-MM-DD-my-feature-design.md",
  "testPathPattern": "modules/my-feature",
  "testModuleDir": "my-feature",
  "overlapGuard": true
}
```

| Field | Required | Notes |
| ----- | -------- | ----- |
| `id` | yes | kebab-case feature id (`rag`, `doc-gen`) |
| `skills` | yes | ≥1 `.agents/skills/<name>/SKILL.md` paths (no `adpa-` prefix in folder name only — folder must be `adpa-*`) |
| `testPathPattern` | yes* | Jest `--testPathPattern` value |
| `testModuleDir` | module layout | When tests live in `__tests__/modules/<dir>/`; `id` must equal `testModuleDir` |
| `spec` | recommended | Relative path from repo root |
| `overlapGuard` | optional | Default **true** when `skills.length > 1`; set `false` for integration packets without module overlap guards |

\*If only `testModuleDir` is set, runner derives `testPathPattern` as `modules/<testModuleDir>`.

### Layout patterns

| Pattern | testModuleDir | testPathPattern | Example |
| ------- | ------------- | ----------------- | ------- |
| Module packet | `rag` | `modules/rag` | `ragContextInjection.test.ts` |
| Service integration | omit | `documentGenerationService` | `documentGenerationService.rag.test.ts` |

### Naming rules (`verify:governed-features`)

- `id` must be kebab-case.
- When `testModuleDir` is set: `id === testModuleDir`.
- Every `__tests__/modules/<dir>/` must appear in `features[]` or `legacyModuleDirs[]`.
- `test:features` must invoke `run-governed-features.mjs`.
- Multi-skill module packets need overlap guard in tests unless `overlapGuard: false`.

### Registration checklist (per packet)

1. Add `features[]` entry to `server/governed-features.manifest.json`.
2. Add test files matching `testPathPattern`.
3. If tests are not matched by existing `jest.config.unit.js` globs, add an explicit `testMatch` line.
4. *(Optional)* Add alias: `"test:<id>": "node scripts/run-governed-features.mjs <id>"`.
5. Run `npm run verify:governed-features` then `npm run test:features`.

### Commands

```powershell
cd server
npm run test:features              # all manifest features (CI)
npm run test:features -- rag         # single feature by id
npm run test:rag-features            # optional alias → rag
npm run test:doc-gen                 # optional alias → doc-gen
npm run verify:governed-features
```

CI: `.github/workflows/adpa-feature-validation.yml` runs verify + `test:features` on PRs touching `server/`, `.agents/skills/`, or specs.

---

## Agent Checklist (Copy Before Starting)

```
[ ] Design spec exists with REQ-001… and interaction rules
[ ] Initial SKILL.md (intent draft)
[ ] Tests written before production code (RED)
[ ] SKILL.md refined after test plan
[ ] Overlap guard added if depending on another feature
[ ] governed-features.manifest.json entry (id, skills, testPathPattern, spec)
[ ] jest.config.unit.js updated if tests outside default globs
[ ] npm run verify:governed-features passes
[ ] npm run test:features passes (or test:features -- <id>)
[ ] adpa-aev-workflow gates satisfied before commit
```

---

## Anti-Patterns

| Don't | Do instead |
| ----- | ---------- |
| Write code before tests | RED → GREEN |
| Fix Feature 2 only when Feature 1 regresses | Update interaction rules + both test suites |
| Hide assumptions in code comments | Put in spec + SKILL invariants |
| One giant integration test only | Unit tests per REQ + selective integration |
| Skip skill because "it's small" | Minimal SKILL still required for agent continuity |

---

## Canonical Reference — Registered Packets

### RAG (`id: rag`)

| Artifact | Path |
| -------- | ---- |
| Manifest | `server/governed-features.manifest.json` → `testPathPattern: modules/rag` |
| Spec | `docs/superpowers/specs/2026-06-08-rag-context-scoping-design.md` |
| Feature 1 tests | `server/src/__tests__/modules/rag/ragContextInjection.test.ts` |
| Feature 2 tests | `server/src/__tests__/modules/rag/ragDynamicFallback.test.ts` |
| Guard tests | `server/src/__tests__/modules/rag/ragFeatureGuard.test.ts` |
| Feature 1 skill | `.agents/skills/adpa-rag-context-injection/SKILL.md` |
| Feature 2 skill | `.agents/skills/adpa-rag-dynamic-fallback/SKILL.md` |
| Contract | `validateContextInjectionContract()` |
| Guard | `runRagFeatureGuard()` |
| Run | `npm run test:features -- rag` |

### Doc-gen (`id: doc-gen`)

| Artifact | Path |
| -------- | ---- |
| Manifest | `server/governed-features.manifest.json` → `testPathPattern: documentGenerationService` |
| Spec | `docs/superpowers/specs/2026-06-08-rag-context-scoping-design.md` (section-scoping + generation) |
| RAG integration tests | `server/src/__tests__/documentGenerationService.rag.test.ts` |
| Template / job tests | `server/src/__tests__/documentGenerationService.templateParagraphs.test.ts` |
| Skills | `adpa-doc-gen-queue`, `adpa-template-driven-generation` |
| Run | `npm run test:features -- doc-gen` |

Use **RAG** for module + overlap-guard packets; use **doc-gen** for service-level integration packets with `testPathPattern` only.

---

## Related Skills

- `adpa-aev-workflow` — atomic commits and validation gates
- `adpa-rag-context-injection` — RAG packet Feature 1
- `adpa-rag-dynamic-fallback` — RAG packet Feature 2 + overlap reference
- `adpa-doc-gen-queue` — doc-gen packet (queue + generation flow)
- `adpa-template-driven-generation` — doc-gen packet (template paragraphs)
- `writing-skills` — skill authoring quality bar
