/**
 * Enhanced Entity Highlighter Component
 * Highlights specific text in document content based on entity location data
 * Supports character offsets, line numbers, and snippet highlighting with improved accuracy
 */

import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Badge } from '@/components/ui/badge'
import './EntityHighlighter.css'

interface EntityHighlightData {
  entityName: string
  entityType: string
  highlightStart?: number
  highlightEnd?: number
  highlightLineStart?: number
  highlightLineEnd?: number
  highlightSnippet?: string
  highlightTag?: string
}

interface EntityHighlighterProps {
  content: string
  entityHighlight: EntityHighlightData | null
  children: (highlightedContent: string) => React.ReactNode
}

export const EntityHighlighter: React.FC<EntityHighlighterProps> = ({
  content,
  entityHighlight,
  children
}) => {
  const highlightRef = useRef<HTMLDivElement>(null)

  // Memoize highlighting logic to prevent unnecessary re-renders
  const getHighlightedContent = useCallback(() => {
    if (!entityHighlight || !content) {
      return content
    }

    const {
      highlightStart,
      highlightEnd,
      highlightLineStart,
      highlightLineEnd,
      highlightSnippet,
      highlightTag
    } = entityHighlight

    try {
      // Priority 1: Use character offsets (most precise)
      if (highlightStart !== undefined && highlightEnd !== undefined) {
        return highlightByCharacterOffsets(content, highlightStart, highlightEnd)
      }

      // Priority 2: Use line numbers (good for multi-line entities)
      if (highlightLineStart !== undefined && highlightLineEnd !== undefined) {
        return highlightByLineNumbers(content, highlightLineStart, highlightLineEnd)
      }

      // Priority 3: Use exact snippet matching
      if (highlightSnippet && highlightSnippet.trim().length > 0) {
        return highlightBySnippet(content, highlightSnippet)
      }

      // Priority 4: Use tag-based matching
      if (highlightTag && highlightTag.trim().length > 0) {
        return highlightByTag(content, highlightTag)
      }

      // Priority 5: Fallback to entity name matching
      if (entityHighlight.entityName && entityHighlight.entityName.trim().length > 0) {
        return highlightByEntityName(content, entityHighlight.entityName)
      }

    } catch (error) {
      console.error('[EntityHighlighter] Error during highlighting:', error)
      return content
    }

    return content
  }, [content, entityHighlight])

  // Enhanced highlighting by character offsets with validation
  const highlightByCharacterOffsets = (content: string, start: number, end: number): string => {
    // Validate bounds
    if (start < 0 || end > content.length || start >= end) {
      console.warn('[EntityHighlighter] Invalid character offsets:', { start, end, contentLength: content.length })
      return content
    }

    const before = content.substring(0, start)
    const highlighted = content.substring(start, end)
    const after = content.substring(end)
    
    return `${before}<mark class="entity-highlight bg-yellow-200 px-1 rounded border border-yellow-400 font-medium">${escapeHtml(highlighted)}</mark>${after}`
  }

  // Enhanced highlighting by line numbers with better handling
  const highlightByLineNumbers = (content: string, startLine: number, endLine: number): string => {
    const lines = content.split('\n')
    
    // Validate line bounds
    if (startLine < 1 || endLine > lines.length || startLine > endLine) {
      console.warn('[EntityHighlighter] Invalid line numbers:', { startLine, endLine, totalLines: lines.length })
      return content
    }

    const highlightedLines = lines.map((line, index) => {
      const lineNumber = index + 1
      if (lineNumber >= startLine && lineNumber <= endLine) {
        return `<mark class="entity-highlight bg-yellow-200 px-1 rounded border border-yellow-400 font-medium">${escapeHtml(line)}</mark>`
      }
      return line
    })
    
    return highlightedLines.join('\n')
  }

  // Enhanced snippet highlighting with multiple match handling
  const highlightBySnippet = (content: string, snippet: string): string => {
    if (!snippet || snippet.trim().length === 0) return content

    const escapedSnippet = escapeRegex(snippet)
    const regex = new RegExp(`(${escapedSnippet})`, 'gi')
    
    return content.replace(regex, (match, p1, offset) => {
      return `<mark class="entity-highlight bg-yellow-200 px-1 rounded border border-yellow-400 font-medium">${escapeHtml(p1)}</mark>`
    })
  }

  // Enhanced tag-based highlighting with better pattern matching
  const highlightByTag = (content: string, tag: string): string => {
    if (!tag || tag.trim().length === 0) return content

    // Try different tag patterns
    const patterns = [
      `(${tag}\\s+(.+?)(?=\\n|$))`,           // Tag followed by content
      `(#+\\s*${tag}.*?(?=\\n|$))`,           // Header with tag
      `(\\*\\*${tag}\\*\\*.*?(?=\\n|$))`,     // Bold tag
      `(${tag}:\\s*(.+?)(?=\\n|$))`,          // Tag with colon
    ]

    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern, 'gim')
        const hasMatches = regex.test(content)
        if (hasMatches) {
          regex.lastIndex = 0 // Reset for actual replacement
          return content.replace(regex, (match, p1) => {
            return `<mark class="entity-highlight bg-yellow-200 px-1 rounded border border-yellow-400 font-medium">${escapeHtml(p1)}</mark>`
          })
        }
      } catch (error) {
        console.warn('[EntityHighlighter] Invalid regex pattern:', pattern, error)
      }
    }

    return content
  }

  // Enhanced entity name matching with fuzzy matching fallback
  const highlightByEntityName = (content: string, entityName: string): string => {
    if (!entityName || entityName.trim().length === 0) return content

    // Try exact match first
    const escapedName = escapeRegex(entityName)
    const exactRegex = new RegExp(`(${escapedName})`, 'gi')
    
    if (exactRegex.test(content)) {
      exactRegex.lastIndex = 0
      return content.replace(exactRegex, (match, p1) => {
        return `<mark class="entity-highlight bg-yellow-200 px-1 rounded border border-yellow-400 font-medium">${escapeHtml(p1)}</mark>`
      })
    }

    // Try partial matches for longer names
    if (entityName.length > 10) {
      const words = entityName.split(/\s+/).filter(word => word.length > 3)
      for (const word of words) {
        const escapedWord = escapeRegex(word)
        const wordRegex = new RegExp(`\\b(${escapedWord})\\b`, 'gi')
        if (wordRegex.test(content)) {
          wordRegex.lastIndex = 0
          return content.replace(wordRegex, (match, p1) => {
            return `<mark class="entity-highlight bg-yellow-200 px-1 rounded border border-yellow-400 font-medium">${escapeHtml(p1)}</mark>`
          })
        }
      }
    }

    return content
  }

  // Utility functions
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  const escapeRegex = (text: string): string => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // Enhanced scroll to highlighted content with better error handling
  useEffect(() => {
    if (entityHighlight && highlightRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        try {
          const highlightedElement = highlightRef.current?.querySelector('.entity-highlight')
          if (highlightedElement) {
            // Scroll to the highlighted element with smooth behavior
            highlightedElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            })

            // Add a brief pulse effect to draw attention
            highlightedElement.classList.add('entity-highlight-pulse')
            setTimeout(() => {
              highlightedElement.classList.remove('entity-highlight-pulse')
            }, 2000)
          }
        } catch (error) {
          console.error('[EntityHighlighter] Error scrolling to highlighted element:', error)
        }
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [entityHighlight])

  const highlightedContent = useMemo(() => getHighlightedContent(), [getHighlightedContent])

  // Enhanced entity info banner with more details
  const EntityInfoBanner = () => {
    if (!entityHighlight) return null

    const { entityName, entityType, highlightStart, highlightEnd, highlightLineStart, highlightLineEnd } = entityHighlight

    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <div>
              <span className="text-sm font-medium text-blue-800">
                Highlighting Entity
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-blue-600 font-medium">
                  "{entityName}"
                </span>
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                  {entityType}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-600 font-medium">
              Location Details
            </div>
            <div className="text-xs text-blue-500">
              {highlightStart !== undefined && highlightEnd !== undefined 
                ? `Chars: ${highlightStart}-${highlightEnd}`
                : highlightLineStart !== undefined && highlightLineEnd !== undefined
                ? `Lines: ${highlightLineStart}-${highlightLineEnd}`
                : 'Snippet matched'
              }
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={highlightRef} className="entity-highlighter-container">
      <EntityInfoBanner />
      {children(highlightedContent)}
    </div>
  )
}
