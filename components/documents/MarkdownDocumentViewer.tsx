"use client"

import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BarChart3, Clock, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarkdownDocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentTitle: string
  documentContent: string
  entities?: Array<{
    id: string
    entity_name: string
    entity_type: string
    entity_markdown_tag?: string
    source_document?: string
  }>
}

export function MarkdownDocumentViewer({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  documentContent,
  entities = []
}: MarkdownDocumentViewerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentEntity, setCurrentEntity] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Inject CSS for highlighting
  useEffect(() => {
    if (isOpen && !document.getElementById('markdown-highlighting-styles')) {
      const style = document.createElement('style')
      style.id = 'markdown-highlighting-styles'
      style.textContent = `
        /* Yellow highlighting for extracted entities */
        h5, h6 {
          background-color: #fef08a !important;
          color: #713f12 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          display: inline-block !important;
          font-weight: 600 !important;
          font-size: 0.9em !important;
          margin: 0 2px !important;
          border: 1px solid #fbbf24 !important;
        }
        
        h5 {
          background-color: #fef08a !important; /* Light yellow */
        }
        
        h6 {
          background-color: #fde047 !important; /* Slightly darker yellow */
        }
        
        /* Hover effects */
        h5:hover, h6:hover {
          background-color: #facc15 !important;
          cursor: pointer !important;
          transform: scale(1.02) !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }
        
        /* Current entity highlighting */
        h5.current-entity, h6.current-entity {
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
        const existingStyle = document.getElementById('markdown-highlighting-styles')
        if (existingStyle) {
          document.head.removeChild(existingStyle)
        }
      }
    }
  }, [isOpen])

  // Scroll to specific entity
  const scrollToEntity = (entityId: string) => {
    setCurrentEntity(entityId)
    const entity = entities.find(e => e.id === entityId)
    if (!entity) return

    // Find the entity in the document
    const entityElements = contentRef.current?.querySelectorAll(
      `${entity.entity_markdown_tag || 'h5, h6'}`
    )
    
    if (entityElements) {
      for (const element of entityElements) {
        if (element.textContent?.includes(entity.entity_name)) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          
          // Add current-entity class for highlighting
          entityElements.forEach(el => el.classList.remove('current-entity'))
          element.classList.add('current-entity')
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            element.classList.remove('current-entity')
          }, 3000)
          
          break
        }
      }
    }
  }

  // Filter entities based on search
  const filteredEntities = entities.filter(entity =>
    entity.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Count highlighted entities in content
  const getEntityCount = () => {
    if (!contentRef.current) return 0
    const h5Elements = contentRef.current.querySelectorAll('h5').length
    const h6Elements = contentRef.current.querySelectorAll('h6').length
    return h5Elements + h6Elements
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
                {getEntityCount()} Highlights in Document
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
                      <div className="font-medium text-sm flex items-center gap-2">
                        <span>{entity.entity_name}</span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            entity.entity_markdown_tag === 'h5' ? "bg-yellow-100" : "bg-yellow-200"
                          )}
                        >
                          {entity.entity_markdown_tag || 'h5'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entity.entity_type}
                      </div>
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
                __html: documentContent
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
            {getEntityCount()} highlighted entities found
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
