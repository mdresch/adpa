"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
// @ts-ignore
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
// @ts-ignore
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { MermaidDiagram } from "@/components/documents/MermaidDiagram"
import { isMermaidLanguage } from "@/lib/documents/mermaid"

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