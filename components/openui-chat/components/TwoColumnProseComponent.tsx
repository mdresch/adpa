"use client"

import { MarkdownRenderer } from "@/components/documents/MarkdownRenderer"
import type { OpenUIChatJson } from "@/lib/openui/library"

interface TwoColumnProseComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

const PROSE_CLASS =
  "prose prose-slate prose-sm max-w-none genui-report-prose " +
  "prose-p:leading-7 prose-p:my-2 prose-headings:text-slate-900"

export function TwoColumnProseComponent({ props }: TwoColumnProseComponentProps) {
  const left = String(props.left ?? "").trim()
  const right = String(props.right ?? "").trim()

  if (!left && !right) {
    return null
  }

  return (
    <div className="genui-two-column-prose">
      {left ? (
        <div className="min-w-0">
          <MarkdownRenderer content={left} className={PROSE_CLASS} />
        </div>
      ) : null}
      {right ? (
        <div className="min-w-0">
          <MarkdownRenderer content={right} className={PROSE_CLASS} />
        </div>
      ) : null}
    </div>
  )
}
