# ✅ **RPAS‑CM‑TCL‑001 v1.0.0 (CSR‑42)**

### *Task Classification Layer — Authoritative taxonomy of governed agent tasks.*

***

## Purpose

Agents operating under RPAS‑CM governance must classify every assignment before
attempting any action. Without an explicit task taxonomy, agents treat
"housekeeping", "cleanup", and "refactoring" as ungoverned — leading to
unauthorized scope expansion, silent mutations, and governance bypass.

This artifact eliminates that failure mode by defining **every valid task class**
and its AEV requirements.

***

## Core Principle

> **There is no ungoverned work.**
> Every agent action — from a single‑line comment change to a full feature
> implementation — is a governed task that must follow the AEV ritual.

***

## Task Classification Table

| Class | ID | Description | AEV Scope | Example |
|---|---|---|---|---|
| **Feature** | `TCL-FEAT` | New capability, endpoint, component, or entity | Full (Gates 1–4) | Add RTM seed endpoint |
| **Refactor** | `TCL-REFAC` | Structural change with no semantic difference | Full (Gates 1–4) | Consolidate PDF services |
| **Hygiene** | `TCL-HYG` | Repository housekeeping: `.gitignore`, formatting, dead code removal | Gates 1, 2 | Update `.gitignore` for Aspire artifacts |
| **Documentation** | `TCL-DOC` | Docs, ADRs, governance artifacts, README updates | Gate 1 only | Add ADR‑005 |
| **Configuration** | `TCL-CFG` | Environment, build config, CI/CD, Aspire `Program.cs` | Full (Gates 1–4) | Add RabbitMQ to AppHost |
| **Migration** | `TCL-MIG` | Database schema, Drizzle migration, data seeding | Full (Gates 1–4) | Add `governance_ledger` table |
| **Bugfix** | `TCL-FIX` | Targeted correction of incorrect behavior | Full (Gates 1–4) | Fix ledger query returning stale CSR |
| **Security** | `TCL-SEC` | Auth, secrets, RBAC, vulnerability remediation | Full (Gates 1–4) + human review | Rotate Firebase service account |
| **Governance** | `TCL-GOV` | Changes to RPAS artifacts, guardrails, or governance tooling | Gate 1 + Gate 4 | Add `RPAS-TCL.md` |
| **Dependency** | `TCL-DEP` | Package updates, NuGet/npm version bumps | Full (Gates 1–4) | Update Aspire SDK to 13.2.2 |

***

## Classification Rules

### Rule 1 — Every Task Has Exactly One Class

An agent **must not** combine classes in a single atomic change.

- ❌ "Fix bug AND refactor the module" → **Reject. Split into two.**
- ❌ "Update .gitignore AND add a new endpoint" → **Reject. Split into two.**
- ✅ "Update .gitignore to exclude Aspire build artifacts" → `TCL-HYG`, single scope.

### Rule 2 — Classification Precedes Scope Declaration

The AEV Scope Declaration (files, type, rationale) is only valid **after** the
task class has been determined.

```
Step 1: Classify → TCL-HYG
Step 2: Declare  → File: .gitignore | Type: Modify | Rationale: "..."
Step 3: Execute  → Apply change
Step 4: Validate → Run applicable gates
```

### Rule 3 — Unknown = Unclassified = Blocked

If an agent cannot map a request to a class in the table above:

- The agent **must not proceed**.
- The agent **must** invoke the Ambiguity Escalation Protocol (`RPAS‑CM‑ESC‑001`).
- The agent **must** request human reclassification.

### Rule 4 — "Trivial" Is Not an Exemption

The following are **not** valid reasons to bypass governance:

- "It's just a comment"
- "It's obvious what needs to happen"
- "This is a one‑liner"
- "No code is changing, only config"

All of these are governed tasks with a defined class.

### Rule 5 — Gate Requirements Are Minimum Gates

The "AEV Scope" column defines the **minimum** gates. An agent or operator
may always run additional gates. Skipping a required gate is a governance
violation.

***

## Integration with AEV Workflow

The Task Classification Layer slots into the AEV workflow as **Phase 0**:

```
Phase 0: Task Classification  (TCL-001)   ← NEW
Phase 1: Scope Declaration     (AEV)
Phase 2: Implementation        (AEV)
Phase 3: Validation Gates      (AEV / RPAS)
Phase 4: Commit Certification  (AEV)
```

***

## Governance Lineage

| Field | Value |
|---|---|
| Artifact ID | `RPAS‑CM‑TCL‑001` |
| Version | `v1.0.0` |
| Maturity | ADPA Baseline |
| Parent | `RPAS‑CM‑GRA‑001 v2.0.0 (CSR‑42)` |
| Related | `RPAS‑CM‑AEV‑001`, `RPAS‑CM‑PRE‑001`, `RPAS‑CM‑ESC‑001` |
| Author | Agent (advisory) — awaiting human decision |
| CSR Epoch | Pending attestation |

could you write an architecture representation of TCL to use the created postgresql database when aspire AppHost is loading and the required tables are implemented inside the database to ensure each agent can register or ensure the database is updated with the tasks they are going to perform. These should include a list of files or folders that need to be locked or not touched by other agents performing under the RPAS CM Certfication and ensure cloud maintenance does not overlap multiple agents performing cloud maintenance in the boudaries preverably the modular nature of the architecture. The modular modern build of the architecture ensure that overlap between agents will not take place whilst the agents are coding in execution mode. Registrtion of tasks is a json format with payload of the tasks and the files used. The schema should enable the registration of the approval from human in the loop. Depending on the phase the tasks is staged the files can remain unlocked till execution phase and the gates should lock the files for an update and execution by the executing agent. The traffic a changes create inside of the cloud system requires oversight and control to ensure the traffic is redirected on files that require to be maintained updated refractored or otherwise amended. CSR Epoch and the files remain readable but are changing the exact period of the lock on files should depand on the type of maintenance performed. TCL-001 is the initial effort to provide cloud maitenance windows to the codebase to enable the Agents to make amendments under the strict RPAS Cloud Master Certified governance and guardrails.

Agents Yolo mode consist of the agents being cretive in providing suggestions to the code base but yolo mode is not possible in the execution phases meaning code implementation / execution of the code base or writing of code to the files. Those will always require oversight to ensure the intended changes are described appropriately. Yolo mode is an agents planning mode without write actions rights.s
