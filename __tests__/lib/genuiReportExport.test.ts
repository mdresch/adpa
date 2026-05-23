/**
 * @jest-environment jsdom
 */
import {
  formatExportTableCellText,
  parseTableExportPayload,
  populateTableBodyRows,
  resolveExportUrl,
  tableExportRowCount,
} from "@/lib/genui/reportExportPrepare";
import {
  getLatestGenuiReportRenderElement,
  sanitizeExportFilename,
} from "@/lib/genui/reportExport";

describe("getLatestGenuiReportRenderElement", () => {
  it("finds the latest render when a toolbar div follows the lang canvas", () => {
    document.body.innerHTML = `
      <div class="genui-advisor-pane">
        <div class="genui-report-surface">
          <div class="genui-lang-render"><p>First report</p></div>
          <div class="genui-report-toolbar"><button type="button">Copy</button></div>
        </div>
        <div class="genui-report-surface">
          <div class="genui-lang-render"><p>Latest report</p></div>
          <div class="genui-report-toolbar"><button type="button">Copy</button></div>
        </div>
      </div>
    `;

    const el = getLatestGenuiReportRenderElement();
    expect(el?.textContent).toContain("Latest report");
    expect(el?.textContent).not.toContain("First report");
  });
});

describe("sanitizeExportFilename", () => {
  it("slugifies document titles for download names", () => {
    expect(sanitizeExportFilename("Schedule Management Plan v2")).toBe(
      "Schedule-Management-Plan-v2"
    );
  });

  it("falls back when title is empty", () => {
    expect(sanitizeExportFilename("   ")).toBe("genui-report");
  });
});

describe("reportExportPrepare", () => {
  it("parses table export payload JSON", () => {
    const payload = parseTableExportPayload(
      JSON.stringify({
        columns: [
          { label: "ID", data: ["1", "2"] },
          { label: "Name", data: ["A", "B"] },
        ],
      })
    );
    expect(payload?.columns).toHaveLength(2);
    expect(tableExportRowCount(payload!.columns)).toBe(2);
  });

  it("builds all table body rows for export", () => {
    const tbody = document.createElement("tbody");
    populateTableBodyRows(tbody, [
      { label: "ID", data: ["1", "2", "3"] },
      { label: "Name", data: ["Alpha", "Beta", "Gamma"] },
    ]);
    expect(tbody.querySelectorAll("tr").length).toBe(3);
    expect(tbody.textContent).toContain("Gamma");
  });

  it("strips simple markdown emphasis in cells", () => {
    expect(formatExportTableCellText("**Critical** path")).toBe("Critical path");
  });

  it("resolves root-relative image URLs", () => {
    expect(resolveExportUrl("/images/cover.jpeg", "http://localhost:3000")).toBe(
      "http://localhost:3000/images/cover.jpeg"
    );
  });
});
