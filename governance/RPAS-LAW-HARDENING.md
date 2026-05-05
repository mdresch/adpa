# ✅ RPAS‑CM Law Hardening Protocol

## Purpose

This document defines the mandatory process for transitioning governance laws from **definition** to **enforcement**. It ensures that laws are proven safe, deterministic, and non-destructive before they can block execution.

**Core Principle:**
> Laws must be proven before they are enforced.  
> One enforced law is worth more than ten theoretical ones.

---


## Lawful system posture & the administrator role

**System hardening** in RPAS terms is the upgrade toward a **lawful system**: governance rules are expressed where possible as **mechanical** checks (validators, API validation, database transition rules, orchestration invariants)—constraints that behave like **deterministic invariants** (same state → same verdict), not as informal policy that any privileged account can ignore.

**Administrator role:** The administrator **must not be enabled** to bypass those requirements. The role transitions from a classical **super‑administrator** (implicit omnipotence) to a **law governor**: defining and changing law only through governed rituals, while **execution** remains subject to the same mechanical laws as everyone else. If the system was never designed to grant a path, **mechanical enforcement** prevents anyone—including an administrator—from treating that path as available.

**Law change and tokens:** A change of law is itself a governed mutation. After definition and hardening phases permit it, **requests for validation** (against the manifest, ledger, transition matrix, and related validators) must succeed before **cryptographic authority tokens** are issued. Tokens prove that the work is **scoped** to what validation allowed under the **current** law set; they are the bridge between **human decisions about law** and **machine‑enforceable permission to act**.

---

## 1. Law Lifecycle Phases

Every RPAS law progresses through these phases:

| Phase | Name | Description | Blocking? |
|-------|------|-------------|-----------|
| 0 | **Definition** | Law is written, not implemented | No |
| 1 | **Instrumentation** | Validators, middleware, telemetry created | No |
| 2 | **Shadow Evaluation** | Law runs in parallel, logs violations | No |
| 3 | **Evidence Collection** | Metrics gathered, false positives identified | No |
| 4 | **Validation** | Law proven safe, no negative side effects | No |
| 5 | **Constitutional Enforcement** | Law blocks violations, tokens denied | Yes |

**Critical Rule:**
> Skipping phases 2–4 creates *governance-induced system failure*, which RPAS explicitly forbids.

---

## 2. Phase Details

### Phase 0: Definition

**Status:** Law written as policy document  
**Blocking:** No  
**Artifacts:** Markdown governance document (e.g., `RPAS-COL.md`, `RPAS-TCL.md`)

**Exit Criteria:**
- [ ] Law text is complete and unambiguous
- [ ] Violation codes defined
- [ ] Related laws identified
- [ ] Human review completed

---

### Phase 1: Instrumentation

**Status:** Technical implementation created  
**Blocking:** No  
**Artifacts:** C# validators, middleware, services

**Exit Criteria:**
- [ ] Validator class implemented
- [ ] Violation codes programmatically generated
- [ ] Logging/telemetry hooks in place
- [ ] Unit tests for validator logic pass

---

### Phase 2: Shadow Evaluation (Critical)

**Status:** Law runs in parallel with execution  
**Blocking:** No — violations logged but not enforced  
**Mode:** Pre-Authoritative Law Evaluation

**Implementation:**
```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST INCOMING                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 EXECUTION CHANNEL (Current)                  │
│  - Executes as today                                         │
│  - No enforcement applied                                    │
│  - Returns normal result                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               EVALUATION CHANNEL (Shadow)                   │
│  - Runs full CP7 validation logic                            │
│  - Generates violation codes                                 │
│  - Emits warnings, logs, telemetry                           │
│  - Does NOT block execution                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    COMPARISON LOG                            │
│  - Would this request have been blocked?                     │
│  - If yes, why?                                              │
│  - Was that block desirable?                                 │
└─────────────────────────────────────────────────────────────┘
```

**Exit Criteria:**
- [ ] Shadow channel runs for minimum 7 days
- [ ] All violation types observed at least once
- [ ] No unexplained violations
- [ ] False positive rate < 0.1%

---

### Phase 3: Evidence Collection

**Status:** Metrics gathered and analyzed  
**Blocking:** No  

**Mandatory Metrics:**

| Metric | Target | Current |
|--------|--------|---------|
| Total requests evaluated | — | — |
| Violations detected | — | — |
| Violations by code | — | — |
| False positives | 0 | — |
| False positive rate | < 0.1% | — |
| Legitimate workflows impacted | 0 | — |
| Paths most frequently flagged | — | — |
| Extensions most frequently flagged | — | — |

**Exit Criteria:**
- [ ] All metrics collected
- [ ] False positive count = 0
- [ ] All violations explainable
- [ ] Violations correlate with real risk
- [ ] Impact radius documented

---

### Phase 4: Validation

**Status:** Law proven safe, no negative side effects  
**Blocking:** No  

**Negative Side Effects Checklist:**

