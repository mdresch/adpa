# GenUI Step 3 — Published presentation snapshots (design reserve)

**Status:** Design reserve — not implemented (no API, no DB table, no blob upload).  
**Related:** Document GenUI workspace Step 2 (`/projects/{id}/documents/genui?docId=…`), `.agents/skills/adpa-genui-workspace/SKILL.md`.

## Problem

1. **Markdown** in `documents.content` is the canonical, living document (including future autonomous template refresh and versioned collaboration).
2. **Step 2** produces beautiful **OpenUI Lang** interactive reports — valuable for presentation but **not reproducible** from markdown alone (LLM, planner, and component catalog drift).
3. Stakeholders need a **fixed** report for a point in time while the source document may keep changing.

Step 3 is **Publish**: save an immutable **presentation snapshot** and **artifacts** without making OpenUI Lang or PDF the source of truth for the document.

## Separation of concerns

| Layer | Storage | Role |
| --- | --- | --- |
| Document truth | Postgres `documents.content` (markdown) | Search, extraction, quality, autonomous updates |
| Step 1 | — | Read verified source |
| Step 2 | In-memory session | Explore, render, refine OpenUI report |
| **Step 3 (future)** | Postgres row + **blob container** | Named snapshot + PDF/DOCX/HTML/Lang replay files |

**Never** write OpenUI Lang into `documents.content`.  
**Never** treat blob artifacts as editable source — they are derivatives of a snapshot.

## When Step 3 becomes necessary

As markdown versioning runs autonomously (template optimization, change triggers), the contrast is obvious:

- **Living document** = latest markdown in DB.
- **Published report** = what we showed on date X (audit, board, external share).

Step 2 client export (print / download) is sufficient for ad-hoc use. Step 3 is required when the organization needs **reproducible, named, stored** presentations.

## Snapshot model

### `document_presentations` (future table — name TBD)

Thin metadata in Postgres; bytes in blob storage.

| Field | Purpose |
| --- | --- |
| `id` | UUID |
| `project_id`, `document_id` | Tenant scope |
| `document_version` | `documents.version` at publish time |
| `source_content_fingerprint` | Hash of `documents.content` at publish (staleness detection) |
| `title` / `label` | User-facing name (“Q2 steering deck”) |
| `render_recipe` | JSON — prompt, layout mode, spec version (audit / approximate replay) |
| `status` | `draft` \| `published` \| `stale` (source changed) |
| `created_by`, `created_at` | Audit |
| `artifacts` | JSON array of `{ kind, blob_path, mime_type, byte_size }` |

### Artifact kinds (blob container)

Align with `GenuiPresentationArtifactKind` in `lib/genui/presentationSnapshot.ts`:

| Kind | Typical use |
| --- | --- |
| `pdf` | Final deliverable (server: `unifiedPdfService.generateFromHtml`) |
| `docx` | Word deliverable |
| `html` | Standalone HTML |
| `html_snapshot` | Frozen DOM for stable server PDF |
| `openui_lang` | Replay interactive report in GenUI (derivative, not document truth) |
| `plain_text` | Accessibility / search within snapshot |

**Blob layout (proposed):**

```txt
presentations/{projectId}/{documentId}/{presentationId}/{kind}.{ext}
```

Use existing ADPA blob/storage patterns when implementing (Azure, S3, or local dev container).

## Blob storage requirements (implementation checklist)

Use this when implementing Step 3 publish — ADPA does not yet have a dedicated presentation blob adapter; align with whichever object store the platform standardizes on (Azure Blob, S3-compatible, or local dev).

### Functional

