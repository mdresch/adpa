"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Search,
  FileText,
  FolderOpen,
  FileCode,
  Layers,
  Check,
  Loader2,
} from "lucide-react"

// Generic item interface
export interface SearchableItem {
  id: string
  name: string
  description?: string
  type?: string
  status?: string
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export type ItemType = "program" | "project" | "template" | "document"

interface SearchDialogProps<T extends SearchableItem> {
  // Dialog state
  open: boolean
  onOpenChange: (open: boolean) => void
  
  // Data
  items: T[]
  itemType: ItemType
  
  // Selection
  selectedItemId?: string
  onSelectItem: (item: T) => void
  
  // Configuration
  title?: string
  description?: string
  placeholder?: string
  emptyMessage?: string
  
  // Loading
  loading?: boolean
  
  // Custom rendering
  renderItemIcon?: (item: T) => React.ReactNode
  renderItemBadge?: (item: T) => React.ReactNode
  renderItemMeta?: (item: T) => React.ReactNode
  
  // Filtering
  filterFunction?: (item: T, query: string) => boolean
}

const DEFAULT_ICONS: Record<ItemType, React.ComponentType<any>> = {
  program: Layers,
  project: FolderOpen,
  template: FileCode,
  document: FileText,
}

const DEFAULT_LABELS: Record<ItemType, { title: string; placeholder: string; empty: string }> = {
  program: {
    title: "Select Program",
    placeholder: "Search programs by name or description...",
    empty: "No programs found",
  },
  project: {
    title: "Select Project",
    placeholder: "Search projects by name or description...",
    empty: "No projects found",
  },
  template: {
    title: "Select Template",
    placeholder: "Search templates by name or type...",
    empty: "No templates found",
  },
  document: {
    title: "Select Document",
    placeholder: "Search documents by title or content...",
    empty: "No documents found",
  },
}

export function SearchDialog<T extends SearchableItem>({
  open,
  onOpenChange,
  items,
  itemType,
  selectedItemId,
  onSelectItem,
  title,
  description,
  placeholder,
  emptyMessage,
  loading = false,
  renderItemIcon,
  renderItemBadge,
  renderItemMeta,
  filterFunction,
}: SearchDialogProps<T>) {
  const [searchQuery, setSearchQuery] = useState("")
  const [focusedIndex, setFocusedIndex] = useState(0)

  const labels = DEFAULT_LABELS[itemType]
  const DefaultIcon = DEFAULT_ICONS[itemType]

  // Default filter function: search name and description
  const defaultFilter = (item: T, query: string) => {
    const normalizedQuery = query.toLowerCase()
    const nameMatch = item.name.toLowerCase().includes(normalizedQuery)
    const descMatch = item.description?.toLowerCase().includes(normalizedQuery) || false
    const typeMatch = item.type?.toLowerCase().includes(normalizedQuery) || false
    return nameMatch || descMatch || typeMatch
  }

  const filterFn = filterFunction || defaultFilter

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    return items.filter((item: any) => filterFn(item, searchQuery))
  }, [items, searchQuery, filterFn])

  // Reset focused index when filtered items change
  useEffect(() => {
    setFocusedIndex(0)
  }, [filteredItems])

  // Reset search when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setFocusedIndex(0)
    }
  }, [open])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredItems.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (filteredItems[focusedIndex]) {
          handleSelect(filteredItems[focusedIndex])
        }
        break
      case "Escape":
        e.preventDefault()
        onOpenChange(false)
        break
    }
  }

  const handleSelect = (item: T) => {
    onSelectItem(item)
    onOpenChange(false)
    setSearchQuery("")
  }

  // Get status color
  const getStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800"
    switch (status.toLowerCase()) {
      case "active":
      case "completed":
      case "published":
        return "bg-green-100 text-green-800 border-green-300"
      case "in_progress":
      case "draft":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "on_hold":
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "archived":
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-300"
      case "at_risk":
        return "bg-red-100 text-red-800 border-red-300"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{title || labels.title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Search Input */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder || labels.placeholder}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
              autoFocus
            />
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-2">
              {filteredItems.length} {filteredItems.length === 1 ? "result" : "results"}
            </p>
          )}
        </div>

        {/* Results */}
        <ScrollArea className="h-[400px] px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3">Loading {itemType}s...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DefaultIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No results found" : emptyMessage || labels.empty}
              </h3>
              {searchQuery && (
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search terms
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item, index) => {
                const isSelected = item.id === selectedItemId
                const isFocused = index === focusedIndex
                const ItemIcon = renderItemIcon?.(item) || <DefaultIcon className="h-5 w-5" />

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left",
                      "hover:bg-accent hover:text-accent-foreground",
                      isFocused && "bg-accent/50",
                      isSelected && "bg-primary/10 border border-primary"
                    )}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {typeof ItemIcon === "object" ? ItemIcon : <DefaultIcon className="h-5 w-5" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{item.name}</h4>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Badge */}
                        {item.status && (
                          <Badge variant="outline" className={cn("text-xs", getStatusColor(item.status))}>
                            {item.status}
                          </Badge>
                        )}

                        {/* Type Badge */}
                        {item.type && (
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        )}

                        {/* Custom Badge */}
                        {renderItemBadge?.(item)}

                        {/* Custom Metadata */}
                        {renderItemMeta?.(item)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer with keyboard hints */}
        {filteredItems.length > 0 && !loading && (
          <div className="px-6 py-3 border-t bg-muted/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">↑↓</kbd> Navigate
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Enter</kbd> Select
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Esc</kbd> Close
                </span>
              </div>
              <span>
                {focusedIndex + 1} of {filteredItems.length}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Convenience wrapper for Programs
export function ProgramSearchDialog({
  open,
  onOpenChange,
  programs,
  selectedProgramId,
  onSelectProgram,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  programs: SearchableItem[]
  selectedProgramId?: string
  onSelectProgram: (program: SearchableItem) => void
  loading?: boolean
}) {
  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      items={programs}
      itemType="program"
      selectedItemId={selectedProgramId}
      onSelectItem={onSelectProgram}
      loading={loading}
      renderItemMeta={(program) => (
        <>
          {('project_count' in program) && typeof program.project_count === 'number' && (
            <span className="text-xs text-muted-foreground">
              {program.project_count} projects
            </span>
          )}
        </>
      )}
    />
  )
}

// Convenience wrapper for Projects
export function ProjectSearchDialog({
  open,
  onOpenChange,
  projects,
  selectedProjectId,
  onSelectProject,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: SearchableItem[]
  selectedProjectId?: string
  onSelectProject: (project: SearchableItem) => void
  loading?: boolean
}) {
  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      items={projects}
      itemType="project"
      selectedItemId={selectedProjectId}
      onSelectItem={onSelectProject}
      loading={loading}
      renderItemMeta={(project) => (
        <>
          {(project as any).document_count !== undefined && (
            <span className="text-xs text-muted-foreground">
              {(project as any).document_count} documents
            </span>
          )}
        </>
      )}
    />
  )
}

