/**
 * Drift Highlighter Component
 * Highlights sections of document content that have detected drift
 */

'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AlertTriangle } from '@/components/ui/icons-shim'
import { Badge } from '@/components/ui/badge'

interface DriftData {
  id: string
  detection_type: string
  drift_severity: 'low' | 'medium' | 'high' | 'critical'
  drift_description: string
  drift_impact: any
}

interface DriftHighlighterProps {
  content: string
  drifts: DriftData[]
  showHighlights: boolean
}

export function DriftHighlighter({ content, drifts, showHighlights }: DriftHighlighterProps) {
  
  return (
    <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:pb-2 prose-h1:border-b prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-6 prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-5 prose-p:mb-4 prose-p:leading-7 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:text-sm prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-ul:my-4 prose-ol:my-4 prose-li:my-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }: any) => {
            const text = Array.isArray(children) 
              ? children.map((c: any) => typeof c === 'string' ? c : (c as any)?.props?.children || '').join(' ')
              : String(children)
            const cleanText = text.replace(/\*/g, '').trim()
            const id = `heading-${cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            
            // Check if this heading has drift
            const hasDrift = showHighlights && drifts.some(d => 
              d.drift_description.toLowerCase().includes(cleanText.toLowerCase())
            )
            
            return (
              <h1 id={id} className="text-4xl font-bold mb-6 mt-8 pb-2 border-b border-gray-200 dark:border-gray-700 scroll-mt-24 relative">
                {children}
                {hasDrift && (
                  <Badge variant="destructive" className="ml-3 align-middle">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Drift
                  </Badge>
                )}
              </h1>
            )
          },
          h2: ({ children, ...props }: any) => {
            const text = Array.isArray(children) 
              ? children.map((c: any) => typeof c === 'string' ? c : (c as any)?.props?.children || '').join(' ')
              : String(children)
            const cleanText = text.replace(/\*/g, '').trim()
            const id = `heading-${cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            
            const hasDrift = showHighlights && drifts.some(d => 
              d.drift_description.toLowerCase().includes(cleanText.toLowerCase())
            )
            
            return (
              <h2 id={id} className="text-3xl font-bold mb-4 mt-6 text-gray-900 dark:text-gray-100 scroll-mt-24">
                {children}
                {hasDrift && (
                  <Badge variant="secondary" className="ml-3 align-middle text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Drift
                  </Badge>
                )}
              </h2>
            )
          },
          h3: ({ children, ...props }: any) => {
            const text = Array.isArray(children) 
              ? children.map((c: any) => typeof c === 'string' ? c : (c as any)?.props?.children || '').join(' ')
              : String(children)
            const cleanText = text.replace(/\*/g, '').trim()
            const id = `heading-${cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            
            return (
              <h3 id={id} className="text-2xl font-semibold mb-3 mt-5 text-gray-800 dark:text-gray-200 scroll-mt-24">
                {children}
              </h3>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
      
      {/* Drift Legend */}
      {showHighlights && drifts.length > 0 && (
        <div className="mt-8 p-4 border-2 border-orange-200 bg-orange-50 rounded-lg not-prose">
          <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Drift Highlighting Legend
          </h4>
          <div className="space-y-2 text-sm">
            <p className="text-orange-800">
              {drifts.length} drift{drifts.length > 1 ? 's' : ''} detected in this document:
            </p>
            {drifts.map((drift, idx) => (
              <div key={drift.id} className="flex items-center gap-2 p-2 bg-white border border-orange-200 rounded">
                <Badge variant={drift.drift_severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                  {drift.drift_severity}
                </Badge>
                <span className="text-xs">{drift.detection_type.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
