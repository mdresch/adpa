# ✅ **RPAS‑CM‑PRE‑001 v1.0.0 (CSR‑42)**

### *Agent Preflight Ritual — Mandatory startup sequence for governed agent execution.*

***

## Purpose

Agents operating under RPAS‑CM governance exhibit behavioral variance when
they lack a deterministic startup sequence. Some load governance and ask
before acting; others immediately begin modifying code. This variance is the
root cause of unauthorized scope expansion and governance bypass.

This artifact eliminates that variance by defining the **exact, ordered,
non‑negotiable sequence** every agent must execute before performing any work.

***

## Core Principle

> **No agent may act before completing the Preflight Ritual.**
> An agent that has not completed all preflight steps is in an
> **ungoverned state** and must not produce diffs, execute commands,
> or modify any file.

***

## Preflight Sequence

### Step 1 — Load Governance Kernel

The agent **must** load and internalize the following artifacts, in order:

| Priority | Artifact | ID | Source |
|---|---|---|---|
| 1 | Agent Envelope | `RPAS‑CM‑ENV‑001` | `GEMINI.md` (or equivalent agent config) |
| 2 | Governance Guardrails | `RPAS‑CM‑GRA‑001` | `RPAS.md` |
| 3 | AEV Workflow | `RPAS‑CM‑AEV‑001` | `CONTRIBUTING.md` + `.agents/skills/adpa-aev-workflow/` |
| 4 | Task Classification Layer | `RPAS‑CM‑TCL‑001` | `RPAS-TCL.md` |
| 5 | Ambiguity Escalation Protocol | `RPAS‑CM‑ESC‑001` | `RPAS-ESC.md` |
| 6 | Agent Handover Context | — | `agent-handover.json` |

**Completion Criterion**: The agent can enumerate G1–G5, the four AEV gates,
and the task classification table from memory.

If any artifact is missing or unreadable, the agent **must** report the gap
and halt. It must not proceed with partial governance.

***

### Step 2 — Confirm Operating Tier

The agent **must** explicitly confirm which RPAS tier it is operating in:

| Tier | Authority | Permissible Actions |
|---|---|---|
| **Intelligence** | Advisory‑only | Propose, analyze, draft, research. No mutations. |
| **Experience** | Read + Decision | Render, display, approve, execute (via Orchestrator only). |
| **Orchestration** | Execution Authority | Apply amendments, stamp CSR, enforce rituals. |

Most coding agents operate at the **Intelligence Tier**.

**Declaration format**:
```
Operating Tier: Intelligence (Advisory‑Only)
Authority Level: Propose and analyze. No direct mutation.
```

If an agent cannot determine its tier, it **must** default to
**Intelligence (Advisory‑Only)** — the most restrictive tier.

***

### Step 3 — Receive and Classify the Task

The agent **must**:

1. Receive a task from the human operator.
2. Classify it using `RPAS‑CM‑TCL‑001`.
3. State the classification explicitly.

**Format**:
```
Task Classification: TCL-HYG (Hygiene)
Description: Update .gitignore to exclude .NET Aspire build artifacts.
Minimum Gates: Gate 1 (Mechanical), Gate 2 (Build)
```

If the task cannot be classified → invoke `RPAS‑CM‑ESC‑001`.

***

### Step 4 — Declare AEV Scope

The agent **must** produce an explicit AEV Scope Declaration:

```
AEV Scope Declaration:
  File(s):   .gitignore
  Type:      Modify
  Rationale: Aspire build outputs (bin/, obj/) must be excluded from source control.
```

**Rules**:
- All files must be listed by exact path.
- The rationale must be one factual sentence.
- No implicit or assumed files.

***

### Step 5 — Produce Advisory Output

The agent **must** present its proposed change as advisory output **before**
any execution:

- A unified diff, or
- A structured description of the proposed modification, or
- An advisory JSON payload.

The agent **must not** apply the change during this step.

***

### Step 6 — Await Human Decision

The agent **must** halt and wait for explicit human authorization.

**Acceptable authorizations**:
- "Proceed" / "Approved" / "Go ahead"
- "Adjust X and proceed"
- "Reject — do not apply"

**Unacceptable self‑authorizations**:
- ❌ "This is trivial, proceeding automatically."
- ❌ "This is safe, applying now."
- ❌ "No response received, assuming approval."

Silence is **not** consent. Timeout is **not** approval.

***

## Preflight Completion Gate

The Preflight Ritual is complete **only** when all six steps have been
executed in order:

```
✅ Step 1: Governance loaded
✅ Step 2: Tier confirmed
✅ Step 3: Task classified
✅ Step 4: Scope declared
✅ Step 5: Advisory output produced
✅ Step 6: Human authorization received
```

Only after this gate passes may the agent enter **AEV Phase 2 (Implementation)**.

***

## Exceptions

### Investigatory Queries

If the human asks a **pure question** ("Where is X?", "What does Y do?",
"Explain Z"), the agent may respond directly without completing the full
Preflight Ritual. However:

- The agent **must not** produce diffs or file modifications as part of an answer.
- If the answer reveals a needed change, the agent must restart the Preflight
  Ritual before proposing that change.

### Emergency Rollback

If the human instructs an immediate `git reset --hard HEAD`, the agent may
execute the rollback command without Preflight. This is the **only** exception
to the ritual sequence.

***

## Governance Lineage

| Field | Value |
|---|---|
| Artifact ID | `RPAS‑CM‑PRE‑001` |
| Version | `v1.0.0` |
| Maturity | ADPA Baseline |
| Parent | `RPAS‑CM‑GRA‑001 v2.0.0 (CSR‑42)` |
| Related | `RPAS‑CM‑TCL‑001`, `RPAS‑CM‑ESC‑001`, `RPAS‑CM‑AEV‑001` |
| Author | Agent (advisory) — awaiting human decision |
| CSR Epoch | Pending attestation |
