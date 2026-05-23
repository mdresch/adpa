"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useThread } from "@openuidev/react-headless";
import {
  ChevronDown,
  FileCode2,
  FileDown,
  FileText,
  FileType2,
  Globe,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  extractMessageText,
  extractOpenUILangText,
  looksLikeOpenUILang,
  type OpenUIChatJson,
} from "@/lib/openui/library";
import {
  buildPresentationSnapshotDraft,
  isGenuiStep3PublishEnabled,
  type GenuiPresentationContext,
} from "@/lib/genui/presentationSnapshot";
import {
  downloadTextFile,
  exportGenuiReportHtml,
  exportGenuiReportPdf,
  exportGenuiReportWord,
  getLatestGenuiReportRenderElement,
  sanitizeExportFilename,
} from "@/lib/genui/reportExport";
import { toast } from "@/lib/notify";

type ExportKind = "pdf" | "word" | "html" | null;

type GenuiReportExportBarProps = {
  documentTitle: string;
  /** Step 1 source text — optional exports from the left pane */
  sourceMarkdown?: string;
  /** Reserved for Step 3 publish — builds snapshot draft without persisting */
  presentationContext?: GenuiPresentationContext;
};

function threadHasRenderedReport(
  messages: { role: string; content?: unknown }[]
): boolean {
  return messages.some((m) => {
    if (m.role !== "assistant") return false;
    const text = extractMessageText(m.content as OpenUIChatJson);
    return looksLikeOpenUILang(extractOpenUILangText(text));
  });
}

function getLatestAssistantLang(
  messages: { role: string; content?: unknown }[]
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const text = extractMessageText(m.content as OpenUIChatJson);
    const lang = extractOpenUILangText(text);
    if (looksLikeOpenUILang(lang)) return lang;
  }
  return null;
}

const EXPORT_ANCHOR_SELECTOR = ".genui-report-export-anchor";

/**
 * Renders inside FullScreen (for useThread) and portals the bar to the bottom of Step 2.
 */
export function GenuiReportExportBarPortal(props: GenuiReportExportBarProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setAnchor(document.querySelector(EXPORT_ANCHOR_SELECTOR));
  }, []);

  if (!anchor) return null;
  return createPortal(<GenuiReportExportBar {...props} />, anchor);
}

function GenuiReportExportBar({
  documentTitle,
  sourceMarkdown,
  presentationContext,
}: GenuiReportExportBarProps) {
  const messages = useThread((s) => s.messages);
  const hasReport = useMemo(() => threadHasRenderedReport(messages), [messages]);
  const [exporting, setExporting] = useState<ExportKind>(null);
  const step3PublishEnabled = isGenuiStep3PublishEnabled();

  const baseName = useMemo(() => sanitizeExportFilename(documentTitle), [documentTitle]);

  const snapshotDraft = useMemo(() => {
    if (!presentationContext) return null;
    return buildPresentationSnapshotDraft(presentationContext, {
      openuiLang: getLatestAssistantLang(messages),
    });
  }, [messages, presentationContext]);

  const runExport = useCallback(
    async (kind: ExportKind) => {
      if (!kind) return;
      setExporting(kind);
      try {
        let result: { ok: boolean; reason?: string };
        if (kind === "pdf") {
          result = await exportGenuiReportPdf(documentTitle);
        } else if (kind === "word") {
          result = exportGenuiReportWord(documentTitle);
        } else {
          result = exportGenuiReportHtml(documentTitle);
        }
        if (!result.ok) {
          toast.error(result.reason ?? "Export failed");
        } else if (kind === "pdf") {
          toast.success("Use “Save as PDF” in the print dialog");
        } else {
          toast.success(`Downloaded ${kind.toUpperCase()} export`);
        }
      } finally {
        setExporting(null);
      }
    },
    [documentTitle]
  );

  const exportSourceMarkdown = useCallback(() => {
    if (!sourceMarkdown?.trim()) {
      toast.error("No source document text to export");
      return;
    }
    downloadTextFile(sourceMarkdown, `${baseName}-source.md`, "text/markdown;charset=utf-8");
    toast.success("Downloaded source Markdown");
  }, [baseName, sourceMarkdown]);

  const exportOpenUILang = useCallback(() => {
    const lang = getLatestAssistantLang(messages);
    if (!lang) {
      toast.error("No OpenUI Lang report to export");
      return;
    }
    downloadTextFile(lang, `${baseName}.openui-lang`, "text/plain;charset=utf-8");
    toast.success("Downloaded OpenUI Lang source");
  }, [baseName, messages]);

  const savePresentationSnapshot = useCallback(() => {
    if (!step3PublishEnabled) return;
    if (!snapshotDraft) {
      toast.error("Cannot build presentation snapshot — render a report first");
      return;
    }
    // Wire to POST getGenuiPresentationApiPaths(documentId).create when Step 3 ships.
    toast.info("Save presentation (Step 3) is not enabled in this environment yet");
  }, [snapshotDraft, step3PublishEnabled]);

  const exportPlainText = useCallback(() => {
    const renderRoot = getLatestGenuiReportRenderElement();
    const text =
      renderRoot?.innerText?.trim() || renderRoot?.textContent?.trim() || "";
    if (!text) {
      toast.error("Render a report first");
      return;
    }
    downloadTextFile(text, `${baseName}.txt`, "text/plain;charset=utf-8");
    toast.success("Downloaded plain text");
  }, [baseName]);

  const disabled = !hasReport || exporting !== null;

  return (
    <div
      className="genui-report-export-bar shrink-0 border-t border-slate-200 bg-white px-4 py-3"
      role="region"
      aria-label="Export report"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900">Export report</p>
          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
            {hasReport
              ? "PDF uses your browser print dialog. Word and HTML include the rendered layout."
              : "Render a report first, then export."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-slate-200"
            disabled={disabled}
            onClick={() => runExport("pdf")}
            title="Print / Save as PDF"
          >
            {exporting === "pdf" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-violet-600" />
            )}
            PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-slate-200"
            disabled={disabled}
            onClick={() => runExport("word")}
            title="Download as Word (.doc)"
          >
            {exporting === "word" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileType2 className="h-3.5 w-3.5 text-violet-600" />
            )}
            Word
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-slate-200"
            disabled={disabled}
            onClick={() => runExport("html")}
            title="Download standalone HTML"
          >
            {exporting === "html" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5 text-violet-600" />
            )}
            HTML
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs border-slate-200"
                disabled={exporting !== null}
              >
                <FileDown className="h-3.5 w-3.5 text-slate-600" />
                More
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">Other formats</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!hasReport}
                onClick={exportPlainText}
                className="text-xs gap-2"
              >
                <FileText className="h-3.5 w-3.5" />
                Plain text (.txt)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!hasReport}
                onClick={exportOpenUILang}
                className="text-xs gap-2"
              >
                <FileCode2 className="h-3.5 w-3.5" />
                OpenUI Lang source
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!sourceMarkdown?.trim()}
                onClick={exportSourceMarkdown}
                className="text-xs gap-2"
              >
                <FileText className="h-3.5 w-3.5" />
                Source Markdown (Step 1)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!step3PublishEnabled || !snapshotDraft}
                onClick={savePresentationSnapshot}
                className="text-xs gap-2"
                title="Step 3 — snapshot, blobs, and optional Confluence/Jira/SharePoint publish (planned). See docs/superpowers/specs/2026-05-21-genui-step3-presentations-design.md"
              >
                <FileDown className="h-3.5 w-3.5" />
                Publish presentation (Step 3)
                {!step3PublishEnabled ? " (planned)" : ""}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
