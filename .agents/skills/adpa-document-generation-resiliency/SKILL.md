---
name: adpa-document-generation-resiliency
description: Governance and Contract Guards for Pillar 1 Document Generation engine resiliency. Use when editing aiService rate limits, StuckJobMonitor requeue logic, QueueService initialization, or when generation variables ({{VAR}}) are modified.
---

# ADPA Document Generation Resiliency

## Purpose
This feature guarantees that the core AI generation engine can safely recover from infrastructure volatility, including transient process restarts, AI provider rate limits (429 errors), and unreplaced template variables.

## Invariants
- **Must always** reset `processing` generation jobs to `pending` on startup so that orphaned tasks seamlessly recover (REQ-001).
- **Must always** prioritize `ai-processing` and `document-*` jobs for forced requeues in `StuckJobMonitor`, bypassing the global `REQUEUE_ENABLED` setting if necessary (REQ-002).
- **Must always** scan prompt payloads immediately before sending to LLM providers to ensure zero unresolved `{{VARIABLES}}` are leaked. Any raw tags found must be replaced with `[Not Provided]` (REQ-003).
- **Must always** treat HTTP 429 errors as temporary rate limits, invoking exponential backoff, rather than automatically disabling the AI provider in the database (REQ-004).

## Interaction Rules
- Depends on: `adpa-doc-gen-queue` (queue structure) and `adpa-governed-feature-loop` (guard rails).
- Must not break the foundational Queue structure and AIGenerationJobService. 

## Key Files
| File | Role |
|------|------|
| `server/src/services/aiService.ts` | 429 backoff handling and prompt leak mitigation. |
| `server/src/services/queueService.ts` | Orphan job recovery upon module initialization. |
| `server/src/services/stuckJobMonitor.ts` | Bypass constraints to explicitly prioritize stuck generation jobs. |
| `server/src/__tests__/modules/document-generation-resiliency/documentGenerationResiliency.test.ts` | The Advanced Jest Contract Guards that enforce these rules. |

## Commands
```powershell
cd server
npm run test:features -- document-generation-resiliency   # run this packet only
npm run test:features                                     # run all governed packets (CI)
npm run verify:governed-features
```

## Related Skills
- `adpa-doc-gen-queue`
- `adpa-rag-context-injection`
- `adpa-governed-feature-loop`
