---
name: adpa-knowledge-graph-pillar3
description: Core ingestion pipeline and dual-store transactional atomicity for extracted entities. Use when working on H8 tag extraction or Neo4j/PostgreSQL entity syncs.
---

# ADPA Knowledge Graph Pillar 3

## Purpose
Pillar 3 controls the pipeline that ingests, parses, normalizes, and links extracted entities within the Global Knowledge Graph. It ensures unstructured LLM outputs are securely transformed into structured relationships.

## Invariants
- Must always: Extract `########` JSON blocks regardless of surrounding hallucinations or malformed markdown.
- Must always: Execute Dual-Store Transactional Atomicity. If a PostgreSQL write fails, Neo4j must rollback. If Neo4j fails, PostgreSQL must rollback.
- Must never: Include graph visualization or manual ontology definition within this module boundary.

## Interaction Rules
- Depends on: None. This is a foundational data extraction capability.
- Must not break: Baseline project persistence when saving parsed milestones/risks.

## Key Files
| File | Role |
|------|------|
| `server/src/modules/knowledge-graph/InlineH8Parser.ts` | Regex/JSON extraction logic |
| `server/src/modules/knowledge-graph/DualStoreTransactionManager.ts` | 2PC rollback orchestrator |
| `server/src/__tests__/modules/knowledge-graph/pillar3-invariants.test.ts` | Contract Guards |

## Commands
```powershell
cd server
npm run test:features -- knowledge-graph
```
