"use client";

import { useThread } from "@openuidev/react-headless";
import { LayoutTemplate, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  extractMessageText,
  extractOpenUILangText,
  looksLikeOpenUILang,
  type OpenUIChatJson,
} from "@/lib/openui/library";

type GenuiThreadToolbarProps = {
  renderDisabled: boolean;
  onRenderDocument: () => void;
  onNewReport: () => void;
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

/** Toolbar inside OpenUI thread — hides "Render document" once a report exists. */
export function GenuiThreadToolbar({
  renderDisabled,
  onRenderDocument,
  onNewReport,
}: GenuiThreadToolbarProps) {
  const messages = useThread((s) => s.messages);
  const hasReport = threadHasRenderedReport(messages);

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
      {!hasReport ? (
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
          disabled={renderDisabled}
          onClick={onRenderDocument}
          title="Build a full interactive report from this document (light theme)"
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          Render document
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-white"
        onClick={onNewReport}
        title="Start a new report for this document"
      >
        <Plus className="h-3.5 w-3.5" />
        + New Report
      </Button>
    </div>
  );
}
