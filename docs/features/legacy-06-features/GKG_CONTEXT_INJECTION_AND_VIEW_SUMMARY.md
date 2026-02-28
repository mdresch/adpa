# GKG Context Injection & Document View – Summary of Changes

This document summarizes the changes made to support **injected context visibility** and **context injection on the Generate Document flow**, plus related fixes.

---

## 1. Summary of Changes

### 1.1 Document view – “Show injected context”

- **Where:** `app/projects/[id]/documents/[docId]/view/page.tsx`
- **What:** In the **Source Documents** section, added a **“Show injected context”** button (Layers icon) that opens a dialog.
- **Dialog content:**
  - When context was stored: summary (semantic units count, source documents count, entity types) and the **markdown context text** that was sent to the LLM.
  - When not stored: short message that context was not recorded (e.g. pre-feature, no GKG, or path that doesn’t store it).
- **Data source:** Injected context is read from:
  - **Pipeline-generated docs:** `document.metadata.context_gathering.context_bundle.context_data.gkg_context`
  - **Sync-generated docs (Generate Document):** `document.generation_metadata.gkg_context_snapshot`

### 1.2 GKG context injection on Generate Document

- **Where:**  
  - `server/src/services/documentGenerationService.ts`  
  - `server/src/routes/documentGeneration.ts`
- **What:**
  - When the user clicks **Generate Document** and selects a **template that has GKG context strategy** (`gkg_context_strategy`), the service:
    1. Loads the template’s GKG strategy via `documentTemplateService.getTemplateGkgStrategy(templateId)`.
    2. Fetches semantic context via `getContextForStrategy(projectId, strategy, { userId })` (same GKG service as the pipeline).
    3. Injects that context into the LLM prompt as a dedicated section (before Output Requirements and User Request).
    4. Returns a `gkg_context_snapshot` (markdown, unitsCount, documentsCount, entityTypes) in the result.
  - The document-generation route persists `result.gkg_context_snapshot` into `generation_metadata` when present.
- **Resilience:** If GKG fetch fails (e.g. Neo4j down), generation continues without GKG context and a warning is logged.

### 1.3 Process Flow – model selection and toast

- **Where:**  
  - `server/src/services/processFlowService.ts` (getProviderModels)  
  - `app/process-flow/page.tsx`  
  - `app/process-flow/components/WorkflowTab.tsx`
- **What:**
  - **Backend:** `getProviderModels` normalizes `available_models` (string vs array, array of strings vs objects), always returns string `id`/`name` and adds `providerId` so the frontend Select and metadata are consistent.
  - **Frontend:** Replaced invalid `toast("...", { type, description })` calls with the notify API: `toast.success()`, `toast.error()`, `toast.info()` with optional `title`. Hardened model Select (string values, safe rendering), made `formatNumber` defensive, and wrapped model-selection effect in try/catch with user-facing toasts.

### 1.4 Backend: document ID decoding for project context documents

- **Where:** `server/src/routes/projects.ts`, `server/src/routes/jiraLinkage.ts`
- **What:** The backend decodes `documentId` with `decodeURIComponent` in:
  - **projects.ts**: GET document handler and GET document versions. Project context documents use IDs that may be URL-encoded when the frontend calls from routes like `/projects/:id/documents/:docId/view`.
  - **jiraLinkage.ts**: GET document Jira linkage handler, so the same encoded IDs resolve correctly when loading Jira linkage for a project context document.
- **Result:** Backend correctly recognizes and loads project context documents when the frontend passes encoded document IDs.

### 1.5 Documentation

- **Where:** `docs/07-architecture/GKG_CONTEXT_STRATEGY.md`
- **What:**
  - Added **§7 Storing and retrieving injected context** (where context is saved for pipeline vs sync, shape of `gkg_context`, retrieval, “how to generate with GKG and view it”).
  - Updated so that the **sync path (Generate Document)** is documented as injecting and storing GKG context in `generation_metadata.gkg_context_snapshot`.
  - Clarified that no database schema change was required (existing `metadata` / `generation_metadata` JSONB columns are used).
  - Documented that `documentId` is decoded with `decodeURIComponent` so URL-encoded IDs (e.g. project context documents) resolve correctly.

