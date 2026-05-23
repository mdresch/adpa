/**
 * Step 3 (Publish) — reserved contracts for presentation snapshots.
 *
 * NOT implemented here: REST handlers, `document_presentations` table, blob upload.
 * See: docs/superpowers/specs/2026-05-21-genui-step3-presentations-design.md
 */

import {
  getLatestGenuiReportRenderElement,
  prepareGenuiReportExportHtml,
} from "@/lib/genui/reportExport";
import {
  wantsGenuiFocusedDetailRender,
  wantsGenuiFullDocumentLayout,
} from "@/lib/openui/layoutPlan";

/** Bump when render_recipe or artifact semantics change. */
export const GENUI_PRESENTATION_SPEC_VERSION = "1" as const;

export type GenuiPresentationSpecVersion = typeof GENUI_PRESENTATION_SPEC_VERSION;

/** Blob + API artifact kinds for a published presentation. */
export const GENUI_PRESENTATION_ARTIFACT_KINDS = [
  "pdf",
  "docx",
  "html",
  "html_snapshot",
  "openui_lang",
  "plain_text",
] as const;

export type GenuiPresentationArtifactKind =
  (typeof GENUI_PRESENTATION_ARTIFACT_KINDS)[number];

/** Step 2 export bar actions → future blob kind (Word v1 saves HTML as .doc). */
export const GENUI_STEP2_EXPORT_TO_ARTIFACT_KIND: Record<
  "pdf" | "word" | "html" | "openui_lang" | "plain_text" | "source_markdown",
  GenuiPresentationArtifactKind | "source_markdown"
> = {
  pdf: "pdf",
  word: "docx",
  html: "html",
  openui_lang: "openui_lang",
  plain_text: "plain_text",
  source_markdown: "source_markdown",
};

export type GenuiLayoutMode = "focused" | "full" | "unknown";

export type GenuiRenderRecipe = {
  specVersion: GenuiPresentationSpecVersion;
  /** Last user message that drove layout plan + executor (Step 2). */
  userPrompt: string;
  layoutMode: GenuiLayoutMode;
  plannerSurface: "genui-workspace";
  capturedAt: string;
};

/** Metadata row shape (Postgres) — bytes live in blob storage. */
export type GenuiPresentationRecord = {
  id: string;
  projectId: string;
  documentId: string;
  documentVersion: number;
  sourceContentFingerprint: string;
  title: string;
  label?: string;
  status: "draft" | "published" | "stale";
  renderRecipe: GenuiRenderRecipe;
  artifacts: GenuiPresentationArtifactRef[];
  /** Results of optional enterprise publish (Step 3) */
  externalPublish?: GenuiPresentationExternalPublishRef[];
  createdAt: string;
  createdBy?: string;
};

export type GenuiPresentationArtifactRef = {
  kind: GenuiPresentationArtifactKind;
  blobPath: string;
  mimeType: string;
  byteSize?: number;
};

/**
 * Client-side bundle gathered before a future `POST …/presentations`.
 * Safe to build in Step 2 without persisting.
 */
export type GenuiPresentationSnapshotDraft = {
  specVersion: GenuiPresentationSpecVersion;
  projectId: string;
  documentId: string;
  documentTitle: string;
  documentVersion: number;
  sourceContentFingerprint: string;
  renderRecipe: GenuiRenderRecipe;
  payloads: {
    openuiLang: string | null;
    renderedHtml: string | null;
    plainText: string | null;
  };
};

/**
 * Enterprise systems Step 3 can push to after snapshot + blobs are created.
 * Reuses project integration settings (`project_integrations`) and existing server services.
 */
export const GENUI_PRESENTATION_INTEGRATION_PLATFORMS = [
  "confluence",
  "jira",
  "sharepoint",
  "projectwise",
] as const;

export type GenuiPresentationIntegrationPlatform =
  (typeof GENUI_PRESENTATION_INTEGRATION_PLATFORMS)[number];

