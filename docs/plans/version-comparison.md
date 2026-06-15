# Implementation Plan: Version Comparison

## Goal Description
Implement a robust Version Comparison system that allows users to view a side-by-side diff between any two versions of a generated document. The system must highlight additions, deletions, and modifications with high accuracy. Additionally, it must provide a mechanism to instantly rollback to a previous version and present a summary of statistical changes (words added, quality score drift).

## Proposed Changes

### `server/src/modules/documents/VersionControlService.ts`
- [NEW] Create a versioning service that saves immutable snapshots of documents whenever significant edits or regenerations occur.
- [NEW] Implement a `DiffEngine` using an AST-aware or string-based diff algorithm (e.g., `diff` package) to calculate `sections_added`, `sections_removed`, and `sections_modified`.
- [NEW] Add an endpoint to trigger a rollback, which clones the historical snapshot and appends it as the new latest version.

### `app/documents/[id]/compare/page.tsx`
- [NEW] Create the frontend UI for side-by-side comparison.
- [NEW] Implement visual diff highlighting (green for `added`, red with strikethrough for `removed`, and yellow highlights for inline modifications).
- [NEW] Build the "Statistics Dashboard" showing the word count delta, cost difference, and estimated quality score change.

### `server/src/modules/intelligence/QualityEvaluator.ts`
- [MODIFY] Integrate the quality evaluator to score historical versions if they don't already possess a cached quality metric to enable the "Quality Change" statistical comparison.

## Verification Plan

### Automated Tests
- Unit test: `DiffEngine` to verify it accurately identifies line-level changes and calculates correct line numbers.
- Integration test: Verify the rollback API correctly points the document HEAD to the target version without mutating the historical audit trail.

### Manual Verification
- Generate a document (Version 1).
- Ask the AI Chat Interface to "Make the executive summary more concise" (creates Version 2).
- Navigate to the Version Comparison tab.
- Verify the side-by-side diff correctly highlights the truncated text in red and the new text in green.
- Verify the statistical dashboard accurately shows a negative word count delta.
- Click "Rollback to Version 1" and verify the active document is restored.
