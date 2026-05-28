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

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
                return <EntityPill type={entityType} data={entityData} />
              } catch (e) {
                // If it fails to parse as JSON, just render it as normal text below
                console.warn("Failed to parse inline entity JSON", e)
              }
            }
            
            // Standard paragraph rendering
            return <p className="mb-4" {...props}>{children}</p>
          },
          code({ inline, className: codeClassName, children, ...props }: any) {
            const code = String(children).replace(/\n$/, "")
            const match = /language-([\w-]+)/i.exec(codeClassName || "")

            if (!inline && isMermaidLanguage(codeClassName)) {
              return <MermaidDiagram code={code} />
            }

            return !inline && match ? (
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
            ) : (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            )
          },
          table({ children }: any) {
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  {children}
                </table>
              </div>
            )
          },
          th({ children }: any) {
            return (
              <th className="border border-gray-300 px-4 py-2 bg-gray-50 font-semibold">
                {children}
              </th>
            )
          },
          td({ children }: any) {
            return (
              <td className="border border-gray-300 px-4 py-2">
                {children}
              </td>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}