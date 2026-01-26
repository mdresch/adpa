"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Upload,
  Link as LinkIcon,
  FileCode,
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  AlertCircle,
  Info,
  BarChart3,
  TrendingUp,
  Lightbulb,
  Eye,
} from "lucide-react"
import { MoreHorizontal } from "@/components/ui/icons-shim"
import { apiClient, ProjectContextItem, IntegrationPage, ContextRecommendation, TemplateSuggestion } from "@/lib/api"
import { toast } from '@/lib/notify'
import { useAuth } from "@/contexts/AuthContext"

interface ProjectContextTabProps {
  projectId: string
}

export function ProjectContextTab({ projectId }: ProjectContextTabProps) {
  const { user } = useAuth()
  const [contextItems, setContextItems] = useState<ProjectContextItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'dashboard'>('list')
  
  // Add context dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [activeAddTab, setActiveAddTab] = useState<'document' | 'url' | 'custom' | 'integration'>('document')
  
  // Reference document upload
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  
  // URL fetch
  const [urlInput, setUrlInput] = useState('')
  const [urlPreview, setUrlPreview] = useState<{ content: string; title: string; metadata: any } | null>(null)
  
  // Custom text
  const [customTitle, setCustomTitle] = useState('')
  const [customContent, setCustomContent] = useState('')
  
  // Integration pages
  const [selectedIntegration, setSelectedIntegration] = useState<'jira' | 'confluence' | null>(null)
  const [integrationSearch, setIntegrationSearch] = useState('')
  const [integrationPages, setIntegrationPages] = useState<IntegrationPage[]>([])
  const [selectedIntegrationPages, setSelectedIntegrationPages] = useState<Set<string>>(new Set())
  const [loadingIntegrationPages, setLoadingIntegrationPages] = useState(false)
  
  // Analytics
  const [analytics, setAnalytics] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<ContextRecommendation[]>([])
  const [templateSuggestions, setTemplateSuggestions] = useState<TemplateSuggestion[]>([])
  
  // Preview
  const [previewItem, setPreviewItem] = useState<ProjectContextItem | null>(null)

  // Use ref to track if we're currently fetching to prevent duplicate calls
  const fetchingRef = useRef(false)

  const fetchContextItems = useCallback(async () => {
    if (fetchingRef.current) return // Prevent duplicate calls
    
    try {
      fetchingRef.current = true
      setLoading(true)
      const response = await apiClient.getProjectContextItems(projectId)
      setContextItems(response.items || [])
    } catch (error: any) {
      console.error('Failed to fetch context items:', error)
      toast.error('Failed to load context items')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [projectId])

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await apiClient.getProjectContextAnalytics(projectId)
      setAnalytics(response)
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error)
    }
  }, [projectId])

  const fetchRecommendations = useCallback(async () => {
    try {
      const response = await apiClient.getProjectContextRecommendations(projectId)
      setRecommendations(response.recommendations || [])
      setTemplateSuggestions(response.templateSuggestions || [])
    } catch (error: any) {
      console.error('Failed to fetch recommendations:', error)
    }
  }, [projectId])

  useEffect(() => {
    // Note: In development with React Strict Mode, effects run twice
    // This is expected behavior and helps detect side effects
    fetchContextItems()
    fetchAnalytics()
    fetchRecommendations()
  }, [projectId, fetchContextItems, fetchAnalytics, fetchRecommendations])

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file')
      return
    }

    try {
      setUploading(true)
      const response = await apiClient.createProjectContextItem(projectId, {
        type: 'reference_document',
        title: uploadTitle || undefined,
        file: uploadFile,
      })
      
      toast.success('Reference document uploaded successfully')
      setAddDialogOpen(false)
      setUploadFile(null)
      setUploadTitle('')
      await fetchContextItems()
      await fetchAnalytics()
    } catch (error: any) {
      console.error('Upload failed:', error)
      toast.error(error.message || 'Failed to upload reference document')
    } finally {
      setUploading(false)
    }
  }

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a URL')
      return
    }

    try {
      setFetchingUrl(true)
      const response = await apiClient.fetchUrlContent(projectId, urlInput)
      setUrlPreview(response)
    } catch (error: any) {
      console.error('URL fetch failed:', error)
      toast.error(error.message || 'Failed to fetch URL content')
      setUrlPreview(null)
    } finally {
      setFetchingUrl(false)
    }
  }

  const handleAddUrl = async () => {
    if (!urlPreview) {
      toast.error('Please fetch URL content first')
      return
    }

    try {
      setFetchingUrl(true)
      const response = await apiClient.createProjectContextItem(projectId, {
        type: 'url',
        title: urlPreview.title,
        source_url: urlInput,
        content: urlPreview.content,
      })
      
      toast.success('URL added as context')
      setAddDialogOpen(false)
      setUrlInput('')
      setUrlPreview(null)
      await fetchContextItems()
      await fetchAnalytics()
    } catch (error: any) {
      console.error('Add URL failed:', error)
      toast.error(error.message || 'Failed to add URL')
    } finally {
      setFetchingUrl(false)
    }
  }

  const handleAddCustomText = async () => {
    if (!customTitle.trim() || !customContent.trim()) {
      toast.error('Please provide both title and content')
      return
    }

    try {
      setUploading(true)
      const response = await apiClient.createProjectContextItem(projectId, {
        type: 'custom_text',
        title: customTitle,
        content: customContent,
      })
      
      toast.success('Custom context added')
      setAddDialogOpen(false)
      setCustomTitle('')
      setCustomContent('')
      await fetchContextItems()
      await fetchAnalytics()
    } catch (error: any) {
      console.error('Add custom text failed:', error)
      toast.error(error.message || 'Failed to add custom context')
    } finally {
      setUploading(false)
    }
  }

  const handleSearchIntegrationPages = async () => {
    if (!selectedIntegration || !integrationSearch.trim()) {
      return
    }

    try {
      setLoadingIntegrationPages(true)
      const response = await apiClient.getIntegrationPages(projectId, selectedIntegration, integrationSearch)
      setIntegrationPages(response.pages || [])
    } catch (error: any) {
      console.error('Failed to search integration pages:', error)
      toast.error(error.message || 'Failed to search integration pages')
    } finally {
      setLoadingIntegrationPages(false)
    }
  }

  const handleAddIntegrationPages = async () => {
    if (selectedIntegrationPages.size === 0) {
      toast.error('Please select at least one page')
      return
    }

    try {
      setUploading(true)
      const pages = integrationPages.filter(p => selectedIntegrationPages.has(p.id))
      
      for (const page of pages) {
        await apiClient.createProjectContextItem(projectId, {
          type: page.type === 'jira' ? 'jira_page' : 'confluence_page',
          title: page.title,
          source_url: page.url,
          integration_type: page.type,
          integration_page_id: page.id,
        })
      }
      
      toast.success(`Added ${pages.length} integration page(s) as context`)
      setAddDialogOpen(false)
      setSelectedIntegrationPages(new Set())
      setIntegrationPages([])
      setIntegrationSearch('')
      await fetchContextItems()
      await fetchAnalytics()
    } catch (error: any) {
      console.error('Add integration pages failed:', error)
      toast.error(error.message || 'Failed to add integration pages')
    } finally {
      setUploading(false)
    }
  }

  const handleToggleActive = async (itemId: string, isActive: boolean) => {
    try {
      await apiClient.updateProjectContextItem(projectId, itemId, {
        is_active: !isActive,
      })
      await fetchContextItems()
    } catch (error: any) {
      console.error('Toggle active failed:', error)
      toast.error('Failed to update context item')
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this context item?')) {
      return
    }

    try {
      await apiClient.deleteProjectContextItem(projectId, itemId)
      toast.success('Context item deleted')
      await fetchContextItems()
      await fetchAnalytics()
    } catch (error: any) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete context item')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reference_document':
        return <FileText className="h-4 w-4" />
      case 'url':
        return <LinkIcon className="h-4 w-4" />
      case 'custom_text':
        return <FileCode className="h-4 w-4" />
      case 'jira_page':
      case 'confluence_page':
        return <ExternalLink className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'reference_document':
        return 'Reference Doc'
      case 'url':
        return 'URL'
      case 'custom_text':
        return 'Custom'
      case 'jira_page':
        return 'Jira'
      case 'confluence_page':
        return 'Confluence'
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Info Banner */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Project Context</h2>
            <p className="text-muted-foreground mt-1">
              Reference materials and sources that inform AI document generation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'dashboard' ? 'default' : 'outline'}
              onClick={() => setViewMode('dashboard')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Context
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Reference Context</DialogTitle>
                  <DialogDescription>
                    Add reference materials that will inform AI document generation for this project
                  </DialogDescription>
                </DialogHeader>
                <Tabs value={activeAddTab} onValueChange={(v) => setActiveAddTab(v as any)}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="document">Reference Doc</TabsTrigger>
                    <TabsTrigger value="url">URL</TabsTrigger>
                    <TabsTrigger value="custom">Custom Text</TabsTrigger>
                    <TabsTrigger value="integration">Integration</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="document" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="upload-title">Title (Optional)</Label>
                      <Input
                        id="upload-title"
                        placeholder="Document title"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upload-file">Reference Document</Label>
                      <Input
                        id="upload-file"
                        type="file"
                        accept=".pdf,.docx,.md,.markdown,.html,.htm,.txt"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Supported: PDF, DOCX, Markdown, HTML, TXT (max 10MB)
                      </p>
                    </div>
                    <Button
                      onClick={handleFileUpload}
                      disabled={!uploadFile || uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Reference Document
                        </>
                      )}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="url" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="url-input">URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="url-input"
                          placeholder="https://example.com"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                        />
                        <Button
                          onClick={handleFetchUrl}
                          disabled={!urlInput.trim() || fetchingUrl}
                        >
                          {fetchingUrl ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Fetch'
                          )}
                        </Button>
                      </div>
                    </div>
                    {urlPreview && (
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{urlPreview.title}</p>
                          <Badge variant="secondary">
                            {urlPreview.metadata.wordCount} words
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {urlPreview.content.substring(0, 200)}...
                        </p>
                      </div>
                    )}
                    {urlPreview && (
                      <Button
                        onClick={handleAddUrl}
                        disabled={fetchingUrl}
                        className="w-full"
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Add URL as Context
                      </Button>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="custom" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="custom-title">Title</Label>
                      <Input
                        id="custom-title"
                        placeholder="Context title"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-content">Content (Markdown supported)</Label>
                      <Textarea
                        id="custom-content"
                        placeholder="Enter custom context information..."
                        rows={8}
                        value={customContent}
                        onChange={(e) => setCustomContent(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleAddCustomText}
                      disabled={!customTitle.trim() || !customContent.trim() || uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <FileCode className="h-4 w-4 mr-2" />
                          Add Custom Context
                        </>
                      )}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="integration" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Integration</Label>
                      <Select
                        value={selectedIntegration || ''}
                        onValueChange={(v) => setSelectedIntegration(v as 'jira' | 'confluence' | null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select integration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jira">Jira</SelectItem>
                          <SelectItem value="confluence">Confluence</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedIntegration && (
                      <>
                        <div className="space-y-2">
                          <Label>Search Pages</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Search pages..."
                              value={integrationSearch}
                              onChange={(e) => setIntegrationSearch(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSearchIntegrationPages()
                                }
                              }}
                            />
                            <Button
                              onClick={handleSearchIntegrationPages}
                              disabled={!integrationSearch.trim() || loadingIntegrationPages}
                            >
                              {loadingIntegrationPages ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Search className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        {integrationPages.length > 0 && (
                          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                            {integrationPages.map((page) => (
                              <div
                                key={page.id}
                                className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedIntegrationPages.has(page.id)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedIntegrationPages)
                                    if (e.target.checked) {
                                      newSet.add(page.id)
                                    } else {
                                      newSet.delete(page.id)
                                    }
                                    setSelectedIntegrationPages(newSet)
                                  }}
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{page.title}</p>
                                  <p className="text-xs text-muted-foreground">{page.url}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedIntegrationPages.size > 0 && (
                          <Button
                            onClick={handleAddIntegrationPages}
                            disabled={uploading}
                            className="w-full"
                          >
                            {uploading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Add {selectedIntegrationPages.size} Selected Page(s)
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <p className="text-sm text-blue-900 dark:text-blue-100">
            These reference materials are separate from generated project documents. They provide additional context to the AI when generating documents.
          </p>
        </div>
      </div>

      {/* Dashboard View */}
      {viewMode === 'dashboard' && analytics && (
        <div className="space-y-4">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalItems}</div>
                <p className="text-xs text-muted-foreground">{analytics.activeItems} active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reference Docs</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.itemsByType.reference_document || 0}</div>
                <p className="text-xs text-muted-foreground">Uploaded documents</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">URLs</CardTitle>
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.itemsByType.url || 0}</div>
                <p className="text-xs text-muted-foreground">External sources</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Content Size</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(analytics.totalContentSize / 1024)} KB
                </div>
                <p className="text-xs text-muted-foreground">Total content</p>
              </CardContent>
            </Card>
          </div>

          {/* Most Used Items */}
          {analytics.mostUsedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Most Frequently Used</CardTitle>
                <CardDescription>Context items used most often in document generation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.mostUsedItems.slice(0, 5).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                      <Badge variant="secondary">{item.usage_count} uses</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Recommendations
                </CardTitle>
                <CardDescription>Suggestions based on usage patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.slice(0, 5).map((rec) => (
                    <div key={rec.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{rec.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{rec.message}</p>
                        </div>
                        <Badge variant={rec.priority === 'high' ? 'default' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>Context Items</CardTitle>
            <CardDescription>
              {contextItems.length} reference material{contextItems.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contextItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No context items yet</p>
                <p className="text-sm mt-1">Add reference documents, URLs, or custom context to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === contextItems.length && contextItems.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(new Set(contextItems.map(i => i.id)))
                          } else {
                            setSelectedItems(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contextItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedItems)
                            if (e.target.checked) {
                              newSet.add(item.id)
                            } else {
                              newSet.delete(item.id)
                            }
                            setSelectedItems(newSet)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {getTypeIcon(item.type)}
                          {getTypeLabel(item.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => setPreviewItem(item)}
                          className="text-left hover:underline font-medium"
                        >
                          {item.title}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.priority > 0 ? 'default' : 'secondary'}>
                          {item.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.is_active}
                            onCheckedChange={() => handleToggleActive(item.id, item.is_active)}
                          />
                          {item.is_active ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewItem(item)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewItem.title}</DialogTitle>
              <DialogDescription>
                <Badge variant="outline" className="mr-2">
                  {getTypeLabel(previewItem.type)}
                </Badge>
                {previewItem.source_url && (
                  <a
                    href={previewItem.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 inline mr-1" />
                    View Source
                  </a>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="prose dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm">{previewItem.content}</pre>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
