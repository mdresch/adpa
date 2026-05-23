/**
 * Client-side export helpers for the GenUI component report (rendered `.genui-lang-render` DOM).
 *
 * Step 2 delivery only. For publish/snapshot contracts reserved for Step 3, see
 * `lib/genui/presentationSnapshot.ts` and
 * `docs/superpowers/specs/2026-05-21-genui-step3-presentations-design.md`.
 */

import {
  buildTableBodyRowsHtml,
  escapeHtmlText,
  parseTableExportPayload,
  resolveExportUrl,
} from "@/lib/genui/reportExportPrepare";

const REPORT_RENDER_SELECTOR = ".genui-advisor-pane .genui-lang-render";

const PAGINATION_FOOTER_SELECTOR =
  ".flex.items-center.justify-end.gap-2.pt-2";

export function sanitizeExportFilename(title: string): string {
  const base = title
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return base || "genui-report";
}

/** Latest rendered OpenUI report in the Step 2 pane (last assistant turn). */
export function getLatestGenuiReportRenderElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const nodes = document.querySelectorAll<HTMLElement>(REPORT_RENDER_SELECTOR);
  return nodes.length > 0 ? nodes[nodes.length - 1] : null;
}

export function downloadTextFile(content: string, filename: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const EXPORT_PRINT_STYLES = `
  @page { size: A4; margin: 16mm; }
  body {
    font-family: Inter, system-ui, sans-serif;
    color: #0f172a;
    line-height: 1.5;
    margin: 0;
    padding: 0;
  }
  .genui-export-header {
    border-bottom: 3px solid #7c3aed;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .genui-export-header h1 {
    font-size: 20px;
    margin: 0;
    color: #0f172a;
  }
  .genui-export-header p {
    margin: 4px 0 0;
    font-size: 12px;
    color: #64748b;
  }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-weight: 600; }
  img { max-width: 100%; height: auto; }
`;

function buildExportHeaderHtml(title: string): string {
  const safeTitle = escapeHtmlText(title);
  return `<div class="genui-export-header">
    <h1>${safeTitle}</h1>
    <p>Exported from ADPA GenUI component report</p>
  </div>`;
}

function buildExportHtmlDocument(title: string, bodyHtml: string): string {
  const safeTitle = escapeHtmlText(title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>${EXPORT_PRINT_STYLES}</style>
</head>
<body>
  ${buildExportHeaderHtml(title)}
  <div class="genui-export-body">${bodyHtml}</div>
</body>
</html>`;
}

/** Word-compatible single document (no nested full HTML documents). */
function buildWordHtmlDocument(title: string, bodyHtml: string): string {
  const safeTitle = escapeHtmlText(title);
  return `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>${EXPORT_PRINT_STYLES}</style>
</head>
<body>
  ${buildExportHeaderHtml(title)}
  <div class="genui-export-body">${bodyHtml}</div>
</body>
</html>`;
}

function expandPaginatedTables(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("[data-genui-table-export]").forEach((wrapper) => {
    const payload = parseTableExportPayload(wrapper.getAttribute("data-genui-table-export"));
    if (!payload) return;

    wrapper.querySelectorAll(PAGINATION_FOOTER_SELECTOR).forEach((el) => el.remove());
    wrapper
      .querySelectorAll('[aria-label="Previous page"], [aria-label="Next page"]')
      .forEach((el) => el.closest(PAGINATION_FOOTER_SELECTOR)?.remove());

    const tbody = wrapper.querySelector("tbody");
    if (tbody) {
      tbody.innerHTML = buildTableBodyRowsHtml(payload.columns);
    }
  });
}

function stripExportChrome(root: HTMLElement): void {
  root
    .querySelectorAll(
      '[aria-label="Previous page"], [aria-label="Next page"], [aria-label="Scroll left"], [aria-label="Scroll right"]'
    )
    .forEach((el) => {
      const footer = el.closest(PAGINATION_FOOTER_SELECTOR);
      if (footer) footer.remove();
      else el.remove();
    });

  root.querySelectorAll("button").forEach((btn) => {
    const label = btn.getAttribute("aria-label") ?? "";
    if (/page|scroll/i.test(label)) btn.remove();
  });
}

function resolveImagesForExport(root: HTMLElement, origin: string): void {
  root.querySelectorAll<HTMLImageElement>("img[src]").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;
    img.setAttribute("src", resolveExportUrl(src, origin));
  });
}

/**
 * Clone the live report DOM and prepare it for static export (all table rows, no pagination UI).
 */
export function prepareGenuiReportExportHtml(renderRoot: HTMLElement): string {
  const clone = renderRoot.cloneNode(true) as HTMLElement;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  expandPaginatedTables(clone);
  stripExportChrome(clone);
  resolveImagesForExport(clone, origin);

  return clone.innerHTML;
}

export type GenuiReportExportResult = { ok: true } | { ok: false; reason: string };

export function exportGenuiReportHtml(title: string): GenuiReportExportResult {
  const renderRoot = getLatestGenuiReportRenderElement();
  if (!renderRoot) {
    return { ok: false, reason: "Render a report first (use a starter or Render document)." };
  }
  const bodyHtml = prepareGenuiReportExportHtml(renderRoot);
  const html = buildExportHtmlDocument(title, bodyHtml);
  const filename = `${sanitizeExportFilename(title)}.html`;
  downloadTextFile(html, filename, "text/html;charset=utf-8");
  return { ok: true };
}

/** Word opens HTML saved as .doc; preserves layout better than raw Lang for stakeholders. */
export function exportGenuiReportWord(title: string): GenuiReportExportResult {
  const renderRoot = getLatestGenuiReportRenderElement();
  if (!renderRoot) {
    return { ok: false, reason: "Render a report first (use a starter or Render document)." };
  }
  const bodyHtml = prepareGenuiReportExportHtml(renderRoot);
  const wordShell = buildWordHtmlDocument(title, bodyHtml);
  const filename = `${sanitizeExportFilename(title)}.doc`;
  downloadTextFile(wordShell, filename, "application/msword");
  return { ok: true };
}

/** Opens the browser print dialog (Save as PDF) using the rendered report DOM. */
export async function exportGenuiReportPdf(title: string): Promise<GenuiReportExportResult> {
  const renderRoot = getLatestGenuiReportRenderElement();
  if (!renderRoot) {
    return { ok: false, reason: "Render a report first (use a starter or Render document)." };
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return { ok: false, reason: "Could not open print preview." };
  }

  const bodyHtml = prepareGenuiReportExportHtml(renderRoot);
  doc.open();
  doc.write(buildExportHtmlDocument(title, bodyHtml));
  doc.close();

  await new Promise((r) => setTimeout(r, 400));

  try {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    return { ok: true };
  } catch {
    return { ok: false, reason: "Print dialog failed." };
  } finally {
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 500);
  }
}
