"use client"

import { useEffect, useState } from "react"
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { FileText, Plus, Edit, Copy, Trash2, Download, Upload, Search, Filter } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Templates() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // handled by loadTemplates effect below; keep this effect minimal to satisfy React rules
    // (no-op here)
    return () => {}
  }, [])

  // load templates function (reusable by effects and manual refresh)
  const loadTemplates = async (opts?: { showLoading?: boolean }) => {
    if (opts?.showLoading !== false) setLoading(true)
    try {
      const resp = await apiClient.getTemplates({ limit: 50 })
      setTemplates(resp.templates || [])
    } catch (err: any) {
      console.error("Failed to load templates", err)
      toast.error(err?.message || "Failed to load templates")
    } finally {
      setLoading(false)
    }
  }
  // Polling and focus-based refresh: refresh every 15s and whenever window gains focus
  useEffect(() => {
    let mounted = true
    // initial load
    loadTemplates()

    const interval = setInterval(() => {
      if (!mounted) return
      loadTemplates({ showLoading: false })
    }, 15000)

    const onFocus = () => {
      if (!mounted) return
      loadTemplates({ showLoading: false })
  }
    // attach focus listener so switching back to the tab refreshes templates
    window.addEventListener("focus", onFocus)

    return () => {
      mounted = false
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFramework, setSelectedFramework] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null)

  // form fields
  const [formName, setFormName] = useState("")
  const [formFramework, setFormFramework] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [formVersion, setFormVersion] = useState("")
  const [formDescription, setFormDescription] = useState("")
  // client-side validation errors
  const [formErrors, setFormErrors] = useState<{ name?: string; framework?: string }>({})

  const openCreateDialog = () => {
    setEditingTemplate(null)
    setFormName("")
    setFormFramework("")
    setFormCategory("")
    setFormVersion("1.0")
    setFormDescription("")
    setIsDialogOpen(true)
  }

  const openEditDialog = (template: any) => {
  // prefer freshest template data from state by id (in case the passed object is stale)
  const fresh = templates.find((t) => String(t.id) === String(template?.id)) || template
  setEditingTemplate(fresh || null)
  setFormName(fresh?.name || "")
  setFormFramework(fresh?.framework || "")
  setFormCategory(fresh?.category || "")
  setFormVersion(fresh?.version ? String(fresh.version) : "1.0")
  setFormDescription(fresh?.description || "")
  setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingTemplate(null)
  }

  // Ensure form fields reflect the current editingTemplate when it changes
  useEffect(() => {
    if (editingTemplate) {
      setFormName(editingTemplate.name || "")
      setFormFramework(editingTemplate.framework || "")
      setFormCategory(editingTemplate.category || "")
      setFormVersion(editingTemplate.version ? String(editingTemplate.version) : "1.0")
      setFormDescription(editingTemplate.description || "")
    } else if (!isDialogOpen) {
      // clear when dialog closed and no editing template
      setFormName("")
      setFormFramework("")
      setFormCategory("")
      setFormVersion("")
      setFormDescription("")
    }
  }, [editingTemplate, isDialogOpen])
  const [submitting, setSubmitting] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [selectedTemplateForGeneration, setSelectedTemplateForGeneration] = useState<any | null>(null)
  const [generatePrompt, setGeneratePrompt] = useState("")
  const [generating, setGenerating] = useState(false)
  const [downloadingIds, setDownloadingIds] = useState<string[]>([])
  const [cloningIds, setCloningIds] = useState<string[]>([])
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<any | null>(null)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [trashTemplates, setTrashTemplates] = useState<any[]>([])
  const [loadingTrash, setLoadingTrash] = useState(false)
  const [trashPage, setTrashPage] = useState(1)
  const [trashLimit, setTrashLimit] = useState(10)
  const [trashPagination, setTrashPagination] = useState<any | null>(null)
  const [hardDeletingId, setHardDeletingId] = useState<string | null>(null)
  const [confirmHardDeleteTemplate, setConfirmHardDeleteTemplate] = useState<any | null>(null)
  const [isConfirmHardDeleteOpen, setIsConfirmHardDeleteOpen] = useState(false)

  const handleDownload = async (template: any) => {
    if (!template?.id) return
    const id = String(template.id)
    // avoid duplicate downloads
    if (downloadingIds.includes(id)) return
    setDownloadingIds((s) => [...s, id])
    try {
      const resp = await apiClient.getTemplate(id)
      const tmpl = resp
      const content = JSON.stringify(tmpl, null, 2)
      const blob = new Blob([content], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const safeName = (template.name || "template").replace(/[^a-z0-9\-_.]/gi, "_")
      a.href = url
      a.download = `${safeName}-${id}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success("Download started")
    } catch (err: any) {
      console.error("Failed to download template", err)
      toast.error(err?.message || "Failed to download template")
    } finally {
      setDownloadingIds((s) => s.filter((x) => x !== id))
    }
  }

  const handleClone = async (template: any) => {
    if (!template?.id) return
    const id = String(template.id)
    if (cloningIds.includes(id)) return
    setCloningIds((s) => [...s, id])
    try {
      // attempt to create a sensible default name for the clone
      const cloneName = `${template.name || 'template'} (copy)`
      // apiClient.cloneTemplate may accept optional data; pass name to give the clone a new name
      await apiClient.cloneTemplate(id, { name: cloneName })
      toast.success('Template cloned')
      // refresh list to show the new clone
      await loadTemplates({ showLoading: true })
    } catch (err: any) {
      console.error('Failed to clone template', err)
      toast.error(err?.message || 'Failed to clone template')
    } finally {
      setCloningIds((s) => s.filter((x) => x !== id))
    }
  }

  const openGenerateDialog = (template: any) => {
    setSelectedTemplateForGeneration(template)
    setGeneratePrompt(`Generate a document using the "${template.name || 'template'}" template.`)
    setGenerateDialogOpen(true)
  }

  const handleGenerateSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const template = selectedTemplateForGeneration
    if (!template?.id) return
    setGenerating(true)
    try {
      const response = await apiClient.generateContent({ prompt: generatePrompt, provider: 'openai', template_id: String(template.id) })
      // response may be string or object
      const content = typeof response === 'string' ? response : JSON.stringify(response, null, 2)
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const safeName = (template.name || 'generated').replace(/[^a-z0-9\-_.]/gi, '_')
      a.href = url
      a.download = `${safeName}-generated.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Generation complete — download started')
    } catch (err: any) {
      console.error('Failed to generate from template', err)
      toast.error(err?.message || 'Failed to generate from template')
    } finally {
      setGenerating(false)
      setGenerateDialogOpen(false)
      setSelectedTemplateForGeneration(null)
      setGeneratePrompt("")
    }
  }

  const loadTrash = async (page?: number) => {
    const p = page || trashPage
    setLoadingTrash(true)
    try {
      const resp = await apiClient.getDeletedTemplates({ page: p, limit: trashLimit })
      setTrashTemplates(resp.templates || [])
      setTrashPagination(resp.pagination || null)
      setTrashPage(p)
    } catch (err: any) {
      console.error('Failed to load trash', err)
      toast.error(err?.message || 'Failed to load trash')
    } finally {
      setLoadingTrash(false)
    }
  }

  const handleDelete = async (template: any) => {
    // open confirmation dialog instead of using window.confirm
    if (!template?.id) return
    setConfirmDeleteTemplate(template)
    setIsConfirmDeleteOpen(true)
  }

  const performDelete = async () => {
    const template = confirmDeleteTemplate
    if (!template?.id) {
      setIsConfirmDeleteOpen(false)
      setConfirmDeleteTemplate(null)
      return
    }
    const id = String(template.id)
    if (deletingIds.includes(id)) return
    setDeletingIds((s) => [...s, id])
    try {
      await apiClient.deleteTemplate(id)
      toast.success('Template deleted')
      await loadTemplates({ showLoading: true })
    } catch (err: any) {
      console.error('Failed to delete template', err)
      toast.error(err?.message || 'Failed to delete template')
    } finally {
      setDeletingIds((s) => s.filter((x) => x !== id))
      setIsConfirmDeleteOpen(false)
      setConfirmDeleteTemplate(null)
    }
  }

  const handleRestore = async (template: any) => {
    if (!template?.id) return
    try {
      await apiClient.restoreTemplate(String(template.id))
      toast.success('Template restored')
  await loadTemplates({ showLoading: true })
  // refresh current trash page
  await loadTrash(trashPage)
    } catch (err: any) {
      console.error('Failed to restore template', err)
      toast.error(err?.message || 'Failed to restore template')
    }
  }

  const handleConfirmHardDelete = (template: any) => {
    setConfirmHardDeleteTemplate(template)
    setIsConfirmHardDeleteOpen(true)
  }

  const performHardDelete = async () => {
    const template = confirmHardDeleteTemplate
    if (!template?.id) {
      setIsConfirmHardDeleteOpen(false)
      setConfirmHardDeleteTemplate(null)
      return
    }
    const id = String(template.id)
    if (hardDeletingId === id) return
    setHardDeletingId(id)
    try {
      await apiClient.hardDeleteTemplate(id)
      toast.success('Template permanently deleted')
  // Reload the current page after deletion
  await loadTrash(trashPage)
    } catch (err: any) {
      console.error('Failed to hard delete template', err)
      toast.error(err?.message || 'Failed to permanently delete template')
    } finally {
      setHardDeletingId(null)
      setIsConfirmHardDeleteOpen(false)
      setConfirmHardDeleteTemplate(null)
    }
  }

  const handleCreateOrUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    // client-side validation: require name and framework
    const errors: { name?: string; framework?: string } = {}
    if (!formName || formName.trim() === "") errors.name = "Template name is required"
    if (!formFramework || formFramework.trim() === "") errors.framework = "Framework is required"
    setFormErrors(errors)
    if (errors.name || errors.framework) {
      // don't proceed with submission
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        name: formName,
        description: formDescription,
        framework: formFramework,
        category: formCategory,
        content: { blocks: [] },
        variables: [],
        is_public: false,
      }

      if (editingTemplate) {
        await apiClient.updateTemplate(editingTemplate.id, payload)
        toast.success("Template updated")
      } else {
        await apiClient.createTemplate(payload)
        toast.success("Template created")
      }

      // Refresh templates from server to reflect DB state
      try {
        const resp = await apiClient.getTemplates({ limit: 50 })
        setTemplates(resp.templates || [])
      } catch (fetchErr) {
        console.warn("Failed to refresh templates after save", fetchErr)
      }

      closeDialog()
    } catch (err: any) {
      console.error(err)
      // If server returned structured validation details, show them to the user
      const details = err?.response?.data?.details || err?.response?.data?.errors
      if (Array.isArray(details) && details.length > 0) {
        const msg = details.map((d: any) => `${d.field || d.path || ''}: ${d.message || d}`).join('\n')
        toast.error(msg)
      } else {
        toast.error(err?.message || "Failed to save template")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFramework = selectedFramework === "all" || template.framework === selectedFramework
    return matchesSearch && matchesFramework
  })

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Document Templates</h1>
                <p className="text-muted-foreground">
                  Manage and configure document templates for BABOK, PMBOK, and DMBOK standards
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Template
                </Button>
                <Button variant="outline" onClick={() => loadTemplates({ showLoading: true })}>
                  Refresh
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(Boolean(open)); if (!open) { setEditingTemplate(null); } }}>
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                  <DialogContent className="sm:max-w-[600px]">
                    <form onSubmit={handleCreateOrUpdate}>
                      <DialogHeader>
                        <DialogTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
                        <DialogDescription>{editingTemplate ? "Update the template metadata." : "Create a new document template for the ADPA framework."}</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Template Name</label>
                            <Input
                              placeholder="Enter template name"
                              className="mt-1"
                              value={formName}
                              onChange={(e) => {
                                setFormName(e.target.value)
                                if (formErrors.name) setFormErrors((s) => ({ ...s, name: undefined }))
                              }}
                            />
                            {formErrors.name && <p className="text-sm text-destructive mt-1">{formErrors.name}</p>}
                          </div>
                          <div>
                            <label className="text-sm font-medium">Framework</label>
                            <label htmlFor="framework-select" className="sr-only">Framework</label>
                            <select
                              id="framework-select"
                              title="Framework"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                              value={formFramework}
                              onChange={(e) => {
                                setFormFramework(e.target.value)
                                if (formErrors.framework) setFormErrors((s) => ({ ...s, framework: undefined }))
                              }}
                            >
                              <option value="">Select framework</option>
                              <option value="BABOK v3">BABOK v3</option>
                              <option value="PMBOK 7">PMBOK 7</option>
                              <option value="DMBOK 2.0">DMBOK 2.0</option>
                              <option value="TOGAF">TOGAF</option>
                              <option value="SABSA">SABSA</option>
                              <option value="COBIT">COBIT</option>
                              <option value="ITIL">ITIL</option>
                              <option value="Custom">Custom</option>
                            </select>
                            {formErrors.framework && <p className="text-sm text-destructive mt-1">{formErrors.framework}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Category</label>
                            <Input placeholder="e.g., Requirements, Planning" className="mt-1" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Version</label>
                            <Input placeholder="1.0" value={formVersion} onChange={(e) => setFormVersion(e.target.value)} className="mt-1" />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Description</label>
                          <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                            placeholder="Describe the purpose and usage of this template"
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting}>Cancel</Button>
                          <Button type="submit" disabled={submitting}>{submitting ? (editingTemplate ? "Saving..." : "Creating...") : (editingTemplate ? "Save Changes" : "Create Template")}</Button>
                        </div>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                {/* Confirm Delete Dialog */}
                <Dialog open={isConfirmDeleteOpen} onOpenChange={(open) => { if (!open) { setIsConfirmDeleteOpen(false); setConfirmDeleteTemplate(null) } }}>
                  <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                      <DialogTitle>Delete Template</DialogTitle>
                      <DialogDescription>Are you sure you want to delete this template? This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm">{confirmDeleteTemplate?.name}</p>
                    </div>
                    <DialogFooter>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setIsConfirmDeleteOpen(false); setConfirmDeleteTemplate(null) }} disabled={deletingIds.length > 0}>Cancel</Button>
                        <Button onClick={performDelete} disabled={confirmDeleteTemplate ? deletingIds.includes(String(confirmDeleteTemplate.id)) : false} variant="destructive">Delete</Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* Hard Delete Dialog for Trash */}
                <Dialog open={isConfirmHardDeleteOpen} onOpenChange={(open) => { if (!open) { setIsConfirmHardDeleteOpen(false); setConfirmHardDeleteTemplate(null) } }}>
                  <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                      <DialogTitle>Permanently Delete Template</DialogTitle>
                      <DialogDescription>This action permanently removes the template and cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm">{confirmHardDeleteTemplate?.name}</p>
                    </div>
                    <DialogFooter>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setIsConfirmHardDeleteOpen(false); setConfirmHardDeleteTemplate(null) }} disabled={!!hardDeletingId}>Cancel</Button>
                        <Button variant="destructive" onClick={performHardDelete} disabled={!!hardDeletingId}>Delete Permanently</Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* Generate from Template Dialog */}
                <Dialog open={generateDialogOpen} onOpenChange={(open) => { if (!open) { setGenerateDialogOpen(false); setSelectedTemplateForGeneration(null); setGeneratePrompt("") } }}>
                  <DialogContent className="sm:max-w-[600px]">
                    <form onSubmit={handleGenerateSubmit}>
                      <DialogHeader>
                        <DialogTitle>Generate From Template</DialogTitle>
                        <DialogDescription>Provide a prompt to generate a document using this template.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div>
                          <label className="text-sm font-medium">Prompt</label>
                          <textarea aria-label="Generate prompt" placeholder="Provide instructions for the document generation" className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" value={generatePrompt} onChange={(e) => setGeneratePrompt(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => { setGenerateDialogOpen(false); setSelectedTemplateForGeneration(null); setGeneratePrompt("") }} disabled={generating}>Cancel</Button>
                          <Button type="submit" disabled={generating}>{generating ? 'Generating...' : 'Generate'}</Button>
                        </div>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  title="Framework"
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedFramework}
                  onChange={(e) => setSelectedFramework(e.target.value)}
                >
                  <option value="all">All Frameworks</option>
                  <option value="BABOK v3">BABOK v3</option>
                  <option value="PMBOK 7">PMBOK 7</option>
                  <option value="DMBOK 2.0">DMBOK 2.0</option>
                </select>
              </div>
            </div>

            <Tabs defaultValue="grid" className="space-y-4">
              <TabsList>
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="categories">By Category</TabsTrigger>
                <TabsTrigger value="trash" onClick={() => loadTrash()}>Trash</TabsTrigger>
              </TabsList>

              <TabsContent value="grid" className="space-y-4">
                {loading && (
                  <div className="p-6 text-center text-sm text-muted-foreground">Loading templates...</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <FileText className="h-8 w-8 text-primary" />
                          <div className="flex space-x-1">
                            <Badge variant={template.status === "active" ? "default" : "secondary"}>
                              {template.status}
                            </Badge>
                            <Badge variant="outline">{template.framework}</Badge>
                          </div>
                        </div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Version:</span>
                            <span className="font-medium">{template.version}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Usage:</span>
                            <span className="font-medium">{template.usage} times</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Modified:</span>
                            <span className="font-medium">{template.lastModified}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Author:</span>
                            <span className="font-medium">{template.author}</span>
                          </div>

                          <div className="flex space-x-2 pt-2">
                            <Button size="sm" className="flex-1" onClick={() => openEditDialog(template)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openGenerateDialog(template)}>
                              <Plus className="h-4 w-4 mr-1" />
                              Generate
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleClone(template)} disabled={cloningIds.includes(String(template.id))}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(template)}
                              disabled={downloadingIds.includes(String(template.id))}
                            >
                              <Download className="h-4 w-4" />
                              {downloadingIds.includes(String(template.id)) ? <span className="sr-only">Downloading</span> : null}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(template)} disabled={deletingIds.includes(String(template.id))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="list" className="space-y-4">
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <FileText className="h-6 w-6 text-primary" />
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold">{template.name}</h3>
                                <Badge variant={template.status === "active" ? "default" : "secondary"}>
                                  {template.status}
                                </Badge>
                                <Badge variant="outline">{template.framework}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                                <span>v{template.version}</span>
                                <span>•</span>
                                <span>{template.usage} uses</span>
                                <span>•</span>
                                <span>Modified {template.lastModified}</span>
                                <span>•</span>
                                <span>by {template.author}</span>
                              </div>
                            </div>
                          </div>
                            <div className="flex space-x-2">
                            <Button size="sm" onClick={() => openEditDialog(template)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openGenerateDialog(template)}>
                              <Plus className="h-4 w-4 mr-1" />
                              Generate
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleClone(template)} disabled={cloningIds.includes(String(template.id))}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(template)}
                              disabled={downloadingIds.includes(String(template.id))}
                            >
                              <Download className="h-4 w-4" />
                              {downloadingIds.includes(String(template.id)) ? <span className="sr-only">Downloading</span> : null}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(template)} disabled={deletingIds.includes(String(template.id))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="categories" className="space-y-4">
                {[
                  "Requirements",
                  "Project Management",
                  "Data Management",
                  "Stakeholder Management",
                  "Risk Management",
                ].map((category) => {
                  const categoryTemplates = filteredTemplates.filter((t) => t.category === category)
                  if (categoryTemplates.length === 0) return null

                  return (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle className="text-lg">{category}</CardTitle>
                        <CardDescription>{categoryTemplates.length} templates</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryTemplates.map((template) => (
                            <div
                              key={template.id}
                              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{template.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {template.framework}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>v{template.version}</span>
                                <span>{template.usage} uses</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </TabsContent>
              <TabsContent value="trash" className="space-y-4">
                {loadingTrash ? (
                  // show skeleton placeholders while loading
                  <div className="space-y-3">
                    {[...Array(Math.min(3, trashLimit || 3)).keys()].map((i) => (
                      <Card key={`skeleton-${i}`} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <SkeletonLine className="h-4 w-3/4 mb-2" />
                              <SkeletonLine className="h-3 w-1/3" />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Skeleton className="h-8 w-20" />
                              <Skeleton className="h-8 w-28" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trashTemplates.length === 0 && (
                      <div className="p-4 text-sm text-muted-foreground">No deleted templates</div>
                    )}
                    {trashTemplates.map((template) => (
                      <Card key={template.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{template.name}</h3>
                              <p className="text-sm text-muted-foreground">Deleted: {template.deleted_at}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" onClick={() => handleRestore(template)} disabled={loadingTrash}>Restore</Button>
                              <Button variant="destructive" size="sm" onClick={() => handleConfirmHardDelete(template)} disabled={loadingTrash || hardDeletingId === String(template.id)}>Delete Permanently</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {trashPagination && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-muted-foreground">Page {trashPagination.page} of {trashPagination.pages} — {trashPagination.total} items</div>
                      <div className="flex items-center space-x-2 text-sm">
                        <label className="text-sm text-muted-foreground">Per page</label>
                        <select
                          aria-label="Items per page"
                          value={trashLimit}
                          onChange={(e) => {
                            const v = Number(e.target.value) || 10
                            setTrashLimit(v)
                            setTrashPage(1)
                            loadTrash(1)
                          }}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                          disabled={loadingTrash}
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={1}
                        max={trashPagination.pages}
                        value={trashPage}
                        onChange={(e) => setTrashPage(Number(e.target.value || 1))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            let p = Number(trashPage) || 1
                            p = Math.max(1, Math.min(trashPagination.pages, p))
                            setTrashPage(p)
                            loadTrash(p)
                          }
                        }}
                        onBlur={() => {
                          let p = Number(trashPage) || 1
                          p = Math.max(1, Math.min(trashPagination.pages, p))
                          setTrashPage(p)
                          loadTrash(p)
                        }}
                        className="w-16 rounded-md border border-input px-2 py-1 text-sm"
                        disabled={loadingTrash}
                        aria-label="Page number"
                      />
                      {loadingTrash && (
                        <svg className="animate-spin h-5 w-5 text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                      )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { const p = Math.max(1, trashPage - 1); setTrashPage(p); loadTrash(p) }} disabled={loadingTrash || trashPage <= 1}>Prev</Button>
                      <Button variant="outline" size="sm" onClick={() => { const p = Math.min(trashPagination.pages, trashPage + 1); setTrashPage(p); loadTrash(p) }} disabled={loadingTrash || trashPage >= trashPagination.pages}>Next</Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
