---
name: adpa-draco-escalation
description: Guidelines for utilizing the DRACO Escalation Matrix and handling Review Board deadlocks in Advisory mode.
---

# DRACO Escalation Matrix Skill

This skill outlines the procedures for AI Agents (like Atlassian Rovo and Google Gemini) when encountering "high-convergence false positives" during DRACO's mandatory AI Review Board execution gates.

## When to Use
- **Trigger**: When DRACO suspends execution due to a blocked high-risk document action, but the context implies high ambiguity, conflicting policy interpretation, or known LLM blind spots.
- **Goal**: Safely degrade the block from a hard Error into a logged `ADVISORY_APPROVED` warning, avoiding manual human override bottlenecks for safe but ambiguous architecture patterns.

## Concept: The Escalation Matrix
Traditional DRACO execution (Pillar 4) enforces strict execution suspension if `executeHighRiskDocument` is called without a valid `OverridePayload`. However, when multiple agents converge on a false-positive due to shared model biases, the pipeline becomes permanently deadlocked.

The Escalation Matrix allows the `DRACOEngine` to inspect the `evaluationMetadata`. If the evaluated `confidenceScore` is under 0.75 or the `ambiguityFlag` is manually raised by the system, DRACO will:
1. Instantly log an immutable `_ADVISORY_ESCALATION` event via the `AuditLogger` attributed to `SYSTEM_ESCALATION`.
2. Return a successful `{ status: 'ADVISORY_APPROVED', warning: '...' }` object instead of throwing an Error.

## Execution Procedure

### 1. Identifying Ambiguity
Before calling `executeHighRiskDocument`, calculate the confidence interval of your governance evaluation. If your context indicates a novel implementation pattern (e.g., custom Vector RAG fallback, new framework routing) that DRACO might falsely flag as a security risk, prepare the `evaluationMetadata`.

### 2. Payload Injection
Inject the metadata into your `DocumentAction` payload:
```typescript
const result = await DRACOEngine.executeHighRiskDocument({
  documentId: 'DOC-123',
  action: 'PROPOSE_NOVEL_ARCHITECTURE',
  evaluationMetadata: {
    confidenceScore: 0.60, // Fall below 0.75
    ambiguityFlag: true    // Explicitly flag as ambiguous
  }
});
```

### 3. Handling the Response
The engine will not throw an error. You must catch the `ADVISORY_APPROVED` status and pass the generated warning up the stack to the human developer for post-execution review:
```typescript
if (result.status === 'ADVISORY_APPROVED') {
    console.warn('DRACO Warning:', result.warning);
    // Proceed with workflow...
}
```

## Governance Constraints
Agents MUST NOT blindly inject `confidenceScore: 0` into every payload just to bypass DRACO. This mechanism is exclusively for verified ambiguous contexts. All advisory overrides are permanently recorded in the immutable audit ledger. Abuse of this fallback will trigger a Pillar 4 manual audit review.
