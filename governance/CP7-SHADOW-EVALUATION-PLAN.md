# ✅ CP7 Shadow Enforcement Evaluation Plan

## Purpose

This document defines the evaluation plan for transitioning CP7 (Directory Boundary Enforcement) from **Phase 1 (Instrumentation)** to **Phase 5 (Constitutional Enforcement)**.

**Current Status:** Phase 1 — Instrumentation Complete  
**Target Status:** Phase 5 — Constitutional Enforcement  
**Estimated Duration:** 14-21 days minimum

---

## 1. Evaluation Objectives

### Primary Objectives
1. Prove CP7 produces zero false positives
2. Verify all violations are explainable
3. Confirm violations correlate with real risk
4. Document impact radius
5. Define rollback path

### Secondary Objectives
1. Collect metrics on violation frequency
2. Identify most common violation types
3. Validate manifest configuration
4. Test edge cases (symlinks, case sensitivity, etc.)

---

## 2. Phase 2: Shadow Evaluation Implementation

### 2.1 Dual-Channel Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           REQUEST INCOMING                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXECUTION CHANNEL                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Current Behavior (Unchanged)                                        │ │
│  │ - Executes as today                                                  │ │
│  │ - No enforcement applied                                            │ │
│  │ - Returns normal result                                              │ │
│  │ - No blocking, no tokens required                                   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (parallel)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        EVALUATION CHANNEL (Shadow)                       │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ CP7 Validation Logic                                                 │ │
│  │ - Runs full CP7 validation                                           │ │
│  │ - Generates violation codes                                          │ │
│  │ - Emits warnings, logs, telemetry                                    │ │
│  │ - Does NOT block execution                                           │ │
│  │ - Does NOT deny tokens                                               │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Shadow Evaluation Log                                                │ │
│  │ - Request ID                                                         │ │
│  │ - Would block? (yes/no)                                              │ │
│  │ - Violation code (if any)                                            │ │
│  │ - Reason (if any)                                                    │ │
│  │ - Suggested action (if any)                                          │ │
│  │ - Timestamp                                                          │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         METRICS COLLECTOR                                │
│  - Aggregates shadow evaluation results                                  │
│  - Calculates false positive rate                                        │
│  - Identifies patterns                                                   │
│  - Generates reports                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Shadow Mode Configuration

```json
{
  "cp7_enforcement_mode": "shadow",
  "shadow_evaluation": {
    "enabled": true,
    "log_all_requests": true,
    "block_enabled": false,
    "token_required": false,
    "metrics_collection": true,
    "telemetry_endpoint": "/api/cp7/telemetry"
  },
  "phase": 2,
  "phase_name": "Shadow Evaluation",
  "started_at": "2026-04-16T00:00:00Z",
  "target_phase": 5,
  "target_phase_name": "Constitutional Enforcement"
}
```

---

## 3. Phase 3: Evidence Collection Plan

### 3.1 Metrics Dashboard

| Metric | Description | Collection Method |
|--------|-------------|-------------------|
| `total_requests` | All requests evaluated | Counter |
| `valid_requests` | Requests that would pass | Counter |
| `blocked_requests` | Requests that would be blocked | Counter |
| `violations_by_code` | Count per violation code | Histogram |
| `violations_by_path` | Count per path pattern | Histogram |
| `violations_by_extension` | Count per file extension | Histogram |
| `violations_by_task_class` | Count per TCL class | Histogram |
| `false_positives` | Reported false positives | Counter |
| `false_positive_rate` | FP / total_requests | Gauge |
| `avg_evaluation_time_ms` | Time to evaluate | Summary |

### 3.2 Daily Report Template

