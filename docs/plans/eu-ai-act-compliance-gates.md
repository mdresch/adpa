# Implementation Plan: EU AI Act Compliance & Quality Gates

## Goal Description
Enforce compliance gates for documents generated under EU jurisdiction. The compliance gate score must be $\ge 75%$, otherwise document generation and publishing are automatically blocked. Provide metrics storage and calculate 7 core compliance metrics during the QA stage.

## Proposed Changes

### `server/src/__tests__/integration/eu-ai-compliance.test.ts`
- [NEW] Write tests to validate the quality gate block behavior. Specifically, ensure that documents generated for the EU region without the "AI-Generated" badge/label or human review mechanisms are successfully blocked.

### `app/quality-audit/page.tsx`
- [MODIFY] Ensure compliance metrics (GDPR, SOC 2, HIPAA, PMBOK) calculate automatically based on data from `generation_metadata` and render accurately on the Quality Audit Reports page in the user dashboard.

## Verification Plan
- **Automated Tests**: Run `eu-ai-compliance.test.ts` to verify that EU documents missing badges are blocked.
- **Manual Verification**: Generate a compliant document and navigate to the Quality Audit Reports page. Verify that the 7 core compliance metrics are calculated and displayed correctly.
