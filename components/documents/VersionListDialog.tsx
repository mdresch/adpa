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
  Clock
} from 'lucide-react'
import { VersionViewerDialog } from './VersionViewerDialog'

interface DocumentVersion {
  id: string
  version: string
  content: string
  changes: string
  author_id?: string
  author?: string
  created_at: string
  word_count?: number
}

interface VersionListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versions: DocumentVersion[]
  currentVersion?: string
  documentName?: string
}

export function VersionListDialog({
  open,
  onOpenChange,
  versions,
  currentVersion,
  documentName
}: VersionListDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null)
  const [showVersionViewer, setShowVersionViewer] = useState(false)

  const handleViewVersion = (version: DocumentVersion) => {
    setSelectedVersion(version)
    setShowVersionViewer(true)
  }

  // Sort versions by created_at descending (newest first)
  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

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
              {versions.length} version{versions.length !== 1 ? 's' : ''} available
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
                const isCurrentVersion = version.version === currentVersion
                const isLatest = index === 0
                
                return (
                  <Card 
                    key={version.id} 
                    className={`transition-all hover:shadow-md ${
                      isCurrentVersion ? 'border-primary ring-2 ring-primary/20' : ''
                    }`}
                  >
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between">
                        {/* Left: Version Info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={isCurrentVersion ? "default" : "outline"}
                              className="text-sm"
                            >
                              v{version.version}
                            </Badge>
                            {isLatest && (
                              <Badge variant="secondary" className="text-xs">
                                Latest
                              </Badge>
                            )}
                            {isCurrentVersion && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Current
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm font-medium">
                            {version.changes || 'No change description'}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{version.author || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(version.created_at).toLocaleDateString()}</span>
                            </div>
                            {version.word_count && (
                              <div className="flex items-center space-x-1">
                                <FileText className="h-3 w-3" />
                                <span>{version.word_count.toLocaleString()} words</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewVersion(version)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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

