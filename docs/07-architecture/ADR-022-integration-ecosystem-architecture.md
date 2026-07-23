# ADR 022: Integration Ecosystem Architecture

## 1. Status
**Proposed (2026-07-23)** — the integration ecosystem described here is fully implemented; this ADR records the architecture retroactively.

## 2. Context

ADPA integrates with external document and project-management platforms (Confluence, SharePoint, GitHub, Notion, Dynamics 365 Guides, Adobe PDF Services). Each integration is a self-contained module under `server/src/integrations/` with its own authentication, sync, and upload logic. Project-level integration settings live in `project_integrations` (Confluence space key, parent page overrides, `confluence_enabled` flag). None of this is documented at the ADR level.

Verified against running code:

- **Confluence** (`confluence.ts`, `confluenceService.ts`): bidirectional sync — syncs spaces/pages to ADPA documents; uploads ADPA documents back as Confluence pages. Auth via email/password or API token. Respects `confluence_enabled` flag and project-level space/parent overrides.
- **SharePoint** (`sharepoint.ts`): Microsoft Graph API (`SharePointGraphClient`) for sites, drives, files, permissions. OAuth2 client credentials auth.
- **GitHub** (`github.ts`, `githubService.ts`): syncs `.md`/`.json` templates from a repo's `templates/` directory; commits documents back; creates PRs. PAT auth.
- **Notion** (`notion.ts`): search, page/database retrieval. Bearer token auth.
- **Dynamics 365 Guides** (`dynamics365-guides.ts`): Dataverse-backed AR guide generation. OAuth2 client credentials with token refresh. Not wired into the generic integration dashboard — standalone service.
- **Adobe PDF** (`adobe-pdf.ts`, `adobePdfService.ts`): PDF generation via Adobe PDF Services. Service account auth. Falls back to Puppeteer if Adobe is not configured or fails.

Post-generation hook: Confluence publishing is enqueued automatically after document generation if the project has a Confluence mapping.

Common interface: `uploadDocument` is implemented across integrations, but each implementation differs because the target APIs have different request/response shapes.

## 3. Decision

We adopt an **adapter-per-integration pattern** with a shared `uploadDocument` contract and project-level configuration overrides. The integration layer is a best-effort side-effect on generation and a manual on-demand action for one-way sync. Retry and fallback are the caller's responsibility.

### 3.1 Adapter Pattern

Each integration is a self-contained class implementing:

- `authenticate()` — establish credentials (OAuth2, PAT, bearer token, etc.)
- `syncToExternal()` — pull external content into ADPA (one-way import)
- `uploadDocument()` — push ADPA document content back to the external platform (one-way export)
- `listPermissions()` / `updatePermissions()` — where supported

No integration inherits from a shared base class. They share a documented interface but not a runtime contract. This is intentional: each external API is different enough that a shared base would be either very thin or very leaky.

### 3.2 Project-Level Overrides

Project-specific integration settings are stored in `project_integrations`:

- **Confluence**: `space_key`, `parent_page_id`, `confluence_enabled`.
- **GitHub**: `repo`, `branch`, `path`.
- **SharePoint**: `site_id`, `drive_id`, `folder_path`.

The system falls back from `project_integrations` to a legacy `projectIntegrations` data-access object if the newer settings are empty. This fallback is a compatibility shim, not a design feature, and should be removed once all projects have migrated to the new fields.

### 3.3 Post-Generation Hooks

Confluence publishing is the only integration with an automatic post-generation hook. It is enqueued on the `confluence-publishing` queue after generation succeeds. Upload failures do not fail the generation; they are logged and can be retried from the integration dashboard.

Other integrations (GitHub, SharePoint, Notion, D365, Adobe) are triggered manually or by scheduled batch jobs, not inline after generation.

### 3.4 Export Fallback for PDF

Adobe PDF Services is the preferred PDF generation path for production exports. If Adobe is not configured or returns an error, the system falls back to Puppeteer (`unifiedPdfService.ts`). This two-path design ensures PDF export is never unavailable due to a single vendor integration failure.

## 4. Options Considered