| # | Requirement |
| --- | --- |
| B1 | **Upload** one or more artifacts per publish (`pdf`, `docx`, `html`, `html_snapshot`, `openui_lang`, `plain_text`). |
| B2 | **Path convention** — `presentations/{projectId}/{documentId}/{presentationId}/{kind}.{ext}` (`buildPresentationBlobPath()`). |
| B3 | **Content types** — correct `Content-Type` per kind (`application/pdf`, `text/html`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`, etc.). |
| B4 | **Download** — signed URL or authenticated stream; tenant scope via `project_id` + `document_id`. |
| B5 | **Delete** — when a presentation row is deleted, remove all blobs under that `presentationId` prefix (or soft-delete + lifecycle policy). |
| B6 | **Idempotent publish** — re-publish same label creates new `presentationId` (new prefix); optional overwrite only if product explicitly supports “replace snapshot”. |

### Non-functional

| # | Requirement |
| --- | --- |
| B7 | **Max size** — define per-artifact limit (e.g. PDF ≤ 25 MB, `html_snapshot` ≤ 5 MB); reject with 413 + clear error. |
| B8 | **Encryption** — at-rest encryption per cloud account defaults; no public containers. |
| B9 | **Access** — private blobs only; no anonymous read; URLs time-limited (e.g. 15–60 min) if using SAS/presign. |
| B10 | **Retention** — optional TTL / archival policy TBD; not required for v1. |
| B11 | **Dev/local** — env-driven container name + connection string (mirror `server/.env` patterns); document in `server/.env.example`. |

### Metadata (Postgres `artifacts` JSON)

Each entry:

```json
{
  "kind": "pdf",
  "blob_path": "presentations/{projectId}/{documentId}/{presentationId}/pdf.pdf",
  "mime_type": "application/pdf",
  "byte_size": 123456
}
```

Server computes `byte_size` after upload; never trust client-reported sizes for billing/audit.

### Publish pipeline (server)

1. Authenticate + `checkProjectAccess` on `document_id`.
2. Verify `source_content_fingerprint` and `document_version` against `documents` row.
3. Build **export-ready HTML** using the same rules as Step 2 client export (`prepareGenuiReportExportHtml` semantics): all table rows, no pagination chrome, absolute image URLs.
4. Generate artifacts:
   - `html_snapshot` — cleaned HTML (required for reproducible PDF).
   - `pdf` — `unifiedPdfService.generateFromHtml(html_snapshot, …)`.
   - `docx` — v1: HTML-as-doc or dedicated converter (TBD).
   - `openui_lang` — optional, from client draft payload.
5. Upload blobs in parallel; insert `document_presentations` row only after all required uploads succeed (or mark `status: draft` until complete).
6. Return presentation id + download links.

### Environment variables (proposed — add to `server/.env.example` when implementing)

| Variable | Purpose |
| --- | --- |
| `GENUI_PRESENTATIONS_CONTAINER` | Blob container / bucket name |
| `GENUI_PRESENTATIONS_STORAGE_CONNECTION` | Connection string or key (or reuse global `AZURE_STORAGE_*` if shared) |
| `GENUI_PRESENTATIONS_SIGNED_URL_TTL_SECONDS` | Download link lifetime (default 3600) |

### Out of scope for blob v1

- Storing blobs in Postgres (`bytea`).
- Writing presentation artifacts into `documents.content`.
- Using Morphic `morphic_uploads` Supabase bucket (different product surface).

### Related code today

| Piece | Role |
| --- | --- |
| `lib/genui/reportExport.ts` | Client export; `prepareGenuiReportExportHtml()` = reference for server snapshot HTML |
| `lib/genui/presentationSnapshot.ts` | Draft builder + `buildPresentationBlobPath()` |
| `server/src/services/pdfService.ts` | `generateFromHtml` for server PDF |
| `app/api/upload/route.ts` | Supabase upload pattern (not presentations) |
| `server/src/integrations/confluence.ts` | Document publish (markdown today) |
| `server/src/services/jiraLinkageService.ts` | Jira issue linkage |
| `server/src/services/sharepointService.ts` | File upload to SharePoint drive |
| `server/src/services/storageArchivalService.ts` | SharePoint + ProjectWise orchestration |
| `app/projects/[id]/documents/view/page.tsx` | **Publish to Confluence / Jira** (markdown document) |

## Direct publish to integrations (Step 3 — in scope)

Enterprise publishing stays **inside Step 3**, not a separate product surface. Flow:

1. User finishes Step 2 report → **Publish** (snapshot).
2. Server creates blobs (`pdf`, `html_snapshot`, …).
3. **Optionally** pushes selected platforms in the **same job** (or `POST …/presentations/:id/integrations` to retry).
4. Results stored on the presentation row as `external_publish[]` (and mirrored on `documents.metadata` / `confluence_page_url` where applicable).

**Important:** Document View today publishes **living markdown** to Confluence and creates a **Jira issue** with a text description. Step 3 publishes the **frozen GenUI presentation** (PDF/HTML), while still linking back to `document_id` and `presentation_id`.

### Supported platforms (v1 target)

| Platform | Project setting | Default artifact | Existing ADPA module |
| --- | --- | --- | --- |
| **Confluence** | `confluence_enabled`, space/parent overrides | `html_snapshot` or `pdf` | `ConfluenceIntegration`, `POST /api/integrations/confluence/:id/export` |
| **Jira** | `jira_enabled`, project key / issue type | `pdf` (attach or link in description) | `JiraLinkageService`, `POST /api/jira-linkage/create-issue` |
| **SharePoint** | `sharepoint_auto_archive` or explicit publish | `pdf` or `docx` | `sharepointService.uploadDocument`, `StorageArchivalService` |
| **ProjectWise** | `projectwise_auto_archive` | `pdf` or `docx` | `projectWiseService.uploadDocument` |

Types: `GenuiPresentationIntegrationPlatform`, `PublishPresentationIntegrationsRequest` in `lib/genui/presentationSnapshot.ts`. Adapter map: `GENUI_PRESENTATION_INTEGRATION_ADAPTERS`.

### Integration requirements

| # | Requirement |
| --- | --- |
| I1 | Publish only after snapshot artifacts exist (or atomically: blobs first, then integrations). |
| I2 | Respect **project_integrations** toggles — skip disabled platforms with `status: skipped`, not hard error. |
| I3 | **Confluence** — support update when `documents.confluence_page_url` exists (`confluenceUpdateExisting`); store returned URL on document + presentation ref. |
| I4 | **Jira** — create or link issue; include ADPA deep link to GenUI presentation + document view; optional PDF attachment when API allows. |
| I5 | **SharePoint / ProjectWise** — upload binary from blob path; store `webUrl` on `external_publish` and `documents.metadata.archival`. |
| I6 | **Idempotency** — `POST …/presentations/:id/integrations` retries failed platforms without re-uploading blobs. |
| I7 | **Audit** — each ref records `platform`, `status`, `artifactKind`, `url`, `error`, `publishedAt`. |
| I8 | Do **not** replace `documents.content` with Confluence HTML or presentation HTML. |

### Confluence modes (Step 3 extension)

| Mode | Input | Use when |
| --- | --- | --- |
| `markdown_source` | `documents.content` | Parity with today’s document view (living doc sync) |
| `html_snapshot` | Prepared GenUI HTML | Stakeholder-facing page matches Step 2 report |
| `attachment_pdf` | Snapshot `pdf` blob | PDF in Confluence attachments (TBD API) |

Default for GenUI **Publish**: `html_snapshot` or `pdf`, not markdown alone.

### API extensions (Step 3)

| Method | Path | Body |
| --- | --- | --- |
| `POST` | `/api/v1/documents/:documentId/presentations` | `CreateGenuiPresentationRequest` including optional `publishIntegrations` |
| `POST` | `/api/v1/documents/:documentId/presentations/:presentationId/integrations` | `{ platforms: [...] }` — retry / add platforms |

### UI (GenUI workspace Step 3)

When `NEXT_PUBLIC_GENUI_STEP3_PUBLISH=true`:

- **Publish presentation** dialog: label, artifact checkboxes (PDF, HTML snapshot, Lang).
- **Also publish to** (multi-select): Confluence, Jira, SharePoint, ProjectWise — enabled only if project integration settings allow.
- After success: list snapshots with download links + external links (View in Confluence, Open in Jira).

Document View can later call the same `POST …/presentations` with `publishIntegrations` for markdown-only snapshots, or keep separate buttons until unified.

### Reproducibility strategy

On **Publish**, capture **one or more** of:

1. **Artifacts** (PDF + optional HTML snapshot) — **pixel-faithful** for external audience.
2. **OpenUI Lang** — **interactive replay** in-app (cache; invalidate when renderer catalog changes).
3. **Render recipe** — audit trail and best-effort regeneration (not guaranteed identical).

Recommended default on publish: **html_snapshot + pdf + optional openui_lang**.

## API sketch (future — not implemented)

Reserved paths (see `getGenuiPresentationApiPaths` in `lib/genui/presentationSnapshot.ts`):

| Method | Path | Body |
| --- | --- | --- |
| `POST` | `/api/v1/documents/:documentId/presentations` | `CreateGenuiPresentationRequest` |
| `GET` | `/api/v1/documents/:documentId/presentations` | List snapshots |
| `GET` | `/api/v1/documents/:documentId/presentations/:presentationId` | Metadata + signed blob URLs |

Client draft builder today: `buildPresentationSnapshotDraft()` — same shape as future POST body prep.

## UI sketch (future)

| Step | User-facing |
| --- | --- |
| 1 | Source document (unchanged) |
| 2 | Component report + export bar (current) |
| **3** | **Published presentations** — list snapshots, download PDF, “Open in GenUI”, **Publish to Confluence / Jira / SharePoint** |

Until Step 3 ships, Step 2 **Export report** bar remains the delivery path. Optional env `NEXT_PUBLIC_GENUI_STEP3_PUBLISH=true` will gate **Publish presentation** and integration targets when implemented.

## Distinction from existing document export

| Path | Input | Output |
| --- | --- | --- |
| `GET /api/v1/documents/:id/export/pdf` | **Markdown** `documents.content` | PDF (governance template) |
| Step 2 client export | **Rendered GenUI DOM** | PDF / HTML / .doc |
| **Step 3 (future)** | GenUI session at publish time | Stored snapshot + blobs |
| **Step 3 + Confluence** | `html_snapshot` or `pdf` from snapshot | Confluence page (not markdown-only) |
| Document view → Confluence (today) | `documents.content` markdown | Living doc sync |

All paths are valid; they serve different audiences.

## Implementation phases

| Phase | Deliverable |
| --- | --- |
| **Now (reserve)** | Spec (this file), `lib/genui/presentationSnapshot.ts`, docs/skill updates, client draft types |
| **2a** | Server `POST` publish: HTML snapshot → PDF to blob; DB row |
| **2b** | Step 3 UI: list/download presentations |
| **2c** | Staleness when `source_content_fingerprint` ≠ current content |
| **2d** | **Integration publish** — Confluence / Jira / SharePoint / ProjectWise from snapshot blobs |
| **3** | Policy hooks (auto-publish on milestone), integration with autonomous markdown pipeline |

## Invariants for implementers

1. `documents.content` stays markdown-only canonical.
2. Presentation rows reference `document_id` + version/fingerprint; do not fork document rows.
3. GenUI workspace `POST /api/chat` and `openui_chat_threads` remain separate products unless explicitly unified.
4. Step 2 exploratory sessions stay ephemeral until user (or policy) calls **Publish**.

## Code references (today)

| File | Role |
| --- | --- |
| `lib/genui/presentationSnapshot.ts` | Types, fingerprint, draft builder, API path helpers |
| `lib/genui/reportExport.ts` | Step 2 client export (DOM) |
| `components/genui/GenuiReportExportBar.tsx` | Export UI; reserved “Save presentation” |
| `app/projects/[id]/documents/genui/page.tsx` | `data-genui-*` on export anchor |
