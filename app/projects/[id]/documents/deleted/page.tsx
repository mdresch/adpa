"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getApiBaseUrl } from "@/lib/api-url"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  FileText,
  Search,
  ArrowLeft,
  Trash2,
  RotateCcw,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Folder,
  Wand2,
  Upload,
  Eye,
  MoreHorizontal,
  Trash,
  Undo2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DeletedDocument {
  id: string
  name: string
  content?: string
  status: string
  version: number
  created_at: string
  deleted_at: string
  deleted_by_name?: string
  deleted_by_email?: string
  author_name?: string
  author_email?: string
  template_name?: string
  template_framework_name?: string
  project_name?: string
  word_count?: number
  character_count?: number
  deleted_age_hours?: number
}

interface Project {
  id: string
  name: string
  description?: string
}

export default function DeletedDocumentsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const projectId = params.id
  
  const [documents, setDocuments] = useState<DeletedDocument[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [restoring, setRestoring] = useState<string | null>(null)
  const [permanentlyDeleting, setPermanentlyDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const API_URL = getApiBaseUrl()
      
      // Load project info
      const projectResponse = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (projectResponse.ok) {
        const projectData = await projectResponse.json()
        setProject(projectData.project)
      }

      // Load deleted documents
      const documentsResponse = await fetch(`${API_URL}/documents/project/${projectId}/deleted`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json()
        setDocuments(documentsData.documents || [])
      } else {
        console.error('Failed to load deleted documents:', documentsResponse.statusText)
        toast({
          title: "Error",
          description: "Failed to load deleted documents",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (documentId: string) => {
    try {
      setRestoring(documentId)
      const API_URL = getApiBaseUrl()
      
      const response = await fetch(`${API_URL}/documents/${documentId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Document restored successfully"
        })
        
        // Remove from deleted documents list
        setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to restore document",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error restoring document:', error)
      toast({
        title: "Error",
        description: "Failed to restore document",
        variant: "destructive"
      })
    } finally {
      setRestoring(null)
    }
  }

  const handlePermanentDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to permanently delete this document? This action cannot be undone.')) {
      return
    }

    try {
      setPermanentlyDeleting(documentId)
      const API_URL = getApiBaseUrl()
      
      const response = await fetch(`${API_URL}/documents/${documentId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Document permanently deleted"
        })
        
        // Remove from deleted documents list
        setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to permanently delete document",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error permanently deleting document:', error)
      toast({
        title: "Error",
        description: "Failed to permanently delete document",
        variant: "destructive"
      })
    } finally {
      setPermanentlyDeleting(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'bg-blue-100 text-blue-800'
      case 'uploaded': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'under_review': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-purple-100 text-purple-800'
      case 'published': return 'bg-green-100 text-green-800'
      case 'archived': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAge = (hours: number) => {
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${Math.round(hours)} hours ago`
    const days = Math.round(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.author_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading deleted documents...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <PageTransition>
          <AnimatedLayout>
            <div className="flex-1 overflow-y-auto p-6">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push(`/projects/${projectId}/documents`)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Documents
                    </Button>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Trash2 className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-muted-foreground">{project?.name}</span>
                      </div>
                      <h1 className="text-3xl font-bold text-orange-600">Deleted Documents</h1>
                      <p className="text-muted-foreground">
                        Restore or permanently delete documents from this project
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <Trash2 className="h-3 w-3 mr-1" />
                      {documents.length} deleted
                    </Badge>
                  </div>
                </div>
              </motion.div>

              {/* Search */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search deleted documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </motion.div>

              {/* Empty State */}
              {documents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center py-12"
                >
                  <Trash2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Deleted Documents</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no deleted documents in this project.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/projects/${projectId}/documents`)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Documents
                  </Button>
                </motion.div>
              ) : (
                /* Documents Grid */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {filteredDocuments.map((document, index) => (
                    <motion.div
                      key={document.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <AnimatedCard className="h-full border-orange-200 bg-orange-50/50 hover:shadow-lg transition-all duration-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <FileText className="h-5 w-5 text-orange-600" />
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold line-clamp-2">{document.name}</h3>
                                  {document.template_name && (
                                    <p className="text-sm text-blue-600 font-medium">
                                      📋 {document.template_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge className={getStatusColor(document.status)}>
                                  {document.status}
                                </Badge>
                                <Badge variant="outline">
                                  v{document.version}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {/* Document Info */}
                            <div className="space-y-2">
                              {document.author_name && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">Author:</span>
                                  <span className="font-medium">{document.author_name}</span>
                                </div>
                              )}
                              
                              {document.template_framework_name && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <Wand2 className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">Framework:</span>
                                  <span className="font-medium">{document.template_framework_name}</span>
                                </div>
                              )}
                              
                              {document.word_count && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <FileText className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">Words:</span>
                                  <span className="font-medium">{document.word_count.toLocaleString()}</span>
                                </div>
                              )}
                            </div>

                            {/* Deletion Info */}
                            <div className="border-t pt-3 space-y-2">
                              <div className="flex items-center space-x-2 text-sm">
                                <Clock className="h-3 w-3 text-orange-600" />
                                <span className="text-muted-foreground">Deleted:</span>
                                <span className="font-medium">
                                  {document.deleted_age_hours ? formatAge(document.deleted_age_hours) : formatDate(document.deleted_at)}
                                </span>
                              </div>
                              
                              {document.deleted_by_name && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <User className="h-3 w-3 text-orange-600" />
                                  <span className="text-muted-foreground">Deleted by:</span>
                                  <span className="font-medium">{document.deleted_by_name}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-2 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Created:</span>
                                <span className="font-medium">{formatDate(document.created_at)}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-2 pt-3 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestore(document.id)}
                                disabled={restoring === document.id}
                                className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                {restoring === document.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-2"></div>
                                ) : (
                                  <Undo2 className="h-3 w-3 mr-2" />
                                )}
                                Restore
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePermanentDelete(document.id)}
                                disabled={permanentlyDeleting === document.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {permanentlyDeleting === document.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                ) : (
                                  <Trash className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* No Results */}
              {documents.length > 0 && filteredDocuments.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center py-12"
                >
                  <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Documents Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No deleted documents match your search criteria.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setSearchTerm("")}
                  >
                    Clear Search
                  </Button>
                </motion.div>
              )}
            </div>
          </AnimatedLayout>
        </PageTransition>
      </div>
    </div>
  )
}
