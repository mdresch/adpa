# Document Generation Resiliency

Date: 2026-06-15
Status: Approved

## Problem
The core document generation engine was vulnerable to volatility from LLM providers, edge-case infrastructure failures, and dynamic prompt leakage. Without hardened invariants, transient 429 rate limit errors would permanently deactivate primary providers, process restarts would orphan active generation jobs, and unresolved prompt variables could leak raw syntax into executive outputs.

## Success Criteria
- [x] Unresolved variables never reach the LLM API.
- [x] Orphan jobs automatically recover upon server restart.
- [x] Rate limit errors (429) do not trigger auto-deactivation of AI providers.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-001 | Orphan jobs MUST be reset to `pending` upon queue initialization. | P0 |
| REQ-002 | Generation jobs MUST explicitly bypass `REQUEUE_ENABLED` for forced timeouts. | P0 |
| REQ-003 | The AI API payload MUST NOT contain unresolved `{{VARIABLES}}` and MUST mitigate leaks by substituting with `[Not Provided]`. | P0 |
| REQ-004 | `429 Too Many Requests` MUST trigger exponential backoff instead of automatic provider deactivation. | P0 |

## Interaction Rules (Overlap)
This feature MUST NOT break:
- `adpa-doc-gen-queue` — The core job resumption flow and template paragraphs execution must remain unaffected.
- `adpa-rag-context-injection` — RAG operations running in the aiService must continue to work normally under exponential backoffs.

## Risks

| Risk | Mitigation |
|------|------------|
| Prompt scanner regex is too broad | Test thoroughly in Contract Guards to only match exact `{{VAR}}` format. |
| Backoff triggers on empty wallets | Explicitly separate `isRateLimit` from `isInsufficientFunds` in logic. |

## Test Plan

| REQ | Test file / describe block |
|-----|---------------------------|
| REQ-001 | `documentGenerationResiliency.test.ts` → "asserts orphan job recovery during initialization" |
| REQ-002 | `documentGenerationResiliency.test.ts` → "asserts explicit stuck job prioritization" |
| REQ-003 | `documentGenerationResiliency.test.ts` → "asserts zero unresolved templates in generated payload" |
| REQ-004 | `documentGenerationResiliency.test.ts` → "asserts 429 rate limits trigger backoff without deactivation" |