/** Which snapshot artifact to send to each platform (defaults differ per platform). */
export type GenuiIntegrationArtifactPreference = {
  confluence?: "html_snapshot" | "pdf" | "markdown_source";
  jira?: "pdf" | "html_snapshot";
  sharepoint?: "pdf" | "docx" | "html";
  projectwise?: "pdf" | "docx";
};

export type GenuiPresentationExternalPublishRef = {
  platform: GenuiPresentationIntegrationPlatform;
  status: "pending" | "published" | "failed" | "skipped";
  /** Remote URL (Confluence page, Jira issue, SharePoint file, …) */
  url?: string;
  externalId?: string;
  artifactKind?: GenuiPresentationArtifactKind | "markdown_source";
  error?: string;
  publishedAt?: string;
};

export type PublishPresentationIntegrationsRequest = {
  /** Subset to run; empty = none. Server skips platforms disabled in project settings. */
  platforms: GenuiPresentationIntegrationPlatform[];
  artifactPreference?: GenuiIntegrationArtifactPreference;
  /** Jira: defaults to document title + link back to ADPA presentation */
  jiraIssueTitle?: string;
  jiraIssueDescription?: string;
  /** Confluence: update existing page when `documents.confluence_page_url` is set */
  confluenceUpdateExisting?: boolean;
};

/** Future request body for publish API (reserve). */
export type CreateGenuiPresentationRequest = {
  specVersion: GenuiPresentationSpecVersion;
  label?: string;
  renderRecipe: GenuiRenderRecipe;
  /** Client- or server-generated; server should re-verify against documents.content */
  sourceContentFingerprint: string;
  documentVersion: number;
  /** At least one artifact source required when implementing server publish */
  includeArtifacts?: GenuiPresentationArtifactKind[];
  /** Optional push to Confluence / Jira / SharePoint / ProjectWise (Step 3 — same transaction as snapshot) */
  publishIntegrations?: PublishPresentationIntegrationsRequest;
};

export type GenuiPresentationContext = {
  projectId: string;
  documentId: string;
  documentVersion: number;
  documentTitle: string;
  sourceMarkdown: string;
  /** Latest user prompt for layout (from page state). */
  lastUserLayoutPrompt: string;
};

/** Stable, non-cryptographic fingerprint for markdown change detection. */
export function fingerprintSourceMarkdown(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return `djb2-${(hash >>> 0).toString(16)}`;
}

export function resolveGenuiLayoutModeFromPrompt(prompt: string): GenuiLayoutMode {
  const trimmed = prompt.trim();
  if (!trimmed) return "unknown";
  if (wantsGenuiFocusedDetailRender(trimmed)) return "focused";
  if (wantsGenuiFullDocumentLayout(trimmed)) return "full";
  return "unknown";
}

export function buildRenderRecipe(userPrompt: string): GenuiRenderRecipe {
  return {
    specVersion: GENUI_PRESENTATION_SPEC_VERSION,
    userPrompt: userPrompt.trim(),
    layoutMode: resolveGenuiLayoutModeFromPrompt(userPrompt),
    plannerSurface: "genui-workspace",
    capturedAt: new Date().toISOString(),
  };
}

export function getLatestRenderedReportHtml(): string | null {
  if (typeof document === "undefined") return null;
  const renderRoot = getLatestGenuiReportRenderElement();
  if (!renderRoot) return null;
  return prepareGenuiReportExportHtml(renderRoot).trim() || null;
}

export function getLatestRenderedReportPlainText(): string | null {
  if (typeof document === "undefined") return null;
  const renderRoot = getLatestGenuiReportRenderElement();
  const text =
    renderRoot?.innerText?.trim() || renderRoot?.textContent?.trim() || "";
  return text || null;
}

/**
 * Build a publish payload from the current Step 2 session (no network I/O).
 * Returns null when required ids or source markdown are missing.
 */
