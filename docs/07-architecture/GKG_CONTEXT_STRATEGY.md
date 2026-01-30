# GKG Context Strategy (Templates)

**Purpose**: When a document is submitted for generation, the template can specify **which type of semantic search** to run against the Governance Knowledge Graph (GKG) so the best content is gathered as LLM context.

---

## 1. Template field: `gkg_context_strategy`

Stored on **templates** as JSONB (`gkg_context_strategy`). When present, document generation (or the context-injection pipeline) should:

1. Read `template.gkg_context_strategy`.
2. Resolve the **profile** and/or **entityTypes**, **scope**, **maxDocuments**, **maxUnits**.
3. Query Neo4j (or call a GKG context API) to fetch semantic units matching that strategy.
4. Inject the result into the LLM context for generation.

---

## 2. Strategy shape

| Field | Type | Description |
|-------|------|-------------|
| `profile` | `GkgContextProfile` | Preset name; can imply default entityTypes/scope. |
| `entityTypes` | `string[]` | Entity types to include (e.g. `Requirement`, `Risk`, `Stakeholder`). Used when profile is `custom` or to override profile. |
| `scope` | `GkgContextScope` | Where to pull context from in the GKG. |
| `maxDocuments` | `number` | Max number of source documents to pull units from (by unit count). |
| `maxUnits` | `number` | Max total semantic units to include in context. |
| `traceableOnly` | `boolean` | If true, only include units that have EXTRACTED_FROM (traceable to a document). |
| `documentStatusFilter` | `GkgDocumentStatusFilter` | Restrict to documents with status Approved/Published only, or include Draft and In Review. See below. |

---

### Document status filter (`GkgDocumentStatusFilter`)

| Value | Behaviour |
|-------|-----------|
| `approved_published_only` | Only include semantic units extracted from documents whose status is `approved` or `published`. |
| `include_draft_review` | Include units from documents in any status (draft, review, approved, published). |

---

## 3. Preset profiles (`GkgContextProfile`)

| Profile | Typical entity types | Use case |
|---------|----------------------|----------|
| `governance_full` | Requirement, Risk, Stakeholder, Milestone, Constraint, Deliverable | Full governance / PMBOK-style docs. |
| `charter_light` | Requirement, Risk, Stakeholder | Charters, light governance. |
| `requirements_only` | Requirement | Requirements docs, SRS. |
| `risks_only` | Risk | Risk register, risk report. |
| `stakeholders_only` | Stakeholder | Stakeholder register, communication plan. |
| `custom` | From `entityTypes` | Template author specifies list. |

---

## 4. Scope (`GkgContextScope`)

| Scope | Behaviour |
|-------|-----------|
| `same_project` | Only entities from the target project. |
| `same_project_top_docs` | Same project; prioritize documents with most semantic units (best sources first). |
| `dependent_projects` | Same project + projects linked via `project_dependencies` (DEPENDS_ON in GKG). |
| `all_accessible` | All projects the user can access (e.g. company scope). |

---

## 5. Example values

**Charter template (governance light, same project, top 5 docs):**
```json
{
  "profile": "charter_light",
  "scope": "same_project_top_docs",
  "maxDocuments": 5,
  "maxUnits": 500,
  "traceableOnly": true
}
```

**Risk report (risks only, same project):**
```json
{
  "profile": "risks_only",
  "scope": "same_project",
  "maxUnits": 200
}
```

**Custom entity set:**
```json
{
  "profile": "custom",
  "entityTypes": ["Requirement", "Milestone", "Deliverable"],
  "scope": "same_project_top_docs",
  "maxDocuments": 10,
  "maxUnits": 1000
}
```

---

## 6. Usage in document generation

1. **Load template** (including `gkg_context_strategy`).
2. **If `gkg_context_strategy` is set**:
   - Resolve profile defaults (entity types, scope) when profile is not `custom`.
   - Call GKG context service (or Neo4j queries) with: projectId (from generation request), entityTypes, scope, maxDocuments, maxUnits, traceableOnly, documentStatusFilter.
   - Build context string from returned semantic units (e.g. summary + payload snippets).
   - Pass context into the LLM prompt (e.g. via context injection stage or document generator).
3. **If not set**: Use existing context behaviour (no GKG-based semantic search).

---

## 7. Storing and retrieving injected context

When a document is generated **via the pipeline** or **via the Generate Document button** (sync path), the injected GKG context is persisted with the document so it can be shown later (e.g. “Show injected context” in the document view).

### Where it is saved

| Generation path | Stored in | Path for GKG context |
|-----------------|-----------|----------------------|
| **Pipeline** (multi-stage processor, e.g. pipeline worker) | `documents.metadata` (JSONB) | `metadata.context_gathering.context_bundle.context_data.gkg_context` |
| **Sync** (Generate Document button, POST `/document-generation/generate`) | `documents.generation_metadata` (JSONB) | `generation_metadata.gkg_context_snapshot` |

- **Pipeline**: The pipeline worker writes the full pipeline result (including the context_gathering stage’s `output_data`) into the document’s **`metadata`** column. That includes `context_bundle.context_data`, and `context_data` contains `gkg_context` from the enhanced context gathering stage.
- **Sync (Generate Document)**: When the template has `gkg_context_strategy`, `documentGenerationService` fetches GKG context via `getContextForStrategy`, injects it into the LLM prompt, and the route saves it in **`generation_metadata.gkg_context_snapshot`**. “Show injected context” reads this path.

### Shape of `gkg_context` (for retrieval)

```ts
{
  markdown: string      // Context text sent to the LLM
  unitsCount: number
  documentsCount: number
  entityTypes: string[] // e.g. ["Requirement", "Risk", "Stakeholder"]
}
```

### Retrieval

- **API**: `GET /projects/:projectId/documents/:documentId` returns the document with `metadata` and `generation_metadata` parsed. For pipeline-generated documents, GKG context is at `document.metadata.context_gathering.context_bundle.context_data.gkg_context`. For sync-generated documents it is at `document.generation_metadata.gkg_context_snapshot`. The backend decodes `documentId` with `decodeURIComponent` in the projects and Jira linkage routes, so URL-encoded IDs (e.g. for project context documents from routes like `/projects/.../documents/.../view`) are resolved correctly.
- **UI**: Document view → Source Documents → “Show injected context” reads both paths and shows summary + markdown in a dialog.

### How to generate a document with GKG context and view it

1. **Template**: Use a template that has **GKG context strategy** set (Templates → edit template → GKG settings, e.g. profile `charter_light`, scope `same_project_top_docs`).
2. **Generate**: Either use the **Generate Document** button on the project (Create document flow) or **Process Flow → Visual Pipeline**; both paths now inject and store GKG context when the template has a GKG strategy.
3. **View injected context**: Open the document → **Source Documents** → **Show injected context** to see the GKG context that was sent to the LLM.

---

## 8. Related

- **GKG schema**: [GKG_SCHEMA.md](./GKG_SCHEMA.md)
- **GKG ingestion**: [GKG_INGESTION_DESIGN.md](./GKG_INGESTION_DESIGN.md)
- **GKG summary / context widgets**: [NEO4J_GKG_STATUS.md](./NEO4J_GKG_STATUS.md) and `/ai-analytics/gkg` (best source documents, entity types).
- **Templates**: `server/src/modules/documentTemplates`, `templates` table.
- **Pipeline worker** (persists context): `server/src/workers/pipelineWorker.ts` — builds `pipelineMetadata.context_gathering` from context_gathering stage and inserts into `documents.metadata`.
