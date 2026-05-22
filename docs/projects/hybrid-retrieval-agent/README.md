# Hybrid Retrieval Agent (parked initiative)

**Status:** Parked — design captured, implementation not started  
**Last updated:** 2026-05-21  
**Owner:** TBD  
**Repo placement:** Documentation only in ADPA for now; code may live in ADPA (`server/`) or a separate service/repo when kicked off.

---

## One-line summary

Build a **Hybrid Retrieval Agent** that orchestrates three context sources—Knowledge Graph (structured), vector store (unstructured), and session memory—then synthesizes them into one LLM prompt with citations.

---

## Relationship to ADPA today

| Piece | ADPA today | This initiative |
| --- | --- | --- |
| Neo4j | Optional startup dep; graph jobs in `server` | Sprint 1: reliable `query → cypher → structured_json` service |
| Pinecone / vectors | Optional startup dep; RAG paths exist (see archived `RAG_INTEGRATION_*` in `docs/roadmap/archive/`) | Sprint 1: reliable `query → top_k chunks` service |
| Chat / OpenUI | `/openui-chat`, `server/src/modules/openuiChat` | Sprint 3: optional Open WebUI or ADPA frontend wiring |
| Document context UX | `docs/03-development/INTERPRETING_CONTEXT_SOURCES.md` | Extends with graph + vector attribution |

Do **not** treat this as active ADPA roadmap work until promoted from **Parked** (see `docs/roadmap/README.md` for in-flight priorities).

---

## The three retrieval lanes

| # | Type | Source | Purpose | LLM receives |
| --- | --- | --- | --- | --- |
| 1 | Structured | Knowledge Graph (Neo4j) | Facts, relationships, entities | Verifiable facts (e.g. Person A worked with B at C) |
| 2 | Unstructured | Vector DB (Pinecone, Chroma, etc.) | Policies, paragraphs, nuance | Background + explanation from chunks |
| 3 | Conversational | Chat history / memory | Session continuity | Prior turns and references |

**Orchestration rule:** For each user query, run applicable retrievals **in parallel**, merge into one context block, then call the LLM.

Example synthesis template:

```text
Based on the following Facts: [KG JSON]
and Context: [RAG chunks with source ids]
and prior conversation: [summary or recent turns]
answer the user's question. Cite fact ids and chunk sources.
```

---

## Phased execution (three sprints)

### Sprint 1 — Data structuring and storage (foundation)

**Goal:** KG and vector paths work **independently**.

1. **Knowledge Graph**
   - Schema + clean ingest (e.g. CSV → Cypher).
   - **Deliverable:** `query_string` → `cypher_query` → execute → `structured_json`.

2. **Vector store**
   - Chunk PDFs/reports; embed (OpenAI/Cohere/etc. via LangChain or LlamaIndex loaders).
   - **Deliverable:** `query_string` → `top_k` chunks + source metadata.

### Sprint 2 — Orchestrator (core brain)

**Goal:** Universal router + concurrent retrieval + context synthesis.

1. Universal router accepts user query.
2. Query decomposition → `query_knowledge_graph(query)` and `query_vector_db(query)` (and memory when needed).
3. **Concurrent** `Promise.all` (or equivalent) for KG + RAG.
4. Format unified prompt block; test edge cases:
   - Fact-heavy: “What year did X happen?” → KG-weighted.
   - Narrative: “Tell me more about…” → RAG-weighted.

### Sprint 3 — API and UI

**Goal:** Single backend surface + streaming UX.

1. Wrap orchestrator in one API (e.g. FastAPI or Express module).
2. Connect Open WebUI and/or ADPA chat to that endpoint.
3. **Token management:** summarize retrieved context before LLM call.
4. **Streaming** end-to-end.

---

## Advanced considerations (enterprise polish)

1. **Cross-source synthesis (HyQA)** — Detect questions that need both policy (doc A) and entity state (doc B / graph); label source boundaries in the prompt.
2. **Citation and attribution** — Every claim tied to graph node/edge id or chunk `source_id`.
3. **Graph-first modeling** — Prefer KG for relationship-heavy domains (org structure, literature, policy dependencies); use vectors for prose.

---

## Open decisions (fill when un-parking)

- [ ] **Code location:** ADPA monorepo module vs standalone `hybrid-retrieval` service
- [ ] **Vector provider:** Pinecone integrated index vs existing ADPA Pinecone wiring
- [ ] **KG query path:** LLM-generated Cypher vs template library vs hybrid
- [ ] **Frontend:** Open WebUI only vs `/openui-chat` integration vs new route
- [ ] **Promotion:** Link from `docs/roadmap/future-enhancements/` and optional change request

---

## Related ADPA docs

- `docs/03-development/INTERPRETING_CONTEXT_SOURCES.md` — current document-generation context model
- `docs/roadmap/archive/2025/RAG_INTEGRATION_PLAN_COMPLETED.md` — prior RAG work (historical)
- `AGENTS.md` — Neo4j / Pinecone listed as optional startup dependencies

---

## Source note

Concept and sprint breakdown confirmed in product discussion (2026-05-21); parked here until a named owner and repo boundary are chosen.
