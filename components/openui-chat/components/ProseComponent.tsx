"use client"

import { MarkdownRenderer } from "@/components/documents/MarkdownRenderer"
import type { OpenUIChatJson } from "@/lib/openui/library"

interface ProseComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

/** Renders full section narrative — default when structured UI cannot hold all source text. */
export function ProseComponent({ props }: ProseComponentProps) {
  const paragraphs = props.paragraphs as string[] | undefined
  const body = props.body as string | undefined
  const text =
    body?.trim() ||
    (paragraphs?.length ? paragraphs.map((p) => p.trim()).filter(Boolean).join("\n\n") : "") ||
    ""

  if (!text) {
    return <p className="text-sm italic text-slate-400">No content for this section.</p>
  }

  return (
    <div className="report-prose prose prose-slate max-w-none text-[15px] leading-relaxed prose-p:my-3 prose-headings:scroll-mt-6 prose-headings:font-semibold prose-headings:text-slate-900 prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5 prose-table:my-4 prose-table:w-full prose-table:border prose-table:border-slate-200 prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-pre:my-4 prose-pre:rounded-lg prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-code:text-[0.9em] prose-blockquote:border-l-slate-300 prose-blockquote:text-slate-600">
      <MarkdownRenderer content={text} />
    </div>
  )
}
