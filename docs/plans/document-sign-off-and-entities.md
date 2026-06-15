# Implementation Plan: Document Sign-off, Entity Verification & Overview Reporting

## Goal Description
Ensure that `<H8>` tags parsed from documents successfully save to their respective domain tables and populate the Entities tab on the Project Overview dashboard. Implement a formal sign-off workflow that transitions document states upon approval.

## Proposed Changes

### `server/src/modules/project/ProjectOverviewController.ts`
- [MODIFY] Ensure the API endpoint that loads the Project Overview tab correctly queries the domain tables (e.g., stakeholders, risks, milestones) instead of raw files so that extracted entities show up immediately.

### `server/src/modules/approval/ApprovalWorkflowService.ts`
- [MODIFY] Refine the approval workflow service to transition document states (e.g., `draft` -> `published`) once the digital sign-off is executed.

## Verification Plan
- **Manual Verification (Entities)**: Navigate to the Project Overview tab and verify that `<H8>` entities extracted from recent documents populate the UI correctly.
- **Manual Verification (Sign-off)**: Initiate a document sign-off and verify that upon approval, the document state correctly transitions from `draft` to `published`.
