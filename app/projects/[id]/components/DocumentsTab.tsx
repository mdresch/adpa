"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Plus,
  Download,
  Eye,
  MoreHorizontal,
  Trash2,
  Loader2,
} from "lucide-react"

interface Document {
  id: string
  name: string
  status: string
  version: number
  updated_at: string
  updated_by: string
  [key: string]: unknown
}

interface DocumentStats {
  totalDocuments: number
  counts: {
    draft: number
    review: number
    published: number
    archived: number
  }
}

interface DocumentsPagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface DocumentsTabProps {
  projectId: string
  documentStats: DocumentStats
  searchTerm: string
  setSearchTerm: (term: string) => void
  createDialogOpen: boolean
  setCreateDialogOpen: (open: boolean) => void
  handleUploadDocumentClick: () => void
  handleDocumentUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void
  documentsLoading: boolean
  displayDocuments: Document[]
  handleEditDocument: (id: string) => void
  handleDownloadDocument: (id: string) => void
  handleDeleteDocument: (id: string) => void
  documentsPagination: DocumentsPagination
  setDocumentsPagination: React.Dispatch<React.SetStateAction<DocumentsPagination>>
}

// Helper functions
const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "in-progress":
      return <Clock className="h-4 w-4 text-blue-500" />
    case "draft":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "default"
    case "in-progress":
      return "secondary"
    case "draft":
      return "outline"
    default:
      return "secondary"
  }
}

export function DocumentsTab({
  projectId,
  documentStats,
  searchTerm,
  setSearchTerm,
  createDialogOpen,
  setCreateDialogOpen,
  handleUploadDocumentClick,
  handleDocumentUpload,
  documentsLoading,
  displayDocuments,
  handleEditDocument,
  handleDownloadDocument,
  handleDeleteDocument,
  documentsPagination,
  setDocumentsPagination,
}: DocumentsTabProps) {
  const router = useRouter()
  
  return (
    <div className="space-y-4">
      {/* Document Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{documentStats.totalDocuments}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold">{documentStats.counts.draft}</p>
              </div>
              <Edit className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{documentStats.counts.published}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Review</p>
                <p className="text-2xl font-bold">{documentStats.counts.review}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => router.push(`/documents/new?projectId=${projectId}`)}>
          <Plus className="h-4 w-4 mr-2" />
          New Document
        </Button>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Document
            </Button>
          </DialogTrigger>
        </Dialog>
        {/* Legacy Upload - Direct file selection */}
        {handleDocumentUpload && (
          <label htmlFor="legacy-file-upload">
            <Button variant="outline" asChild>
              <span>
                <Download className="h-4 w-4 mr-2" />
                Upload File
              </span>
            </Button>
            <input
              id="legacy-file-upload"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={handleDocumentUpload}
              className="hidden"
            />
          </label>
        )}
        {/* Dialog-based Upload */}
        <Button variant="outline" onClick={handleUploadDocumentClick}>
          <Download className="h-4 w-4 mr-2" />
          Upload (Dialog)
        </Button>
      </div>

      {/* Loading state for documents */}
      {documentsLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading documents...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {displayDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(doc.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/projects/${projectId}/documents/${doc.id}/view`}
                          className="font-semibold hover:text-primary transition-colors"
                        >
                          {doc.name}
                        </Link>
                        <Badge variant={getStatusColor(doc.status)} className="text-xs">
                          {doc.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span>v{doc.version}</span>
                        <span>•</span>
                        <span>Modified {new Date(doc.updated_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>by {doc.updated_by}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/projects/${projectId}/documents/${doc.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/projects/${projectId}/documents/${doc.id}/view`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditDocument(doc.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit in Text Editor
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/projects/${projectId}/documents/${doc.id}/view`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View in Rich Editor
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadDocument(doc.id)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {displayDocuments.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Try adjusting your search criteria" 
                  : "Start by generating your first document for this project"
                }
              </p>
              {!searchTerm && (
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate First Document
                    </Button>
                  </DialogTrigger>
                </Dialog>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {displayDocuments.length > 0 && documentsPagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((documentsPagination.page - 1) * documentsPagination.limit) + 1} to {Math.min(documentsPagination.page * documentsPagination.limit, documentsPagination.total)} of {documentsPagination.total} documents
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDocumentsPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={documentsPagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {documentsPagination.page} of {documentsPagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDocumentsPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={documentsPagination.page >= documentsPagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

