/**
 * Pure helpers for GenUI report export (testable without a browser).
 * DOM orchestration lives in `reportExport.ts`.
 */

export type GenuiTableExportColumn = {
  label: string;
  data: string[];
};

export type GenuiTableExportPayload = {
  columns: GenuiTableExportColumn[];
};

export function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Parse `data-genui-table-export` JSON from the Table component. */
export function parseTableExportPayload(raw: string | null): GenuiTableExportPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as GenuiTableExportPayload;
    if (!parsed?.columns?.length) return null;
    const columns = parsed.columns.map((col) => ({
      label: String(col.label ?? ""),
      data: Array.isArray(col.data) ? col.data.map((c) => String(c ?? "")) : [],
    }));
    return { columns };
  } catch {
    return null;
  }
}

export function tableExportRowCount(columns: GenuiTableExportColumn[]): number {
  if (!columns.length) return 0;
  return Math.max(...columns.map((c) => c.data.length), 0);
}

/** Plain-text cell for export (strip simple markdown emphasis). */
export function formatExportTableCellText(cell: string): string {
  return cell
    .replace(/\*\*/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function buildTableBodyRowsHtml(columns: GenuiTableExportColumn[]): string {
  const rowCount = tableExportRowCount(columns);
  const rows: string[] = [];
  for (let ri = 0; ri < rowCount; ri++) {
    const cells = columns
      .map((col) => {
        const text = formatExportTableCellText(col.data[ri] ?? "");
        return `<td>${escapeHtmlText(text).replace(/\n/g, "<br />")}</td>`;
      })
      .join("");
    rows.push(`<tr>${cells}</tr>`);
  }
  return rows.join("");
}

/** Resolve root-relative asset paths for offline Word / print. */
export function resolveExportUrl(href: string, origin: string): string {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) {
    const protocol = origin.startsWith("https") ? "https:" : "http:";
    return `${protocol}${trimmed}`;
  }
  if (trimmed.startsWith("/")) {
    return `${origin.replace(/\/$/, "")}${trimmed}`;
  }
  try {
    return new URL(trimmed, origin.endsWith("/") ? origin : `${origin}/`).href;
  } catch {
    return trimmed;
  }
}