| Side Effect | Status | Evidence |
|-------------|--------|----------|
| Silent productivity loss | ❌ None | — |
| Governance deadlock | ❌ None | — |
| Law conflicts | ❌ None | — |
| Observability gap | ❌ None | — |
| Path canonicalization bugs | ❌ None | — |
| OS-specific edge cases | ❌ None | — |
| Task-class escalation | ❌ None | — |
| Extension bypass tricks | ❌ None | — |

**Exit Criteria:**
- [ ] All negative side effects checked
- [ ] No unresolved false positives
- [ ] Rollback path defined
- [ ] Human approval obtained
- [ ] DRACO board attestation

---

### Phase 5: Constitutional Enforcement

**Status:** Law blocks violations  
**Blocking:** Yes — tokens denied, requests blocked  

**Activation Requirements:**
- [ ] Phases 0–4 complete
- [ ] Zero unresolved false positives
- [ ] All violations explainable
- [ ] Violations correlate with real risk
- [ ] Impact radius understood
- [ ] Rollback path defined
- [ ] Human authorization obtained
- [ ] CSR epoch assigned

**Enforcement Behavior:**
```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST INCOMING                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 LAW VALIDATION (Active)                      │
│  - Validates against manifest                                │
│  - Generates violation code if invalid                       │
│  - BLOCKS execution if violation detected                   │
│  - Returns error with violation code                         │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
               VALID                  INVALID
                    │                   │
                    ▼                   ▼
            ┌───────────────┐   ┌───────────────────┐
            │ TOKEN ISSUED  │   │ REQUEST BLOCKED   │
            │ EXECUTION     │   │ VIOLATION LOGGED  │
            │ PROCEEDS      │   │ ESCALATION TRIGGER│
            └───────────────┘   └───────────────────┘
```

---

## 3. Law Hardening Checklist

Before any law graduates to Phase 5 (Constitutional Enforcement), it must pass this checklist:

### 3.1 Definition Completeness
- [ ] Law text is unambiguous
- [ ] All violation codes defined
- [ ] All edge cases documented
- [ ] Related laws identified and non-conflicting

### 3.2 Implementation Correctness
- [ ] Validator logic implemented correctly
- [ ] Unit tests pass with 100% coverage of violation codes
- [ ] Integration tests pass with real workloads
- [ ] No path canonicalization bugs
- [ ] No OS-specific edge cases

### 3.3 Shadow Evaluation Results
- [ ] Minimum 7 days of shadow evaluation
- [ ] All violation types observed
- [ ] False positive rate < 0.1%
- [ ] No unexplained violations

### 3.4 Evidence Quality
- [ ] Metrics collected and documented
- [ ] Violations correlate with real risk
- [ ] Impact radius understood
- [ ] No legitimate workflows impacted

### 3.5 Negative Side Effects
- [ ] No silent productivity loss
- [ ] No governance deadlock
- [ ] No law conflicts
- [ ] No observability gap

### 3.6 Rollback Readiness
- [ ] Rollback path defined
- [ ] Rollback tested
- [ ] Rollback does not cause data loss

### 3.7 Human Authorization
- [ ] Human review completed
- [ ] DRACO board attestation obtained
- [ ] CSR epoch assigned

---

## 4. Current Law Status

| Law | Phase | Blocking | Status |
|-----|-------|----------|--------|
| CP1 — Tier Collision Prevention | 5 | Yes | Enforced |
| CP2 — Execution Collision Prevention | 5 | Yes | Enforced |
| CP3 — Amendment Collision Prevention | 5 | Yes | Enforced |
| CP4 — Semantic Collision Prevention | 5 | Yes | Enforced |
| CP5 — Build/Topology Collision Prevention | 5 | Yes | Enforced |
| CP6 — Governance Collision Prevention | 5 | Yes | Enforced |
| **CP7 — Directory Boundary Enforcement** | **1** | **No** | **Instrumentation** |

---

## 5. Graduation Criteria

A law graduates from Phase N to Phase N+1 when:

1. **All exit criteria for Phase N are met**
2. **No unresolved issues from Phase N**
3. **Human approval obtained (Phases 4→5)**
4. **CSR epoch assigned (Phases 4→5)**

---

## 6. Rollback Procedure

If a law in Phase 5 causes issues:

1. **Immediate:** Revert to Phase 2 (Shadow Evaluation)
2. **Log:** All violations during incident
3. **Analyze:** Root cause of false positive or negative side effect
4. **Fix:** Update law or implementation
5. **Re-validate:** Complete Phases 2–4 again
6. **Re-approve:** Human authorization for Phase 5

---

## Governance Lineage

| Field | Value |
|---|---|
| Artifact ID | `RPAS‑CM‑LAW‑HARDENING‑001` |
| Version | `v1.0.0` |
| Parent | `RPAS‑CM‑COL‑001 v1.0.0 (CSR‑42)` |
| Related | `RPAS‑CM‑AEV‑001`, `RPAS‑CM‑PRE‑001` |
| Author | Agent (advisory) — awaiting human decision |
| CSR Epoch | Pending attestation |