// Convenience wrapper for Templates
export function TemplateSearchDialog({
  open,
  onOpenChange,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: SearchableItem[]
  selectedTemplateId?: string
  onSelectTemplate: (template: SearchableItem) => void
  loading?: boolean
}) {
  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      items={templates}
      itemType="template"
      selectedItemId={selectedTemplateId}
      onSelectItem={onSelectTemplate}
      loading={loading}
      renderItemMeta={(template) => (
        <>
          {(template as any).framework && (
            <Badge variant="outline" className="text-xs">
              {(template as any).framework}
            </Badge>
          )}
        </>
      )}
    />
  )
}

// Convenience wrapper for Documents
export function DocumentSearchDialog({
  open,
  onOpenChange,
  documents,
  selectedDocumentId,
  onSelectDocument,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  documents: SearchableItem[]
  selectedDocumentId?: string
  onSelectDocument: (document: SearchableItem) => void
  loading?: boolean
}) {
  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      items={documents}
      itemType="document"
      selectedItemId={selectedDocumentId}
      onSelectItem={onSelectDocument}
      loading={loading}
      renderItemMeta={(doc) => (
        <>
          {('version' in doc) && typeof doc.version === 'number' && (
            <span className="text-xs text-muted-foreground">
              v{doc.version}
            </span>
          )}
          {('updated_at' in doc) && typeof doc.updated_at === 'string' && (
            <span className="text-xs text-muted-foreground">
              {new Date(doc.updated_at).toLocaleDateString()}
            </span>
          )}
        </>
      )}
    />
  )
}

