# Draco Governance: Trigger Mutation, Diff View Integration & Compliance Exports Design Spec

This specification outlines the execution protocol for **Mission Draco**, establishing a real-time event-driven compliance gate and high-fidelity verification layers for the ADPA Governance Ledger.

## Goal Description
The DRACO AI Governance Framework requires a closed-loop system for automated state degradation, adversarial debate, and atomic human promotion. This design completes that lifecycle by:
1. **Attaching a Postgres trigger** to `policy_library` to capture control degradations to `INEFFECTIVE` and notify the `effectivenessWorker` via `pg_notify`.
2. **Integrating a side-by-side Diff View** in the dashboard using `react-diff-view` to compare active rules against arbitrator compromise proposals.
3. **Scaffolding a signed PDF Compliance Export** API route (`/api/v1/governance/ledger/:id/export`) for external auditors.

---

## User Review Required

> [!IMPORTANT]
> **Adversarial Payload Validation**: The Postgres trigger maps `policy_library` schema fields (including array-based `target_document_types`) to a single `documentType` string parameter (`TECHNICAL_SPEC` | `STRATEGIC_CHARTER` | `OPERATIONAL_PLAYBOOK`) and extracts historical metrics to formulate a type-safe payload for the worker.

---

## Open Questions
*   **Audit Export Signing Signature**: For Phase 5, the PDF export endpoint is scaffolded with raw audit metadata and 4-agent transcript arrays. Standard cryptographic signing (using a secret KEK or HSM module integration) will follow in later phases.

---

## Proposed Changes

### Database Layer

#### [NEW] [416_add_governance_mutation_trigger.sql](file:///f:/Source/Repos/adpa/server/migrations/416_add_governance_mutation_trigger.sql)
Creates the database trigger `trg_policy_library_effectiveness_mutation` and trigger function `fn_notify_governance_control_mutation` on the `policy_library` table to catch `control_effectiveness_status = 'INEFFECTIVE'` status updates.

### Frontend Components

#### [NEW] [DracoDiffViewer.tsx](file:///f:/Source/Repos/adpa/app/governance/components/DracoDiffViewer.tsx)
Scaffolds the split-view layout for line differences using `react-diff-view` with deep custom Tailwind color mappings for additions and deletions.

#### [MODIFY] [page.tsx](file:///f:/Source/Repos/adpa/app/governance/page.tsx)
Wires up `DracoDiffViewer`, fetches active policy definitions from `/api/v1/policy-library`, resolves differences dynamically, and binds a "Generate Compliance Report" export action.

### Backend Routing

#### [MODIFY] [councilRouter.ts](file:///f:/Source/Repos/adpa/server/src/api/governance/councilRouter.ts)
Exposes the PDF export route `GET /api/v1/governance/ledger/:auditId/export` to serve a structured ledger printout for external auditors.

---

## Verification Plan

### Automated & Manual Verification
1. **Trigger Check**: Run `UPDATE policy_library SET control_effectiveness_status = 'INEFFECTIVE' WHERE rule_code = 'CTRL-COBIT-DSS05';` (after inserting the rule if missing) and check application logs for tribunal startup.
2. **UI Diff Render Check**: Verify that Next.js successfully compiles and renders the split diff screen when selecting a pending candidate in `/governance`.
3. **Audit Export Check**: Trigger the export command from the UI and verify that the file download receives a `200` status with structured PDF mock bytes.
