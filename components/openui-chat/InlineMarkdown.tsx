"use client"

import type { ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { normalizeMarkdownContent } from "@/lib/openui/normalizeMarkdown"

type InlineMarkdownProps = {
  content: string
  className?: string
}

/**
 * Renders inline markdown (bold, italic, links, code) inside list items, table cells, headers.
 */
const inlineMarkdownComponents = {
  p: ({ children }: { children?: ReactNode }) => (
    <span className="inline">{children}</span>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 underline hover:text-indigo-800"
    >
      {children}
    </a>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-800">
      {children}
    </code>
  ),
}

export function InlineMarkdown({ content, className }: InlineMarkdownProps) {
  const normalized = normalizeMarkdownContent(content)
  if (!normalized.trim()) return null

  const markdown = (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={inlineMarkdownComponents}>
      {normalized}
    </ReactMarkdown>
  )

  if (!className) return markdown
  return <span className={className}>{markdown}</span>
}
