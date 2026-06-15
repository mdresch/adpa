# Inline H8 Extraction & Storage Guards

Date: 2026-06-14
Status: Approved

## Problem
The inline entity extraction pipeline is the lifeblood of the ADPA framework's context injection. If the logic that parses `<H8>` tags from LLM outputs or the logic that saves those entities to the dual-store (PostgreSQL + RAG) is accidentally broken or bypassed by a developer, the downstream document generation will silently starve of semantic context. We need mathematically guaranteed Contract Guards to explicitly warn developers if they break this chain.

## Scope Boundary
- **IN SCOPE:** `InlineEntityParserService` logic, `<H8>` regex/parsing, and the handoff to the dual-store persistence layer.
- **OUT OF SCOPE:** Semantic extraction queues, background entity processing, or drift detection entity analysis.

## Success Criteria
- [x] Application of instructional Contract Guards that fail with specific guidance if the parser is broken.
- [x] Application of instructional Contract Guards that fail if the dual-store dispatch (SQL + Vector) is decoupled.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-001 | Resilient Inline Parsing: The parser MUST extract the text value and `type` attribute from `<H8>` tags, handling edge cases. | P0 |
| REQ-002 | Dual-Store Handoff: Parsed entities MUST be dispatched to both PostgreSQL and the RAG service. | P0 |
| REQ-003 | Entity Type Strictness: Unknown types extracted from `<H8>` tags must be handled gracefully without crashing the parser. | P1 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- `rag-context-injection` — This extraction pipeline feeds the RAG store. If this breaks, RAG injection has no data.

## Risks

| Risk | Mitigation |
|------|------------|
| Developer modifies regex and breaks parsing | Contract Guard strictly asserts parsing accuracy against complex string edge cases. |
| Developer disables RAG sync for performance | Contract Guard intercepts the persistence layer and asserts dual dispatch. |

## Test Plan (Contract Guards)

| REQ | Test file / describe block |
|-----|---------------------------|
| REQ-001 | `inlineExtraction.test.ts` → "MUST correctly parse well-formed and messy <H8> tags" |
| REQ-002 | `inlineExtraction.test.ts` → "MUST dispatch extracted entities to BOTH Postgres and Vector Store" |
| REQ-003 | `inlineExtraction.test.ts` → "MUST gracefully drop or map invalid <H8> entity types" |