---
name: adpa-aev-workflow
description: Mandatory Atomic Execution & Validation (AEV) workflow for all agent-driven edits.
---

# Atomic Execution & Validation (AEV) Skill

This skill enforces the AEV workflow for all interactions with the ADPA codebase. It ensures that every change is atomic, verifiable, and safe.

## When to Use
- **Trigger**: Every time you are about to propose or execute a code change.
- **Goal**: Minimize regression risk and maintain architectural integrity.

## Core Principles
1. **One Logical Change**: Exactly one entity, state transition, component, or refactor.
2. **Explicit Scope**: Declare files and rationale before starting.
3. **No Silent Edits**: Everything must be visible and validated.
4. **Validation or Rollback**: If a gate fails, revert immediately.

## Execution Procedure

### 1. Scope Declaration
Before any change, state the following:
- **Files**: List of exact paths.
- **Type**: Add/Modify/Delete.
- **Rationale**: One factual sentence.

### 2. Implementation
- Use `replace_file_content` or `write_to_file` for full contents.
- Ensure only declared files are modified.

### 3. Validation Gates (IN ORDER)

#### 🟢 Gate 1: Mechanical Integrity
```powershell
git status
git diff --stat
```
*Wait for output.* Verify only declared files are changed.

#### 🟢 Gate 2: Build Integrity
```powershell
dotnet build
```
*Wait for output.* Verify zero errors.

#### 🟢 Gate 3: Orchestration Integrity
```powershell
dotnet run --project orchestrator/Adpa.AppHost
```
*Verify startup success.*

#### 🟢 Gate 4: Governance Check
Confirm invariants:
- Ledger records are append-only.
- Phase transitions are explicit.
- Human approval gates are intact.

### 4. Certification
Only if all gates pass:
```powershell
git add .
git commit -m "SAFE: <atomic change description>"
```

## Rollback Policy
If ANY gate fails:
```powershell
git reset --hard HEAD
```
Do **not** attempt to fix in a dirty state. Restart from a clean slate.
