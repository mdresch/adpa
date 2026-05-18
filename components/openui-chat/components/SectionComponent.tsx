"use client"

import type { OpenUIChatJson } from "@/lib/openui/library"
import type { ReactNode } from "react"

interface SectionComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
  content?: ReactNode
}

export function SectionComponent({ props, content }: SectionComponentProps) {
  const heading = (props.heading as string) || "Section"
  const intro = props.intro as string | undefined
  const level = (props.level as number) === 3 ? 3 : (props.level as number) === 2 ? 2 : 1

  const HeadingTag = level === 3 ? "h4" : level === 2 ? "h3" : "h2"
  const headingClass =
    level === 3
      ? "text-base font-semibold text-slate-800"
      : level === 2
        ? "text-lg font-semibold text-slate-900 border-l-2 border-slate-400 pl-3"
        : "text-xl font-semibold tracking-tight text-slate-900 border-l-4 border-slate-800 pl-4"

  return (
    <section className="report-section scroll-mt-6">
      <HeadingTag className={headingClass}>{heading}</HeadingTag>
      {intro ? (
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-600">{intro}</p>
      ) : null}
      {content ? <div className="mt-5 report-section-body">{content}</div> : null}
    </section>
  )
}