export function buildPresentationSnapshotDraft(
  ctx: GenuiPresentationContext,
  options: { openuiLang?: string | null } = {}
): GenuiPresentationSnapshotDraft | null {
  if (!ctx.projectId || !ctx.documentId || !ctx.sourceMarkdown?.trim()) {
    return null;
  }

  return {
    specVersion: GENUI_PRESENTATION_SPEC_VERSION,
    projectId: ctx.projectId,
    documentId: ctx.documentId,
    documentTitle: ctx.documentTitle,
    documentVersion: ctx.documentVersion,
    sourceContentFingerprint: fingerprintSourceMarkdown(ctx.sourceMarkdown),
    renderRecipe: buildRenderRecipe(ctx.lastUserLayoutPrompt || ""),
    payloads: {
      openuiLang: options.openuiLang?.trim() || null,
      renderedHtml: getLatestRenderedReportHtml(),
      plainText: getLatestRenderedReportPlainText(),
    },
  };
}

/** Proposed blob key — implement upload against your storage adapter. */
export function buildPresentationBlobPath(
  projectId: string,
  documentId: string,
  presentationId: string,
  kind: GenuiPresentationArtifactKind,
  extension: string
): string {
  return `presentations/${projectId}/${documentId}/${presentationId}/${kind}.${extension}`;
}

/** Reserved REST paths (Express / Next proxy) — handlers not implemented. */
export function getGenuiPresentationApiPaths(documentId: string) {
  const base = `/api/v1/documents/${documentId}/presentations`;
  return {
    list: base,
    create: base,
    byId: (presentationId: string) => `${base}/${presentationId}`,
    republishIntegrations: (presentationId: string) =>
      `${base}/${presentationId}/integrations`,
  };
}

export function isGenuiPresentationIntegrationPlatform(
  value: string
): value is GenuiPresentationIntegrationPlatform {
  return (GENUI_PRESENTATION_INTEGRATION_PLATFORMS as readonly string[]).includes(
    value
  );
}

/** Default artifact per platform when client does not specify preferences. */
export function defaultIntegrationArtifactPreference(): GenuiIntegrationArtifactPreference {
  return {
    confluence: "html_snapshot",
    jira: "pdf",
    sharepoint: "pdf",
    projectwise: "pdf",
  };
}

/**
 * Maps Step 3 integration publish to existing ADPA server modules (implementers).
 * GenUI publish must use **presentation artifacts**, not raw `documents.content` alone.
 */
export const GENUI_PRESENTATION_INTEGRATION_ADAPTERS = {
  confluence: {
    service: "ConfluenceIntegration / confluenceRoutes",
    routes: "POST /api/integrations/confluence/:id/export",
    projectSettings: "confluence_enabled, confluence_space_key_override",
    note: "Today exports markdown only; Step 3 adds html_snapshot or PDF attachment mode.",
  },
  jira: {
    service: "JiraLinkageService",
    routes: "POST /api/jira-linkage/create-issue",
    projectSettings: "jira_enabled, jira_project_key_override",
    note: "Link issue to document; attach PDF from presentation blob or URL in description.",
  },
  sharepoint: {
    service: "sharepointService / StorageArchivalService",
    projectSettings: "sharepoint_auto_archive, sharepoint_drive_id",
    note: "Upload PDF/DOCX file to configured drive.",
  },
  projectwise: {
    service: "projectWiseService / StorageArchivalService",
    projectSettings: "projectwise_auto_archive, projectwise_folder_path",
    note: "Upload PDF/DOCX to configured folder.",
  },
} as const;

/** Gate future “Save presentation” UI; default off until Step 3 ships. */
export function isGenuiStep3PublishEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GENUI_STEP3_PUBLISH === "true";
}

export function isPresentationStale(
  snapshotFingerprint: string,
  currentSourceMarkdown: string
): boolean {
  return (
    fingerprintSourceMarkdown(currentSourceMarkdown) !== snapshotFingerprint
  );
}
