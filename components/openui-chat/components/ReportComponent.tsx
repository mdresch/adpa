"use client"

import type { OpenUIChatJson } from "@/lib/openui/library"
import { FileText } from "lucide-react"
import type { ReactNode } from "react"

interface ReportComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
  sectionContent?: ReactNode[]
}

export function ReportComponent({ props, sectionContent }: ReportComponentProps) {
  const title = (props.title as string) || "Document Report"
  const subtitle = props.subtitle as string | undefined
  const meta = (props.meta as Record<string, string> | undefined) ?? {}
  const sections = sectionContent ?? []

  return (
    <article className="report-document">
      <header className="mb-10 border-b border-slate-200 pb-8">
        <div className="flex items-start gap-3">
          <FileText className="mt-1 h-6 w-6 shrink-0 text-slate-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              {title}
            </h1>
            {subtitle ? <p className="mt-2 text-base text-slate-600">{subtitle}</p> : null}
          </div>
        </div>
        {Object.keys(meta).length > 0 ? (
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 md:grid-cols-4">
            {Object.entries(meta).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{key}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </header>

      <div className="space-y-12">
        {sections.map((section, idx) => (
          <div
            key={idx}
            className={idx > 0 ? "border-t border-slate-100 pt-10" : undefined}
          >
            {section}
          </div>
        ))}
      </div>

      <footer className="report-footer mt-16 hidden border-t border-slate-200 pt-4 text-center text-xs text-slate-400 print:block">
        {title}
        {subtitle ? ` · ${subtitle}` : ""}
      </footer>
    </article>
  )
}