### Option A: Unified integration abstraction (shared base class + common API client)
| Dimension | Assessment |
|---|---|
| Consistency | High — one `uploadDocument` signature, one auth flow |
| Flexibility | Low — external APIs diverge enough that a common client would special-case everything |

Rejected: tried implicitly in the legacy `server/src/modules/ai/` early design and found unworkable. The current per-integration classes are cleaner and easier to debug.

### Option B (Recommended): Adapter-per-integration with documented interface
| Dimension | Assessment |
|---|---|
| Consistency | Medium — interface is documented but not enforced at runtime |
| Flexibility | High — each adapter is free to implement auth and retry as the target API requires |
| Maintenance | Medium — adding a new integration is a new module, not a subclass |

The current implementation. Adding a new integration means adding a new file under `server/src/integrations/` and wiring it into the admin UI, not extending a shared base.

### Option C: Headless browser automation for all integrations (Playwright / Puppeteer screenshots)
| Dimension | Assessment |
|---|---|
| Coverage | High — works against any web UI |
| Reliability | Low — UI changes break automation; auth flows are fragile |

Rejected: only used for PDF generation where the HTML-to-PDF path is genuinely useful. Document management integrations require structured APIs, not headless automation.

## 5. Consequences

### Positive
- **Fault isolation**: a SharePoint outage does not prevent Confluence sync or document generation.
- **Best-effort side-effects**: post-generation hooks are enqueued jobs, not inline calls. A Confluence flake does not fail the generation that produced the document.
- **Export resilience**: Adobe PDF failure falls back to Puppeteer automatically; users never see a "PDF unavailable" error if one of the two paths works.

### Negative
- **Auth diversity**: every integration uses a different credential model (OAuth2, PAT, bearer token, service account). Rotating or revoking credentials requires touching five different code paths and UI screens.
- **Configuration drift**: `project_integrations` vs. legacy `projectIntegrations` means the same project can have settings in two places, and the system's behavior depends on which one is populated.

### Risks
- **Adobe dependency**: the Adobe PDF path requires an external service account and network access to Adobe endpoints. If Adobe changes their API version or deprecates a feature, the PDF export silently degrades (Puppeteer fallback covers quality, but the fallback may not match Adobe's typography).
- **D365 Guides untested integration path**: the `dynamics365-guides.ts` service exists but is not connected to the generic integration dashboard. If it is used in production, failures are invisible to ops because they do not flow through the same retry/monitoring path as the other integrations.

## 6. Action Items

1. Remove the `projectIntegrations` legacy fallback once all projects have migrated to `project_integrations`.
2. Add integration-level health checks to the admin dashboard so a stale SharePoint token or expired Confluence session is visible before a sync failure surfaces to the user.
3. Connect `dynamics365-guides.ts` to the generic integration monitoring path.
4. Document each integration's auth model, config schema, and sync direction in `docs/07-architecture/INTEGRATIONS.md`.

## 7. References

- `server/src/integrations/confluence.ts`, `server/src/services/confluenceService.ts` — Confluence sync and upload
- `server/src/integrations/sharepoint.ts` — SharePoint Graph API client
- `server/src/integrations/github.ts`, `server/src/services/githubService.ts` — GitHub template sync and PR creation
- `server/src/integrations/notion.ts` — Notion search and page retrieval
- `server/src/integrations/dynamics365-guides.ts` — D365 Guides Dataverse-backed generation
- `server/src/integrations/adobe-pdf.ts`, `server/src/services/adobePdfService.ts` — Adobe PDF Services
- `server/src/integrations/driftNotifications.ts` — notification service
- `server/migrations/000_baseline.sql` — `project_integrations` table schema
- `server/src/services/unifiedPdfService.ts` — Puppeteer PDF fallback
- [ADR-013: Document Generation Pipeline Architecture](ADR-013-document-generation-pipeline-architecture.md) — generation stage that enqueues Confluence publishing
- [ADR-017: Queue & Background Processing Architecture](ADR-017-queue-and-background-processing-architecture.md) — `confluence-publishing` queue
