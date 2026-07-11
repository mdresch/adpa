"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
// @ts-ignore
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
// @ts-ignore
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { MermaidDiagram } from "@/components/documents/MermaidDiagram"
import { isMermaidLanguage } from "@/lib/documents/mermaid"
import React from "react"
import { EntityPill } from "./EntityPill"

export type MarkdownRendererVariant = "default" | "typeset"

interface MarkdownRendererProps {
  content: string
  className?: string
  /**
   * "typeset" opts into shadcn/typeset styling (see .agents/skills/adpa-typeset-markdown-styling/SKILL.md):
   * the p/table/th/td overrides below stop emitting hardcoded Tailwind classes so typeset's own CSS can
   * style them, and the code/pre path (syntax highlighter, Mermaid) is marked not-typeset since those
   * already own their own rendering. Defaults to "default", which reproduces this component's original,
   * pre-typeset output exactly -- required for existing consumers (ProseComponent, TwoColumnProseComponent,
   * DynamicComponentRenderer) that render through their own prose-* classes and must stay unaffected.
   */
  variant?: MarkdownRendererVariant
}

/**
 * Pure per-variant components factory, extracted so it's unit-testable without going through
 * react-markdown's parser -- see __tests__/components/MarkdownRenderer.test.tsx.
 */
export function buildMarkdownComponents(variant: MarkdownRendererVariant = "default") {
  const isTypeset = variant === "typeset"

  return {
    p({ children, ...props }: any) {
      // Helper to recursively extract string content from React children
      // (e.g. if markdown parser split 'influence_level' into emphasis nodes)
      const extractText = (node: any): string => {
        if (typeof node === 'string') return node;
        if (typeof node === 'number') return node.toString();
        if (Array.isArray(node)) return node.map(extractText).join('');
        if (React.isValidElement(node)) return extractText((node.props as any).children);
        return '';
      };

      const textContent = extractText(children);

      // Regex to match H8 tags, allowing for multiline JSON content (using [\s\S] for dot-all)
      // and ignoring trailing backslashes used by some LLMs for line continuation.
      const match = textContent.trim().match(/^########\s+([a-zA-Z0-9_-]+):\s*([\s\S]+?)(?:\\)?$/);

      if (match) {
        const entityType = match[1]
        const jsonStr = match[2]

        try {
          const entityData = JSON.parse(jsonStr)
          const pill = <EntityPill type={entityType} data={entityData} />
          // EntityPill is a badge, not flowing prose -- keep typeset's link/paragraph
          // rules from applying to it (see SKILL.md's not-typeset pitfall).
          return isTypeset ? <span className="not-typeset">{pill}</span> : pill
        } catch (e) {
          // If it fails to parse as JSON, just render it as normal text below
          console.warn("Failed to parse inline entity JSON", e)
        }
      }

      // Standard paragraph rendering. mb-4 fights typeset's own flow-margin rules, so
      // typeset mode emits a bare <p> and lets the container's CSS own the spacing.
      return isTypeset ? <p {...props}>{children}</p> : <p className="mb-4" {...props}>{children}</p>
    },
    code({ inline, className: codeClassName, children, ...props }: any) {
      const code = String(children).replace(/\n$/, "")
      const match = /language-([\w-]+)/i.exec(codeClassName || "")

      if (!inline && isMermaidLanguage(codeClassName)) {
        const diagram = <MermaidDiagram code={code} />
        return isTypeset ? <div className="not-typeset">{diagram}</div> : diagram
      }

      if (!inline && match) {
        const highlighted = (
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            showLineNumbers={true}
            customStyle={{ margin: '1rem 0', borderRadius: '8px' }}
            {...props}
          >
            {code}
          </SyntaxHighlighter>
        )
        return isTypeset ? <div className="not-typeset">{highlighted}</div> : highlighted
      }

      return (
        <code className={codeClassName} {...props}>
          {children}
        </code>
      )
    },
    table({ children }: any) {
      if (isTypeset) {
        return <table>{children}</table>
      }
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            {children}
          </table>
        </div>
      )
    },
    th({ children }: any) {
      if (isTypeset) {
        return <th>{children}</th>
      }
      return (
        <th className="border border-gray-300 px-4 py-2 bg-gray-50 font-semibold">
          {children}
        </th>
      )
    },
    td({ children }: any) {
      if (isTypeset) {
        return <td>{children}</td>
      }
      return (
        <td className="border border-gray-300 px-4 py-2">
          {children}
        </td>
      )
    },
  }
}

export function MarkdownRenderer({ content, className, variant = "default" }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildMarkdownComponents(variant)}>
        {content}
      </ReactMarkdown>
    </div>
  )
}