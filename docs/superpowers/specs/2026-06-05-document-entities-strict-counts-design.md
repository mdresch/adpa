# Document Entities Strict Per-Document Counts Design

Date: 2026-06-05  
Status: Approved

## Goal

On `/projects/{id}/documents/{docId}/entities`, show entities and per-entity-type counts that are strictly saved for the current document.

## Scope

In scope:
- Backend query behavior for `GET /analysis/document/:docId/entities`.
- Result semantics for `entityCounts`, `entities`, and `totalEntities` consumed by the existing page UI.

Out of scope:
- Route/path changes in frontend.
- Broader context matching logic changes.
- Audit trail behavior changes.

## Current Problem

The endpoint currently returns entities using:
- `document_id = docId` **or**
- `entity_data.source_document_ids` containing `docId`

This mixes entities that were created in other documents but context-linked to the current one, which inflates per-document counts and detail lists.

## Design

### 1. Strict Document Association

Change the repository query in `AnalysisRepository.getEntitiesByDocument(documentId)` to:
- Include only rows where `document_id = $1`
- Keep `status != 'deleted'`
- Preserve sort order

Result: payload remains same shape, but semantics become strict-to-document ownership.

### 2. Controller and UI Contract

No response schema changes in `AnalysisController.getEntitiesByDocument`:
- `entityCounts` remains `Record<string, number>`
- `entities` remains grouped by mapped camel entity type keys
- `totalEntities` remains `entities.length`

Because the UI already consumes this payload, cards and dialog detail lists automatically become strict per-document without frontend route/component rewiring.

### 3. Safety and Compatibility

- Authentication and project access behavior remain unchanged.
- No DB schema or migration changes.
- Context matching metadata (`context_match`) remains present for entities owned by the document.

## Testing

Add/adjust backend tests for document entity retrieval:
- Includes entities where `document_id = docId`
- Excludes entities from other documents even if `source_document_ids` includes `docId`
- Confirms counts and grouped entities reflect strict scope

## Risks

- Existing users who relied on mixed context-linked counts will see lower counts.
- Mitigation: this is intentional and aligns with requested “from that document” semantics.
