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
import { ArrowLeft, FileText, Loader2 } from "@/components/ui/icons-shim"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient, Template } from "@/lib/api"
import { toast } from "sonner"

export default function NewDocumentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // content of page.tsx
  const urlProjectId = searchParams.get("projectId")
  const { user, loading: authLoading } = useAuth()

  const [project, setProject] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_id: "",
    content: "",
    status: "draft" as "draft" | "published" | "review",
    project_id: urlProjectId || "",
    ai_provider: "",
    ai_model: "",
    temperature: 0.7,
    max_tokens: 8000
  })

  const [aiProviders, setAIProviders] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)

        const promises: Promise<any>[] = [apiClient.getTemplates()]

        if (urlProjectId) {
          promises.push(apiClient.getProject(urlProjectId))
        } else {
          // If no project ID in URL, fetch all projects for selection
          promises.push(apiClient.getProjects({ limit: 100 }))
        }

        const results = await Promise.all(promises)
        const templatesResponse = results[0]
        const projectOrProjects = results[1]

        // getTemplates returns { templates: Template[], pagination: any }
        setTemplates(templatesResponse.templates || [])

        if (urlProjectId) {
          setProject(projectOrProjects)
          setFormData(prev => ({ ...prev, project_id: urlProjectId }))
        } else {
          setProjects(projectOrProjects.projects || [])
        }

        // Fetch AI Providers
        const providers = await apiClient.getAIProviders()
        setAIProviders(providers)
        if (providers.length > 0) {
          setFormData(prev => ({ ...prev, ai_provider: providers[0].name }))
          // Fetch models for first provider
          const modelData = await apiClient.getProviderModels(providers[0].id)
          const models = modelData.models || []
          setModels(models)
          if (models.length > 0) {
            setFormData(prev => ({ ...prev, ai_model: models[0].name }))
          }
        }
      } catch (error) {
        // When provider changes, fetch models
        useEffect(() => {
          if (formData.ai_provider) {
            (async () => {
              const provider = aiProviders.find(p => p.name === formData.ai_provider)
              if (provider) {
                const modelData = await apiClient.getProviderModels(provider.id)
                const models = modelData.models || []
                setModels(models)
                if (models.length > 0) {
                  setFormData(prev => ({ ...prev, ai_model: models[0].name }))
                }
              }
            })()
          }
        }, [formData.ai_provider])
        console.error("Failed to fetch data:", error)
        toast.error("Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [urlProjectId, user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Document name is required")
      return
    }

    if (!formData.project_id) {
      toast.error("Project is required")
      return
    }

    try {
      setCreating(true)

      const documentData = {
        name: formData.name,
        content: formData.content || "",
        template_id: formData.template_id || undefined,
        status: formData.status,
        ...(formData.description && { description: formData.description }),
        ai_provider: formData.ai_provider,
        ai_model: formData.ai_model,
        temperature: formData.temperature,
        max_tokens: formData.max_tokens
      }

      const newDocument = await apiClient.createDocument(formData.project_id, documentData)

      toast.success("Document created successfully!")
      router.push(`/projects/${formData.project_id}/documents/${newDocument.id}`)
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
                onClick={() => urlProjectId ? router.push(`/projects/${urlProjectId}/documents`) : router.push('/documents')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Create New Document</h1>
                <p className="text-muted-foreground">
                  {project ? `Add a new document to ${project.name}` : 'Create a new document'}
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

                  {/* Project Selection (if not pre-selected) */}
                  {!urlProjectId && (
                    <div className="space-y-2">
                      <Label htmlFor="project">Project <span className="text-red-500">*</span></Label>
                      <select
                        id="project"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.project_id}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, project_id: e.target.value })}
                        required
                      >
                        <option value="">Select a project</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
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
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
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
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
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
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
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

                  {/* AI Provider Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="ai_provider">AI Provider</Label>
                    <select
                      id="ai_provider"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.ai_provider}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, ai_provider: e.target.value })}
                    >
                      {aiProviders.map((provider) => (
                        <option key={provider.id} value={provider.name}>{provider.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="ai_model">Model</Label>
                    <select
                      id="ai_model"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.ai_model}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, ai_model: e.target.value })}
                    >
                      {models.map((model) => (
                        <option key={model.name} value={model.name}>{model.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Temperature */}
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature</Label>
                    <input
                      id="temperature"
                      type="number"
                      min={0}
                      max={2}
                      step={0.01}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Lower = more focused, Higher = more creative</p>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-2">
                    <Label htmlFor="max_tokens">Max Output Tokens</Label>
                    <input
                      id="max_tokens"
                      type="number"
                      min={100}
                      max={32000}
                      step={100}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.max_tokens}
                      onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Maximum number of tokens the model can generate</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-4 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => urlProjectId ? router.push(`/projects/${urlProjectId}/documents`) : router.push('/documents')}
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
      </div >
    </div >
  )
}

