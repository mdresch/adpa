/**
 * Version Viewer Dialog
 * Display a specific document version's content in a modal
 */

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
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, Calendar, User, Hash, Download, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

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

interface VersionViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: DocumentVersion | null
  documentName?: string
}

export function VersionViewerDialog({
  open,
  onOpenChange,
  version,
  documentName
}: VersionViewerDialogProps) {
  const [copied, setCopied] = useState(false)

  if (!version) return null

  const handleCopy = async () => {
    try {
      const content = version.content || '(No content available)'
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success('Content copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy content')
    }
  }

  const handleDownload = () => {
    const content = version.content || '(No content available)'
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${documentName || 'document'}_v${version.version}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded version as Markdown')
  }

  const hasContent = version.content && version.content.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>View Version {version.version}</span>
          </DialogTitle>
          <DialogDescription>
            {documentName && `${documentName} - `}Version history
          </DialogDescription>
        </DialogHeader>

        {/* Version Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
          <div className="flex items-start space-x-2">
            <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Version</p>
              <Badge variant="outline">{version.version}</Badge>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">
                {new Date(version.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Author</p>
              <p className="text-sm font-medium">{version.author || 'Unknown'}</p>
            </div>
          </div>
          
          {version.word_count && (
            <div className="flex items-start space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Words</p>
                <p className="text-sm font-medium">{version.word_count.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        {version.changes && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">Changes</p>
            <p className="text-sm text-muted-foreground">{version.changes}</p>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copied!' : 'Copy Content'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download as Markdown
          </Button>
        </div>

        <Separator />

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto">
          {hasContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {version.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <FileText className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
              <p className="text-sm text-muted-foreground">
                Content not available for this version
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This version may not have content stored in the database
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