---

## 2. What This Enables – System Enhancements

These changes enable the following capabilities and improvements.

### 2.1 Transparency and traceability of AI context

- **Injected context visibility:** Users can see exactly what **semantic (GKG) context** was sent to the LLM for a given document, directly from the document view (Source Documents → “Show injected context”).
- **Unified behaviour:** The same “Show injected context” flow works for:
  - Documents created via **Process Flow / pipeline** (context from `metadata`).
  - Documents created via **Generate Document** (context from `generation_metadata.gkg_context_snapshot`).
- **Audit and compliance:** Stored snapshots support answering “what context was used for this output?” without re-running pipelines or GKG queries.

### 2.2 Richer generation from the main document-creation flow

- **Generate Document uses semantic context:** When a template has a **GKG context strategy** (profile, scope, entity types, limits), the **Generate Document** button now:
  - Fetches the same kind of semantic context as the pipeline (requirements, risks, stakeholders, etc. from the Governance Knowledge Graph).
  - Injects it into the prompt so the LLM can produce governance-aware, project-specific content.
- **Consistent strategy:** Template authors define GKG behaviour once; both “Create document” (Generate Document) and the pipeline respect it, so behaviour is consistent across entry points.

### 2.3 Better reliability and UX on Process Flow

- **Model selection:** Provider/model lists and selection are robust to:
  - Different shapes of `available_models` (string, array of strings, array of objects).
  - Strict string values for Select components and matching in effects.
- **User feedback:** Failed model load or model-selection errors show clear toasts (e.g. permission or configuration issues) instead of silent failures or unhandled exceptions.
- **Stable UI:** Defensive `formatNumber` and guarded effects avoid crashes when data is missing or malformed.

### 2.4 Single place to understand “injected context”

- **Documentation:** `GKG_CONTEXT_STRATEGY.md` now describes:
  - Where injected context is stored (pipeline vs sync).
  - How to generate documents that use GKG context (template setup + either Generate Document or pipeline).
  - How to view that context (Source Documents → “Show injected context”).
- **No extra storage:** All of this uses existing `documents.metadata` and `documents.generation_metadata`; no new tables or columns.

---

## 3. Quick reference

| Capability | Before | After |
|------------|--------|--------|
| See what GKG context was sent to the LLM | Not available | “Show injected context” on document view (pipeline + Generate Document) |
| GKG context when using Generate Document | Not used | Used when template has `gkg_context_strategy`; stored in `generation_metadata.gkg_context_snapshot` |
| Process Flow model selection | Could throw or misbehave (toast/model shape) | Normalized API + correct toast API + defensive UI |
| Documentation of context storage and retrieval | Scattered / implicit | Centralized in GKG_CONTEXT_STRATEGY.md §7 |
| Project context document IDs in API | Encoded IDs could fail to resolve | Backend decodes `documentId` in projects + Jira linkage routes |

---

## 4. Related files

- **Document view (button + dialog):** `app/projects/[id]/documents/[docId]/view/page.tsx`
- **Document ID decoding (project context):** `server/src/routes/projects.ts` (GET document, GET document versions), `server/src/routes/jiraLinkage.ts` (GET document Jira linkage)
- **Sync generation (injection + snapshot):** `server/src/services/documentGenerationService.ts`, `server/src/routes/documentGeneration.ts`
- **GKG fetch:** `server/src/services/gkg/gkgContextService.ts` (`getContextForStrategy`), `server/src/modules/documentTemplates/service.ts` (`getTemplateGkgStrategy`)
- **Process Flow:** `server/src/services/processFlowService.ts` (`getProviderModels`), `app/process-flow/page.tsx`, `app/process-flow/components/WorkflowTab.tsx`
- **Strategy and storage:** `docs/07-architecture/GKG_CONTEXT_STRATEGY.md`
