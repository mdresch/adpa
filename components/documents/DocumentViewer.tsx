"use client"

import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, BarChart3, Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentTitle: string
  documentContent: string
  highlights?: Array<{
    id: string
    entity_name: string
    entity_type: string
    source_text_start: number
    source_text_end: number
    source_line_start: number
    source_line_end: number
    source_context?: string
    source_snippet?: string
  }>
  initialScrollTo?: {
    line?: number
    char?: number
  }
}

export function DocumentViewer({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  documentContent,
  highlights = [],
  initialScrollTo
}: DocumentViewerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentHighlight, setCurrentHighlight] = useState<string | null>(null)
  const contentRef = useRef<HTMLPreElement | null>(null)
  const [lineNumbers, setLineNumbers] = useState<Array<{ number: number; text: string; textStartPos: number; hasHighlight?: boolean; isCurrentHighlight?: boolean; lineNumber?: string }>>([])
  const [filteredLines, setFilteredLines] = useState<Array<{ number: number; text: string; textStartPos: number; hasHighlight?: boolean; isCurrentHighlight?: boolean; lineNumber?: string }>>([])

  // Process content into lines for highlighting
  useEffect(() => {
    if (documentContent) {
      const lines = documentContent.split('\n')
      let charPos = 0
      const processedLines = lines.map((line, index) => {
        const textStartPos = charPos
        charPos += line.length + 1 // +1 for newline
        return {
          number: index + 1,
          text: line,
          textStartPos
        }
      })
      setLineNumbers(processedLines)
      setFilteredLines(processedLines)
    }
  }, [documentContent])

  // Filter lines based on search
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = lineNumbers.filter(line => 
        line.text.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredLines(filtered)
    } else {
      setFilteredLines(lineNumbers)
    }
  }, [searchTerm, lineNumbers])

  // Scroll to specific location
  useEffect(() => {
    if (isOpen && contentRef.current && initialScrollTo) {
      const element = contentRef.current
      const scrollTarget = initialScrollTo.char || 
        (initialScrollTo.line && lineNumbers.find(l => l.number === initialScrollTo.line)?.textStartPos || 0)
      
      if (scrollTarget !== undefined) {
        element.scrollTop = scrollTarget
      }
    }
  }, [isOpen, initialScrollTo, lineNumbers])

  // Highlight current entity
  const highlightEntity = (entityId: string) => {
    setCurrentHighlight(entityId)
    const entity = highlights.find(h => h.id === entityId)
    if (entity && contentRef.current) {
      const element = contentRef.current
      const scrollTarget = entity.source_text_start || 
        (entity.source_line_start && lineNumbers.find(l => l.number === entity.source_line_start)?.textStartPos || 0)
      
      if (scrollTarget !== undefined) {
        element.scrollTop = scrollTarget
      }
    }
  }

  // Get highlighted content
  const getHighlightedContent = () => {
    if (!documentContent) return []
    
    const lines = documentContent.split('\n')
    return lines.map((line, lineIndex) => {
      let highlightedLine = line
      let hasHighlight = false
      
      // Apply yellow highlighting for entities
      highlights.forEach(entity => {
        if (entity.source_line_start <= lineIndex + 1 && entity.source_line_end >= lineIndex + 1) {
          // Highlight the entire line range
          const startChar = entity.source_text_start || 0
          const endChar = entity.source_text_end || line.length
          const lineStartPos = documentContent.substring(0, documentContent.indexOf(line)).length
          const relativeStart = Math.max(0, startChar - lineStartPos)
          const relativeEnd = Math.min(line.length, endChar - lineStartPos)
          
          const beforeHighlight = line.substring(0, relativeStart)
          const highlightedText = line.substring(relativeStart, relativeEnd)
          const afterHighlight = line.substring(relativeEnd)
          
          highlightedLine = `${beforeHighlight}<mark class="bg-yellow-200 px-1 rounded">${highlightedText}</mark>${afterHighlight}`
          hasHighlight = true
        }
      })
      
      // Add line numbers
      const lineNumber = (lineIndex + 1).toString().padStart(3, ' ')
      
      return {
        lineNumber,
        text: highlightedLine,
        hasHighlight,
        isCurrentHighlight: currentHighlight && highlights.some(h => h.id === currentHighlight && 
          h.source_line_start <= lineIndex + 1 && h.source_line_end >= lineIndex + 1)
      }
    })
  }

  const highlightedContent = getHighlightedContent()

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
        {highlights.length > 0 && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs">
                {highlights.length} Entities Found
              </Badge>
              <span className="text-sm text-muted-foreground">
                Click to jump to location
              </span>
            </div>
            <ScrollArea className="h-24 w-full border rounded-md p-2">
              <div className="space-y-1">
                {highlights.map((entity) => (
                  <div
                    key={entity.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors",
                      currentHighlight === entity.id && "bg-yellow-100 border-yellow-300"
                    )}
                    onClick={() => highlightEntity(entity.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{entity.entity_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {entity.entity_type} • Lines {entity.source_line_start}-{entity.source_line_end}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {entity.source_snippet?.substring(0, 30)}...
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search in document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Document Content */}
        <ScrollArea className="flex-1 p-4">
          <div className="relative">
            <pre ref={contentRef} className="text-sm font-mono leading-relaxed">
              {filteredLines.map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex hover:bg-muted/50 transition-colors",
                    line.hasHighlight && "bg-yellow-50",
                    line.isCurrentHighlight && "bg-yellow-100"
                  )}
                >
                  <span className="text-muted-foreground select-none pr-4">
                    {line.lineNumber}
                  </span>
                  <span className={cn(
                    line.hasHighlight && "font-semibold"
                  )}>
                    {line.text}
                  </span>
                </div>
              ))}
            </pre>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            {filteredLines.length} of {lineNumbers.length} lines shown
            {searchTerm && ` (filtered for "${searchTerm}")`}
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
                // Open document in new tab (if URL available)
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