```markdown
# CP7 Shadow Evaluation Daily Report

**Date:** YYYY-MM-DD  
**Phase:** 2 (Shadow Evaluation)

## Summary
- Total requests evaluated: X
- Would block: X (X%)
- Would pass: X (X%)
- False positives reported: X

## Violations by Code
| Code | Count | Percentage |
|------|-------|------------|
| CP7-UNAPPROVED-PATH | X | X% |
| CP7-INVALID-EXTENSION | X | X% |
| ... | ... | ... |

## Top Flagged Paths
1. /path/to/file1.ts (X violations)
2. /path/to/file2.ts (X violations)

## Top Flagged Extensions
1. .ts (X violations)
2. .json (X violations)

## False Positives
| ID | Path | Reason | Status |
|----|------|--------|--------|
| FP-001 | /path/file.ts | Legitimate workflow | Investigating |

## Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

---

## 4. Phase 4: Validation Checklist

### 4.1 Path Authority Law (CP7 Core)

**Test Cases:**

| Test ID | Description | Expected | Status |
|---------|-------------|----------|--------|
| PATH-001 | Valid path in approved directory | Pass | ⬜ |
| PATH-002 | Invalid path outside approved directories | Block | ⬜ |
| PATH-003 | Path in blocked list | Block | ⬜ |
| PATH-004 | Path with case variation | Deterministic | ⬜ |
| PATH-005 | Path with symlink | Deterministic | ⬜ |
| PATH-006 | Path with `..` traversal | Block | ⬜ |
| PATH-007 | Path with null byte injection | Block | ⬜ |
| PATH-008 | Path with unicode normalization | Deterministic | ⬜ |
| PATH-009 | Windows vs Unix path separators | Deterministic | ⬜ |
| PATH-010 | Absolute vs relative path | Deterministic | ⬜ |

### 4.2 Task-Class Scope Law

**Test Cases:**

| Test ID | Description | Expected | Status |
|---------|-------------|----------|--------|
| TASK-001 | TCL-FEAT in approved directory | Pass | ⬜ |
| TASK-002 | TCL-DOC in code directory | Block | ⬜ |
| TASK-003 | TCL-SEC in governance directory | Pass | ⬜ |
| TASK-004 | Unknown task class | Block | ⬜ |
| TASK-005 | Empty task class | Block | ⬜ |
| TASK-006 | Task class escalation attempt | Block | ⬜ |

### 4.3 Extension Integrity Law

**Test Cases:**

| Test ID | Description | Expected | Status |
|---------|-------------|----------|--------|
| EXT-001 | Allowed extension in approved directory | Pass | ⬜ |
| EXT-002 | Blocked extension globally | Block | ⬜ |
| EXT-003 | Extension not in allowed list | Block | ⬜ |
| EXT-004 | Uppercase extension (.TS) | Deterministic | ⬜ |
| EXT-005 | Multi-extension (.tar.gz) | Deterministic | ⬜ |
| EXT-006 | No extension | Deterministic | ⬜ |
| EXT-007 | Extension with query string | Block | ⬜ |

### 4.4 Deny > Allow Precedence Law

**Test Cases:**

| Test ID | Description | Expected | Status |
|---------|-------------|----------|--------|
| PREC-001 | Path in both approved and blocked | Block | ⬜ |
| PREC-002 | Extension in both allowed and blocked | Block | ⬜ |
| PREC-003 | Global block overrides directory allow | Block | ⬜ |
| PREC-004 | Directory allow does not override global block | Block | ⬜ |

---

## 5. Negative Side Effects Detection

### 5.1 Silent Productivity Loss

**Detection Method:**
- Monitor developer workflow completion rates
- Track time-to-commit for common tasks
- Survey developers for unexpected friction

**Threshold:** Zero unexplained productivity loss

### 5.2 Governance Deadlock

**Detection Method:**
- Attempt all common operations during shadow evaluation
- Verify no circular dependencies in manifest
- Test system self-operation paths

**Threshold:** Zero deadlock scenarios

### 5.3 Law Conflicts

**Detection Method:**
- Cross-reference CP7 with CP1-CP6
- Test scenarios where laws might conflict
- Document resolution precedence

**Threshold:** Zero conflicts

### 5.4 Observability Gap

**Detection Method:**
- Verify all violations are logged
- Verify all logs are explainable
- Verify logs contain sufficient context

**Threshold:** Zero unexplainable violations

---

## 6. Graduation Criteria

CP7 graduates to Phase 5 (Constitutional Enforcement) when:

### Quantitative Criteria
- [ ] Shadow evaluation duration ≥ 14 days
- [ ] Total requests evaluated ≥ 1000
- [ ] False positive count = 0
- [ ] False positive rate < 0.1%
- [ ] All test cases pass

### Qualitative Criteria
- [ ] All violations explainable
- [ ] Violations correlate with real risk
- [ ] Impact radius documented
- [ ] No negative side effects detected
- [ ] Rollback path defined and tested

### Authorization Criteria
- [ ] Human review completed
- [ ] DRACO board attestation obtained
- [ ] CSR epoch assigned

---

## 7. Rollback Plan

### 7.1 Immediate Rollback (Phase 5 → Phase 2)

If CP7 causes issues in Phase 5:

```bash
# 1. Revert configuration
cp7_enforcement_mode: "shadow"

# 2. Log incident
echo "CP7_ROLLBACK: $(date)" >> /var/log/cp7-incidents.log

# 3. Notify DRACO
# Automated notification to governance board

# 4. Preserve evidence
# All logs from incident period preserved for analysis
```

### 7.2 Analysis Period

After rollback:
1. Analyze all violations during incident
2. Identify root cause
3. Update law or implementation
4. Re-run Phases 2-4
5. Re-obtain human authorization

---

## 8. Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Instrumentation | Complete | — | — |
| Phase 2: Shadow Evaluation | 14 days min | Day 1 | Day 14+ |
| Phase 3: Evidence Collection | Ongoing | Day 1 | Day 14+ |
| Phase 4: Validation | 3 days | Day 15 | Day 17 |
| Phase 5: Constitutional Enforcement | — | Day 18+ | — |

**Note:** Phase 2 can be extended if criteria not met.

---

## Governance Lineage

| Field | Value |
|---|---|
| Artifact ID | `CP7‑SHADOW‑EVAL‑PLAN‑001` |
| Version | `v1.0.0` |
| Parent | `RPAS‑CM‑LAW‑HARDENING‑001` |
| Related | `AMD‑2026‑04‑16‑0001`, `RPAS‑CM‑COL‑001` |
| Author | Agent (advisory) — awaiting human decision |
| CSR Epoch | Pending attestation |