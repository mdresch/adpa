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

/** Fill table body via DOM APIs (avoids assigning user-derived HTML to innerHTML). */
export function populateTableBodyRows(
  tbody: HTMLTableSectionElement,
  columns: GenuiTableExportColumn[]
): void {
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  const rowCount = tableExportRowCount(columns);
  for (let ri = 0; ri < rowCount; ri++) {
    const tr = document.createElement("tr");
    for (const col of columns) {
      const td = document.createElement("td");
      appendExportTableCellText(td, col.data[ri] ?? "");
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function appendExportTableCellText(td: HTMLTableCellElement, raw: string): void {
  const formatted = formatExportTableCellText(raw);
  const lines = formatted.split("\n");
  lines.forEach((line, index) => {
    if (index > 0) {
      td.appendChild(document.createElement("br"));
    }
    td.appendChild(document.createTextNode(line));
  });
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
