"use client"

import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BarChart3, Clock, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DynamicDocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentTitle: string
  documentContent: string
  entities?: Array<{
    id: string
    entity_name: string
    entity_type: string
    source_text_start?: number
    source_text_end?: number
    source_line_start?: number
    source_line_end?: number
    source_context?: string
    source_snippet?: string
    source_document_id?: string
  }>
  initialScrollTo?: {
    char?: number
    line?: number
  }
}

export function DynamicDocumentViewer({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  documentContent,
  entities = [],
  initialScrollTo
}: DynamicDocumentViewerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentEntity, setCurrentEntity] = useState<string | null>(null)
  const [highlightedContent, setHighlightedContent] = useState<string>(documentContent)
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Apply dynamic highlighting when entities or content change
  useEffect(() => {
    if (documentContent && entities.length > 0) {
      const highlighted = applyDynamicHighlighting(documentContent, entities)
      setHighlightedContent(highlighted)
    } else {
      setHighlightedContent(documentContent)
    }
  }, [documentContent, entities])

  // Inject CSS for highlighting
  useEffect(() => {
    if (isOpen && !document.getElementById('dynamic-highlighting-styles')) {
      const style = document.createElement('style')
      style.id = 'dynamic-highlighting-styles'
      style.textContent = `
        /* Yellow highlighting for dynamically highlighted entities */
        .dynamic-highlight-h5, .dynamic-highlight-h6 {
          background-color: #fef08a !important;
          color: #713f12 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          display: inline-block !important;
          font-weight: 600 !important;
          font-size: 0.9em !important;
          margin: 0 2px !important;
          border: 1px solid #fbbf24 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
        }
        
        .dynamic-highlight-h5 {
          background-color: #fef08a !important; /* Light yellow */
        }
        
        .dynamic-highlight-h6 {
          background-color: #fde047 !important; /* Slightly darker yellow */
        }
        
        /* Hover effects */
        .dynamic-highlight-h5:hover, .dynamic-highlight-h6:hover {
          background-color: #facc15 !important;
          cursor: pointer !important;
          transform: scale(1.02) !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15) !important;
        }
        
        /* Current entity highlighting */
        .current-entity {
          background-color: #f59e0b !important;
          color: white !important;
          box-shadow: 0 0 0 2px #f59e0b !important;
          animation: pulse 2s infinite !important;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `
      document.head.appendChild(style)
      
      return () => {
        const existingStyle = document.getElementById('dynamic-highlighting-styles')
        if (existingStyle) {
          document.head.removeChild(existingStyle)
        }
      }
    }
  }, [isOpen])

  // Scroll to specific position
  const scrollToEntity = (entityId: string) => {
    setCurrentEntity(entityId)
    const entity = entities.find(e => e.id === entityId)
    if (!entity) return

    // Remove previous current-entity classes
    const currentElements = contentRef.current?.querySelectorAll('.current-entity')
    currentElements?.forEach(el => el.classList.remove('current-entity'))

    // Find and highlight the current entity
    const entityClass = entity.source_text_start !== undefined ? 
      `entity-${entity.source_text_start}` : 
      `entity-line-${entity.source_line_start}`
    
    const targetElement = contentRef.current?.querySelector(`.${entityClass}`)
    if (targetElement) {
      targetElement.classList.add('current-entity')
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        targetElement.classList.remove('current-entity')
      }, 3000)
    }
  }

  // Auto-scroll to initial position
  useEffect(() => {
    if (isOpen && contentRef.current && initialScrollTo) {
      const element = contentRef.current
      if (initialScrollTo.char !== undefined) {
        element.scrollTop = initialScrollTo.char
      } else if (initialScrollTo.line) {
        const lineElement = element.querySelector(`.line-${initialScrollTo.line}`)
        lineElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [isOpen, initialScrollTo])

  // Filter entities based on search
  const filteredEntities = entities.filter(entity =>
    entity.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Count highlighted entities
  const getHighlightedCount = () => {
    if (!contentRef.current) return 0
    return contentRef.current.querySelectorAll('.dynamic-highlight-h5, .dynamic-highlight-h6').length
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex items-center justify-between">
          <div className="flex-1">
            <DialogTitle className="text-lg">Source Document Viewer</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Document: {documentTitle} (ID: {documentId})
            </DialogDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Entity List */}
        {entities.length > 0 && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs">
                {filteredEntities.length} Entities Found
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getHighlightedCount()} Highlighted
              </Badge>
              <span className="text-sm text-muted-foreground">
                Click to jump to location
              </span>
            </div>
            
            {/* Search */}
            <div className="relative mb-3">
              <AlertCircle className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <ScrollArea className="h-32 w-full border rounded-md p-2">
              <div className="space-y-1">
                {filteredEntities.map((entity) => (
                  <div
                    key={entity.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors",
                      currentEntity === entity.id && "bg-yellow-100 border-yellow-300"
                    )}
                    onClick={() => scrollToEntity(entity.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{entity.entity_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {entity.entity_type} • 
                        {entity.source_line_start && ` Lines ${entity.source_line_start}-${entity.source_line_end}`}
                        {entity.source_text_start !== undefined && ` Chars ${entity.source_text_start}-${entity.source_text_end}`}
                      </div>
                      {entity.source_snippet && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Context: "{entity.source_snippet.substring(0, 50)}..."
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Document Content */}
        <ScrollArea className="flex-1 p-4">
          <div className="relative">
            <div
              ref={contentRef}
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: highlightedContent
                  // Convert markdown to basic HTML for display
                  .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                  .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                  .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                  .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                  .replace(/\*(.*)\*/gim, '<em>$1</em>')
                  .replace(/\n\n/gim, '</p><p>')
                  .replace(/\n/gim, '<br>')
                  .replace(/^(.+)$/gim, '<p>$1</p>')
              }}
            />
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            {getHighlightedCount()} entities highlighted
            {searchTerm && ` (${filteredEntities.length} filtered)`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (contentRef.current) {
                  contentRef.current.scrollTop = 0
                }
              }}
            >
              Scroll to Top
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`/documents/${documentId}`, '_blank')
              }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Open Document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Apply dynamic highlighting to document content using stored position data
 */
function applyDynamicHighlighting(
  content: string, 
  entities: Array<{
    id: string
    entity_name: string
    source_text_start?: number
    source_text_end?: number
    source_line_start?: number
    source_line_end?: number
    entity_markdown_tag?: string
  }>
): string {
  let highlightedContent = content
  
  // Sort entities by start position (reverse order to avoid position shifting)
  const sortedEntities = [...entities]
    .filter(e => e.source_text_start !== undefined && e.source_text_end !== undefined)
    .sort((a, b) => (b.source_text_start || 0) - (a.source_text_start || 0))
  
  // Apply highlighting using character positions
  sortedEntities.forEach((entity, index) => {
    if (entity.source_text_start !== undefined && entity.source_text_end !== undefined) {
      const tag = entity.entity_markdown_tag || (index % 2 === 0 ? 'h5' : 'h6')
      const className = `dynamic-highlight-${tag} entity-${entity.source_text_start}`
      
      const before = highlightedContent.substring(0, entity.source_text_start)
      const entityText = highlightedContent.substring(entity.source_text_start, entity.source_text_end)
      const after = highlightedContent.substring(entity.source_text_end)
      
      highlightedContent = `${before}<${tag} class="${className}">${entityText}</${tag}>${after}`
    }
  })
  
  return highlightedContent
}
