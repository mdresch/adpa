/**
 * Drift Highlighter Component
 * Highlights sections of document content that have detected drift
 */

'use client'

import React from 'react'
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
  onEnhancedContentReady?: (enhancedContent: string) => void
}

export function DriftHighlighter({ content, drifts, showHighlights, onEnhancedContentReady }: DriftHighlighterProps) {
  // Track ID usage to ensure uniqueness
  const idCountsRef = React.useRef(new Map<string, number>())
  
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
      
      // Create drift marker heading
      const driftMarker = `\n\n${headingLevel} ${severityEmoji} DRIFT ${index + 1}: ${shortDesc}${drift.drift_description.length > 80 ? '...' : ''}\n\n` +
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
    <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:pb-2 prose-h1:border-b prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-6 prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-5 prose-h4:text-xl prose-h4:mb-3 prose-h4:mt-4 prose-h5:text-lg prose-h5:mb-2 prose-h5:mt-3 prose-p:mb-4 prose-p:leading-7 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:text-sm prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-ul:my-4 prose-ol:my-4 prose-li:my-1">
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
          h4: ({ children, ...props }: any) => {
            const text = Array.isArray(children) 
              ? children.map((c: any) => typeof c === 'string' ? c : (c as any)?.props?.children || '').join(' ')
              : String(children)
            const cleanText = text.replace(/\*/g, '').trim()
            
            // Check if this is a drift marker (contains emoji and "DRIFT")
            const isDriftMarker = cleanText.includes('DRIFT') && /[🔴🟠🟡🔵⚪]/.test(cleanText)
            
            // Use drift- prefix ONLY for drift markers, otherwise use heading- prefix
            const idPrefix = isDriftMarker ? 'drift-' : 'heading-'
            const id = `${idPrefix}${cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            
            if (isDriftMarker) {
              // High severity drift marker (Critical/High)
              return (
                <h4 
                  id={id} 
                  className="text-xl font-bold mb-3 mt-6 p-4 rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 scroll-mt-24 shadow-sm hover:shadow-md transition-shadow"
                >
                  {children}
                </h4>
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
            
            // Use drift- prefix ONLY for drift markers, otherwise use heading- prefix
            const idPrefix = isDriftMarker ? 'drift-' : 'heading-'
            const id = `${idPrefix}${cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            
            if (isDriftMarker) {
              // Medium/Low severity drift marker
              return (
                <h5 
                  id={id} 
                  className="text-lg font-semibold mb-2 mt-4 p-3 rounded-lg border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 scroll-mt-24 shadow-sm hover:shadow-md transition-shadow"
                >
                  {children}
                </h5>
              )
            }
            
            return (
              <h5 id={id} className="text-lg font-medium mb-2 mt-3 text-gray-700 dark:text-gray-300 scroll-mt-24">
                {children}
              </h5>
            )
          },
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
