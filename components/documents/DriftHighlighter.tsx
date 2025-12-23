/**
 * Drift Highlighter Component
 * Highlights sections of document content that have detected drift
 */

'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AlertTriangle, Check, Edit, X } from '@/components/ui/icons-shim'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'

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
  onEnhancedContentReady?: (enhancedContent: string) => void
  onAcceptDrift?: (driftId: string) => void
  onEditDocument?: () => void
  onRemoveDrift?: (driftId: string) => void
}

export function DriftHighlighter({ 
  content, 
  drifts, 
  showHighlights, 
  onEnhancedContentReady,
  onAcceptDrift,
  onEditDocument,
  onRemoveDrift
}: DriftHighlighterProps) {
  // Track ID usage to ensure uniqueness
  const idCountsRef = React.useRef(new Map<string, number>())
  
  // Track mounted state to prevent hydration errors
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  // Reset ID counts when content changes
  React.useEffect(() => {
    idCountsRef.current = new Map<string, number>()
  }, [content, showHighlights])
  
  // Inject drift markers into content if highlighting is enabled
  const enhancedContent = React.useMemo(() => {
    if (!showHighlights || drifts.length === 0) return content
    
    let updatedContent = content
    
    // Sort drifts by severity (critical/high first)
    const sortedDrifts = [...drifts].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.drift_severity] - severityOrder[b.drift_severity]
    })
    
    // Process each drift and find where to inject markers
    sortedDrifts.forEach((drift, index) => {
      const severityEmoji = getSeverityEmoji(drift.drift_severity)
      const headingLevel = (drift.drift_severity === 'critical' || drift.drift_severity === 'high') ? '####' : '#####'
      const headingClass = (drift.drift_severity === 'critical' || drift.drift_severity === 'high') ? 'drift-marker-high' : 'drift-marker-low'
      
      // Extract first sentence or first 80 chars of description
      const shortDesc = drift.drift_description.split('.')[0].substring(0, 80)
      
      // Create drift marker heading with unique identifier
      const driftId = drift.id || `drift-${index}`
      const driftMarker = `\n\n${headingLevel} ${severityEmoji} DRIFT ${index + 1}: ${shortDesc}${drift.drift_description.length > 80 ? '...' : ''} [DRIFT_ID:${driftId}]\n\n` +
        `**Type:** ${drift.detection_type.replace(/_/g, ' ').toUpperCase()} | ` +
        `**Severity:** ${drift.drift_severity.toUpperCase()}  \n` +
        `**Description:** ${drift.drift_description}  \n` +
        (drift.drift_impact && typeof drift.drift_impact === 'string' 
          ? `**Impact:** ${drift.drift_impact}  \n` 
          : '') +
        `\n---\n`
      
      // Try to find relevant section in content to inject marker
      // For now, inject at logical positions (after H2 or H3 headings that match keywords)
      const keywords = extractKeywords(drift.drift_description)
      const insertPosition = findInsertPosition(updatedContent, keywords, drift.detection_type)
      
      if (insertPosition > 0) {
        updatedContent = updatedContent.slice(0, insertPosition) + driftMarker + updatedContent.slice(insertPosition)
      } else {
        // Fallback: Add at the end of document
        updatedContent += '\n\n' + driftMarker
      }
    })
    
    return updatedContent
  }, [content, drifts, showHighlights])
  
  // Notify parent component when enhanced content is ready (for ToC regeneration)
  // Use ref to prevent infinite loops
  const lastEnhancedContentRef = React.useRef<string>('')
  
  React.useEffect(() => {
    if (onEnhancedContentReady && enhancedContent !== lastEnhancedContentRef.current) {
      lastEnhancedContentRef.current = enhancedContent
      onEnhancedContentReady(enhancedContent)
    }
  }, [enhancedContent, onEnhancedContentReady])
  
  // Generate unique ID (handles duplicates by adding suffix)
  function generateUniqueId(baseId: string): string {
    const count = idCountsRef.current.get(baseId) || 0
    idCountsRef.current.set(baseId, count + 1)
    return count > 0 ? `${baseId}-${count}` : baseId
  }
  
  function getSeverityEmoji(severity: string): string {
    switch(severity) {
      case 'critical': return '🔴'
      case 'high': return '🟠'
      case 'medium': return '🟡'
      case 'low': return '🔵'
      default: return '⚪'
    }
  }
  
  function extractKeywords(description: string): string[] {
    // Extract meaningful words (remove common words)
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from']
    const words = description.toLowerCase().match(/\b\w{4,}\b/g) || []
    return words.filter(w => !commonWords.includes(w)).slice(0, 5)
  }
  
  function findInsertPosition(content: string, keywords: string[], driftType: string): number {
    // Try to find a relevant section based on drift type and keywords
    const lines = content.split('\n')
    let bestMatch = -1
    let bestScore = 0
    
    // Map drift types to likely section names
    const sectionMap: Record<string, string[]> = {
      'timeline_drift': ['schedule', 'timeline', 'milestone', 'duration', 'date'],
      'cost_drift': ['cost', 'budget', 'financial', 'expense', 'funding'],
      'scope_drift': ['scope', 'objective', 'deliverable', 'requirement'],
      'resource_drift': ['resource', 'team', 'staff', 'personnel', 'role'],
      'technical_drift': ['technical', 'technology', 'architecture', 'infrastructure'],
      'success_criteria_drift': ['success', 'kpi', 'metric', 'criteria', 'goal']
    }
    
    const relevantSections = sectionMap[driftType] || []
    const allKeywords = [...keywords, ...relevantSections]
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      
      // Check if line is a heading (H2 or H3)
      if (line.match(/^#{2,3}\s/)) {
        let score = 0
        
        // Score based on keyword matches
        allKeywords.forEach(keyword => {
          if (line.includes(keyword)) score += 2
        })
        
        if (score > bestScore) {
          bestScore = score
          // Insert after the heading line
          bestMatch = lines.slice(0, i + 1).join('\n').length
        }
      }
    }
    
    return bestMatch
  }
  
  return (
    <div className="markdown-content-wrapper">
      {mounted && (
        <style dangerouslySetInnerHTML={{ __html: `
        .markdown-content-wrapper {
          max-width: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.75;
          color: rgb(55, 65, 81);
        }
        
        .dark .markdown-content-wrapper {
          color: rgb(229, 231, 235);
        }

        /* Enhanced Typography */
        .markdown-content-wrapper h1 {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1.2;
          margin-top: 2rem;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 3px solid rgb(229, 231, 235);
          color: rgb(17, 24, 39);
          letter-spacing: -0.025em;
        }
        
        .dark .markdown-content-wrapper h1 {
          border-bottom-color: rgb(55, 65, 81);
          color: rgb(243, 244, 246);
        }

        .markdown-content-wrapper h2 {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.3;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid rgb(229, 231, 235);
          color: rgb(31, 41, 55);
          letter-spacing: -0.02em;
        }
        
        .dark .markdown-content-wrapper h2 {
          border-bottom-color: rgb(55, 65, 81);
          color: rgb(229, 231, 235);
        }

        .markdown-content-wrapper h3 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: rgb(55, 65, 81);
        }
        
        .dark .markdown-content-wrapper h3 {
          color: rgb(209, 213, 219);
        }

        .markdown-content-wrapper h4 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.5;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: rgb(75, 85, 99);
        }
        
        .dark .markdown-content-wrapper h4 {
          color: rgb(156, 163, 175);
        }

        .markdown-content-wrapper h5 {
          font-size: 1.125rem;
          font-weight: 600;
          line-height: 1.5;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: rgb(107, 114, 128);
        }
        
        .dark .markdown-content-wrapper h5 {
          color: rgb(156, 163, 175);
        }

        .markdown-content-wrapper h6 {
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.5;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: rgb(107, 114, 128);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .dark .markdown-content-wrapper h6 {
          color: rgb(156, 163, 175);
        }

        /* Paragraphs */
        .markdown-content-wrapper p {
          margin-top: 1rem;
          margin-bottom: 1rem;
          line-height: 1.75;
          font-size: 1.0625rem;
        }

        /* Links */
        .markdown-content-wrapper a {
          color: rgb(37, 99, 235);
          text-decoration: none;
          font-weight: 500;
          border-bottom: 1px solid transparent;
          transition: all 0.2s ease;
        }
        
        .dark .markdown-content-wrapper a {
          color: rgb(96, 165, 250);
        }

        .markdown-content-wrapper a:hover {
          color: rgb(29, 78, 216);
          border-bottom-color: rgb(37, 99, 235);
        }
        
        .dark .markdown-content-wrapper a:hover {
          color: rgb(147, 197, 253);
          border-bottom-color: rgb(96, 165, 250);
        }

        /* Lists */
        .markdown-content-wrapper ul,
        .markdown-content-wrapper ol {
          margin-top: 1rem;
          margin-bottom: 1rem;
          padding-left: 1.75rem;
        }

        .markdown-content-wrapper li {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.75;
        }

        .markdown-content-wrapper ul li {
          list-style-type: disc;
        }

        .markdown-content-wrapper ol li {
          list-style-type: decimal;
        }

        .markdown-content-wrapper li::marker {
          color: rgb(107, 114, 128);
        }

        /* Nested Lists */
        .markdown-content-wrapper ul ul,
        .markdown-content-wrapper ol ol,
        .markdown-content-wrapper ul ol,
        .markdown-content-wrapper ol ul {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        /* Strong and Emphasis */
        .markdown-content-wrapper strong {
          font-weight: 700;
          color: rgb(17, 24, 39);
        }
        
        .dark .markdown-content-wrapper strong {
          color: rgb(243, 244, 246);
        }

        .markdown-content-wrapper em {
          font-style: italic;
          color: rgb(55, 65, 81);
        }
        
        .dark .markdown-content-wrapper em {
          color: rgb(209, 213, 219);
        }

        /* Code Blocks */
        .markdown-content-wrapper pre {
          background-color: rgb(17, 24, 39);
          border-radius: 0.5rem;
          padding: 1.25rem;
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
          overflow-x: auto;
          font-size: 0.875rem;
          line-height: 1.75;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .markdown-content-wrapper pre code {
          background-color: transparent;
          padding: 0;
          border-radius: 0;
          color: rgb(243, 244, 246);
          font-size: inherit;
        }

        /* Inline Code */
        .markdown-content-wrapper code {
          background-color: rgb(243, 244, 246);
          color: rgb(220, 38, 38);
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
          font-weight: 500;
        }
        
        .dark .markdown-content-wrapper code {
          background-color: rgb(31, 41, 55);
          color: rgb(248, 113, 113);
        }

        /* Blockquotes */
        .markdown-content-wrapper blockquote {
          border-left: 4px solid rgb(59, 130, 246);
          padding-left: 1.25rem;
          margin-left: 0;
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
          font-style: italic;
          color: rgb(75, 85, 99);
          background-color: rgb(249, 250, 251);
          padding-top: 1rem;
          padding-bottom: 1rem;
          padding-right: 1rem;
          border-radius: 0 0.375rem 0.375rem 0;
        }
        
        .dark .markdown-content-wrapper blockquote {
          border-left-color: rgb(96, 165, 250);
          color: rgb(156, 163, 175);
          background-color: rgb(31, 41, 55);
        }

        .markdown-content-wrapper blockquote p {
          margin: 0;
        }

        /* Tables */
        .markdown-content-wrapper table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
          font-size: 0.9375rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .markdown-content-wrapper thead {
          background-color: rgb(59, 130, 246);
          color: white;
        }
        
        .dark .markdown-content-wrapper thead {
          background-color: rgb(37, 99, 235);
        }

        .markdown-content-wrapper th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .markdown-content-wrapper td {
          padding: 0.75rem 1rem;
          border-top: 1px solid rgb(229, 231, 235);
        }
        
        .dark .markdown-content-wrapper td {
          border-top-color: rgb(55, 65, 81);
        }

        .markdown-content-wrapper tbody tr {
          transition: background-color 0.15s ease;
        }

        .markdown-content-wrapper tbody tr:hover {
          background-color: rgb(249, 250, 251);
        }
        
        .dark .markdown-content-wrapper tbody tr:hover {
          background-color: rgb(31, 41, 55);
        }

        .markdown-content-wrapper tbody tr:nth-child(even) {
          background-color: rgb(249, 250, 251);
        }
        
        .dark .markdown-content-wrapper tbody tr:nth-child(even) {
          background-color: rgb(31, 41, 55);
        }

        /* Horizontal Rules */
        .markdown-content-wrapper hr {
          border: none;
          border-top: 2px solid rgb(229, 231, 235);
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        
        .dark .markdown-content-wrapper hr {
          border-top-color: rgb(55, 65, 81);
        }

        /* Images */
        .markdown-content-wrapper img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        /* Task Lists (GFM) */
        .markdown-content-wrapper input[type="checkbox"] {
          margin-right: 0.5rem;
          width: 1rem;
          height: 1rem;
          cursor: pointer;
        }

        /* First paragraph after heading */
        .markdown-content-wrapper h1 + p,
        .markdown-content-wrapper h2 + p,
        .markdown-content-wrapper h3 + p {
          font-size: 1.125rem;
          color: rgb(75, 85, 99);
          margin-top: 0.5rem;
        }
        
        .dark .markdown-content-wrapper h1 + p,
        .dark .markdown-content-wrapper h2 + p,
        .dark .markdown-content-wrapper h3 + p {
          color: rgb(156, 163, 175);
        }
      ` }} />
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            
            if (!inline && language) {
              return (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={language}
                  PreTag="div"
                  className="rounded-lg"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              )
            }
            
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
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
          h4: ({ children, ...props }: any) => {
            const text = Array.isArray(children) 
              ? children.map((c: any) => typeof c === 'string' ? c : (c as any)?.props?.children || '').join(' ')
              : String(children)
            const cleanText = text.replace(/\*/g, '').trim()
            
            // Check if this is a drift marker (contains emoji and "DRIFT")
            const isDriftMarker = cleanText.includes('DRIFT') && /[🔴🟠🟡🔵⚪]/.test(cleanText)
            
            // Extract drift ID from the text
            const driftIdMatch = cleanText.match(/\[DRIFT_ID:([^\]]+)\]/)
            const driftId = driftIdMatch ? driftIdMatch[1] : null
            const driftData = driftId ? drifts.find(d => d.id === driftId) : null
            
            // Use drift- prefix ONLY for drift markers, otherwise use heading- prefix
            const idPrefix = isDriftMarker ? 'drift-' : 'heading-'
            const id = `${idPrefix}${cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            
            if (isDriftMarker && driftData) {
              // High severity drift marker (Critical/High) with action buttons
              const displayText = cleanText.replace(/\[DRIFT_ID:[^\]]+\]/, '').trim()
              return (
                <div className="mb-4 mt-6">
                  <h4 
                    id={id} 
                    className="text-xl font-bold mb-3 p-4 rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 scroll-mt-24 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {displayText}
                  </h4>
                  <div className="flex flex-wrap gap-2 ml-4 mb-4">
                    {onAcceptDrift && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onAcceptDrift(driftId)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept Drift
                      </Button>
                    )}
                    {onEditDocument && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onEditDocument}
                        className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Document
                      </Button>
                    )}
                    {onRemoveDrift && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRemoveDrift(driftId)}
                        className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remove Drift
                      </Button>
                    )}
                  </div>
                </div>
              )
            }
            
            return (
              <h4 id={id} className="text-xl font-semibold mb-2 mt-4 text-gray-800 dark:text-gray-200 scroll-mt-24">
                {children}
              </h4>
            )
          },
          h5: ({ children, ...props }: any) => {
            const text = Array.isArray(children) 
              ? children.map((c: any) => typeof c === 'string' ? c : (c as any)?.props?.children || '').join(' ')
              : String(children)
            const cleanText = text.replace(/\*/g, '').trim()
            
            // Check if this is a drift marker
            const isDriftMarker = cleanText.includes('DRIFT') && /[🔴🟠🟡🔵⚪]/.test(cleanText)
            
            // Extract drift ID from the text
            const driftIdMatch = cleanText.match(/\[DRIFT_ID:([^\]]+)\]/)
            const driftId = driftIdMatch ? driftIdMatch[1] : null
            const driftData = driftId ? drifts.find(d => d.id === driftId) : null
            
            // Use drift- prefix ONLY for drift markers, otherwise use heading- prefix
            const idPrefix = isDriftMarker ? 'drift-' : 'heading-'
            const id = `${idPrefix}${cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            
            if (isDriftMarker && driftData) {
              // Medium/Low severity drift marker with action buttons
              const displayText = cleanText.replace(/\[DRIFT_ID:[^\]]+\]/, '').trim()
              return (
                <div className="mb-4 mt-4">
                  <h5 
                    id={id} 
                    className="text-lg font-semibold mb-3 p-3 rounded-lg border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 scroll-mt-24 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {displayText}
                  </h5>
                  <div className="flex flex-wrap gap-2 ml-4 mb-4">
                    {onAcceptDrift && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onAcceptDrift(driftId)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept Drift
                      </Button>
                    )}
                    {onEditDocument && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onEditDocument}
                        className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Document
                      </Button>
                    )}
                    {onRemoveDrift && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRemoveDrift(driftId)}
                        className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remove Drift
                      </Button>
                    )}
                  </div>
                </div>
              )
            }
            
            return (
              <h5 id={id} className="text-lg font-medium mb-2 mt-3 text-gray-700 dark:text-gray-300 scroll-mt-24">
                {children}
              </h5>
            )
          },
          h6: ({ children, ...props }: any) => {
            const text = Array.isArray(children) 
              ? children.map((c: any) => typeof c === 'string' ? c : (c as any)?.props?.children || '').join(' ')
              : String(children)
            const cleanText = text.replace(/\*/g, '').trim()
            const id = `heading-${cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            
            return (
              <h6 id={id} className="text-base font-semibold mb-2 mt-3 text-gray-600 dark:text-gray-400 scroll-mt-24 uppercase tracking-wide">
                {children}
              </h6>
            )
          },
          p: ({ children, ...props }: any) => (
            <p className="my-4 leading-relaxed text-base" {...props}>
              {children}
            </p>
          ),
          a: ({ href, children, ...props }: any) => (
            <a 
              href={href} 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors underline-offset-2 hover:underline" 
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              {...props}
            >
              {children}
            </a>
          ),
          ul: ({ children, ...props }: any) => (
            <ul className="my-4 ml-6 list-disc space-y-2" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }: any) => (
            <ol className="my-4 ml-6 list-decimal space-y-2" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }: any) => (
            <li className="my-1 leading-relaxed" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }: any) => (
            <blockquote className="my-6 pl-4 border-l-4 border-blue-500 dark:border-blue-400 italic text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 py-3 pr-4 rounded-r" {...props}>
              {children}
            </blockquote>
          ),
          hr: ({ ...props }: any) => (
            <hr className="my-8 border-t-2 border-gray-200 dark:border-gray-700" {...props} />
          ),
          table: ({ children, ...props }: any) => (
            <div className="my-6 overflow-x-auto rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }: any) => (
            <thead className="bg-blue-600 dark:bg-blue-700" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }: any) => (
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" {...props}>
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }: any) => (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" {...props}>
              {children}
            </tr>
          ),
          th: ({ children, ...props }: any) => (
            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }: any) => (
            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300" {...props}>
              {children}
            </td>
          ),
          img: ({ src, alt, ...props }: any) => (
            <img 
              src={src} 
              alt={alt} 
              className="my-6 rounded-lg shadow-md max-w-full h-auto" 
              {...props}
            />
          ),
        }}
      >
        {enhancedContent}
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
