"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ArrowLeft, FileText, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient, Template } from "@/lib/api"
import { toast } from "sonner"

export default function NewDocumentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get("projectId")
  const { user, loading: authLoading } = useAuth()

  const [project, setProject] = useState<any>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_id: "",
    content: "",
    status: "draft" as const
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
      return
    }

    if (!projectId) {
      toast.error("Project ID is required")
      router.push("/projects")
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        const [projectData, templatesResponse] = await Promise.all([
          apiClient.getProject(projectId),
          apiClient.getTemplates()
        ])
        setProject(projectData)
        // getTemplates returns { templates: Template[], pagination: any }
        setTemplates(templatesResponse.templates || [])
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast.error("Failed to load project or templates")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [projectId, user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Document name is required")
      return
    }

    if (!projectId) {
      toast.error("Project ID is required")
      return
    }

    try {
      setCreating(true)
      
      const documentData = {
        name: formData.name,
        content: formData.content || "",
        template_id: formData.template_id || undefined,
        status: formData.status,
        ...(formData.description && { description: formData.description })
      }

      const newDocument = await apiClient.createDocument(projectId, documentData)
      
      toast.success("Document created successfully!")
      router.push(`/projects/${projectId}/documents/${newDocument.id}`)
    } catch (error: any) {
      console.error("Failed to create document:", error)
      toast.error(error?.message || "Failed to create document")
    } finally {
      setCreating(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Project not found</p>
                <Button onClick={() => router.push("/projects")} className="mt-4">
                  Back to Projects
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/projects/${projectId}/documents`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Create New Document</h1>
                <p className="text-muted-foreground">
                  Add a new document to {project.name}
                </p>
              </div>
            </div>

            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle>Document Details</CardTitle>
                <CardDescription>
                  Fill in the details to create a new document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Document Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Document Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., Project Charter, Requirements Document"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the document..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  {/* Template Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="template">Template (Optional)</Label>
                    <select
                      id="template"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.template_id}
                      onChange={(e) =>
                        setFormData({ ...formData, template_id: e.target.value })
                      }
                    >
                      <option value="">No template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Select a template to pre-populate the document structure
                    </p>
                  </div>

                  {/* Initial Content */}
                  <div className="space-y-2">
                    <Label htmlFor="content">Initial Content (Optional)</Label>
                    <Textarea
                      id="content"
                      placeholder="Enter initial markdown content..."
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can add content now or edit it later. Markdown is supported.
                    </p>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as "draft" | "published" | "review"
                        })
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="review">In Review</option>
                      <option value="published">Published</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-4 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/projects/${projectId}/documents`)}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Create Document
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

