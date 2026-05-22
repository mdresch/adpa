"use client"

import type { OpenUIChatJson } from "@/lib/openui/library"
import { List } from "lucide-react"

interface TableOfContentsComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function TableOfContentsComponent({ props }: TableOfContentsComponentProps) {
  const title = (props.title as string) || "Table of Contents"
  const entries =
    (props.entries as { title: string; level?: number }[] | undefined) ??
    (props.items as string[] | undefined)?.map((t) => ({ title: t, level: 1 })) ??
    []

  return (
    <nav className="report-toc rounded-lg border px-5 py-4 print:break-after-page">
      <h2 className="genui-report-toc-heading mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
        <List className="h-4 w-4" aria-hidden />
        {title}
      </h2>
      <ol className="space-y-1.5 text-sm">
        {entries.map((entry, idx) => {
          const level = entry.level ?? 1
          const indent = level === 1 ? "" : level === 2 ? "ml-4" : "ml-8"
          return (
            <li key={idx} className={indent}>
              <span className="genui-report-prose">{entry.title}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
