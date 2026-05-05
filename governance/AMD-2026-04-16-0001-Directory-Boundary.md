# ✅ RPAS‑CM Amendment Record: AMD‑2026‑04‑16‑0001

## 1. Metadata
- **Type**: INT (Integration) / SEC (Security)
- **Status**: Proposed
- **Version Impact**: v2.4.0 (Directory Boundary Enforcement)
- **Task Class**: TCL-SEC + TCL-GOV
- **Governance Gate**: AEV Gates 1-4
- **Reference**: CP7 — Directory Boundary Enforcement

## 2. Change Description

This amendment establishes **CP7 — Directory Boundary Enforcement**, a technical enforcement layer that makes governance violations programmatically impossible rather than just policy violations.

### Core Provisions:

1. **Directory Manifest Declaration**
   - All projects must declare approved directories in `rpas-manifest.json`
   - Each directory specifies allowed extensions, task classes, and approval requirements
   - Blocked paths are explicitly blacklisted

2. **Gate 1 Integration**
   - All file operations are validated against the manifest before execution
   - Operations outside approved directories are rejected with violation codes
   - Authorization tokens are issued for valid operations

3. **Technical Enforcement**
   - C# Orchestrator layer intercepts file operations
   - Middleware validates HTTP API requests
   - Token verification at Gate 4 ensures manifest hasn't changed

4. **Audit Trail**
   - All rejections are logged with deterministic timestamps
   - Authorization tokens include cryptographic hashes
   - Full traceability for DRACO review

## 3. Files Created

| File | Purpose |
|------|---------|
| `server/src/orchestrator/DirectoryBoundary/DirectoryManifest.cs` | Manifest data structures |
| `server/src/orchestrator/DirectoryBoundary/DirectoryBoundaryValidator.cs` | Validation logic |
| `server/src/orchestrator/DirectoryBoundary/BoundaryEnforcementService.cs` | Enforcement service |
| `server/src/orchestrator/DirectoryBoundary/BoundaryMiddleware.cs` | ASP.NET middleware |
| `rpas-manifest.json` | Project directory manifest |

## 4. Violation Codes

| Code | Description | Response |
|------|-------------|----------|
| `CP7-GLOBAL-BLOCK` | File extension globally blocked | Reject + escalate |
| `CP7-BLOCKED-PATH` | Path in blacklist | Reject + log |
| `CP7-UNAPPROVED-PATH` | Path not in approved directories | Reject + suggest |
| `CP7-INVALID-EXTENSION` | Extension not allowed for directory | Reject + list allowed |
| `CP7-INVALID-TASK-CLASS` | Task class not permitted for directory | Reject + list allowed |

## 5. Integration Points

```
AEV Workflow Integration:

Phase 0: Task Classification (TCL-001)
    ↓
Phase 1: Scope Declaration
    → CP7: Validate paths against manifest
    → Issue authorization tokens
    ↓
Phase 2: Implementation
    → CP7: Verify tokens before file operations
    ↓
Phase 3: Validation Gates
    → Gate 1: Mechanical Integrity (includes CP7)
    → Gate 2: Build Integrity
    → Gate 3: Topology Integrity
    → Gate 4: Commit Certification (token verification)
    ↓
Phase 4: Commit Certification
```

## 6. Governance Lineage

| Field | Value |
|---|---|
| Artifact ID | `AMD‑2026‑04‑16‑0001` |
| Version | `v1.0.0` |
| Maturity | Proposed |
| Parent | `RPAS‑CM‑COL‑001 v1.0.0 (CSR‑42)` |
| Related | `RPAS‑CM‑TCL‑001`, `RPAS‑CM‑AEV‑001`, `RPAS‑CM‑PRE‑001` |
| Author | Agent (advisory) — awaiting human decision |
| CSR Epoch | Pending attestation |

## 7. Human Decision Required

Per **G1 (Authority Boundary)** and **RPAS-HIL**, this amendment requires:

- [ ] Human review and approval
- [ ] DRACO board attestation
- [ ] CSR epoch assignment
- [ ] Integration testing verification

---

## 8. Incident Context

This amendment was triggered by an incident where an agent created files in an unapproved directory (`angular-intro/`) that introduced incompatible dependencies. The incident demonstrated the need for technical enforcement rather than policy-only governance.

**Incident Details:**
- Agent created `angular-intro/src/main.ts` without TCL classification
- File introduced Angular dependencies in a Next.js project
- Build failed due to missing dependencies
- No scope declaration or Gate 1 validation occurred

**Remediation:**
- Files moved to isolated project with own `package.json`
- CP7 enforcement layer created to prevent future violations
- Manifest explicitly blocks `angular-intro/` directory

---

## 9. Certification Statement

Upon approval, this amendment certifies that:

1. All file operations will be validated against the directory manifest
2. Violations will be rejected at Gate 1 with deterministic error codes
3. Authorization tokens ensure end-to-end traceability
4. The system is programmed to apply governance law

**Status**: ⏳ Awaiting Human Authorization