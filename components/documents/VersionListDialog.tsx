/**
 * Version List Dialog
 * Shows all document versions and allows user to select one to view
 */

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { 
  History, 
  Eye, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { VersionViewerDialog } from './VersionViewerDialog'

// Helper function to format time ago (Vercel-style)
function formatTimeAgo(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then
  
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffWeek < 4) return `${diffWeek}w ago`
  if (diffMonth < 12) return `${diffMonth}mo ago`
  return new Date(date).toLocaleDateString()
}

interface DocumentVersion {
  id: string
  version: string
  content: string
  changes: string
  name?: string
  author_id?: string
  author?: string
  created_at: string
  word_count?: number
  is_regeneration?: boolean
  is_current?: boolean
  metadata?: {
    provider?: string
    model?: string
    temperature?: number
    context_summary?: string
    context_token_usage?: number
    template_id?: string
    generated_at?: string
    [key: string]: any
  }
}

interface VersionListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versions: DocumentVersion[]
  documentName?: string
  onLoadVersion?: (version: DocumentVersion) => void
  loadedVersionId?: string // ID of the currently loaded version
}

export function VersionListDialog({
  open,
  onOpenChange,
  versions,
  documentName,
  onLoadVersion,
  loadedVersionId
}: VersionListDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null)
  const [showVersionViewer, setShowVersionViewer] = useState(false)

  const handleViewVersion = (version: DocumentVersion) => {
    setSelectedVersion(version)
    setShowVersionViewer(true)
  }

  const handleLoadVersion = (version: DocumentVersion) => {
    if (onLoadVersion) {
      onLoadVersion(version)
      onOpenChange(false) // Close dialog after loading
    }
  }

  // API now returns all related documents (including current), already sorted
  // Just use the versions array directly
  const sortedVersions = versions

  // Debug logging
  if (open && process.env.NODE_ENV === 'development') {
    console.log('[VersionListDialog] All versions:', versions)
    console.log('[VersionListDialog] Current version:', versions.find(v => v.is_current))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <History className="h-5 w-5 text-primary" />
              <span>Version History</span>
            </DialogTitle>
            <DialogDescription>
              {documentName && `${documentName} - `}
              {sortedVersions.length} version{sortedVersions.length !== 1 ? 's' : ''} available
            </DialogDescription>
          </DialogHeader>

          <Separator />

          {/* Versions List */}
          <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
            {sortedVersions.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="pt-6 pb-6 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No version history available yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a new version to see it here
                  </p>
                </CardContent>
              </Card>
            ) : (
              sortedVersions.map((version, index) => {
                // Check if this version is the one currently loaded (not just the URL document)
                const isCurrentVersion = loadedVersionId ? version.id === loadedVersionId : version.is_current === true
                const isLatest = index === 0
                const isAIGenerated = version.is_regeneration === true
                
                // Calculate word count on the fly if not available or is 0
                const displayWordCount = (version.word_count && version.word_count > 0) 
                  ? version.word_count 
                  : (version.content ? version.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0)
                
                return (
                  <div 
                    key={version.id} 
                    className={`group relative border rounded-lg p-4 transition-all hover:border-primary/50 hover:shadow-sm ${
                      isCurrentVersion ? 'bg-primary/5 border-primary' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Status and Version Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge 
                            variant={isCurrentVersion ? "default" : "secondary"}
                            className="font-mono"
                          >
                            v{version.version}
                          </Badge>
                          
                          {isCurrentVersion && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Current
                            </Badge>
                          )}
                          
                          {isLatest && !isCurrentVersion && (
                            <Badge variant="outline">
                              Latest
                            </Badge>
                          )}
                          
                          {isAIGenerated && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Generated
                            </Badge>
                          )}
                          
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                            Ready
                          </Badge>
                        </div>
                        
                        <p className="text-sm font-medium mb-1 truncate">
                          {version.changes || 'No description'}
                        </p>
                        
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span className="font-medium">
                            {formatTimeAgo(version.created_at || Date.now())}
                          </span>
                          <span>•</span>
                          <span>by {version.author || 'System'}</span>
                          {displayWordCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{displayWordCount.toLocaleString()} words</span>
                            </>
                          )}
                        </div>
                        
                        {/* AI Metadata (if AI-generated) */}
                        {version.metadata && version.metadata.provider && (
                          <div className="flex items-center space-x-2 text-xs text-purple-600 dark:text-purple-400 mt-1">
                            <span>{version.metadata.provider}</span>
                            {version.metadata.model && (
                              <>
                                <span>•</span>
                                <span>{version.metadata.model}</span>
                              </>
                            )}
                            {version.metadata.temperature !== undefined && (
                              <>
                                <span>•</span>
                                <span>temp: {version.metadata.temperature}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="ml-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewVersion(version)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!isCurrentVersion && onLoadVersion && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleLoadVersion(version)}
                            title={version.content ? "Load this version" : "Content not available"}
                            disabled={!version.content}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Info */}
          {sortedVersions.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Click "View" to see the full content of any version
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested Version Viewer Dialog */}
      <VersionViewerDialog
        open={showVersionViewer}
        onOpenChange={setShowVersionViewer}
        version={selectedVersion}
        documentName={documentName}
      />
    </>
  )
}

