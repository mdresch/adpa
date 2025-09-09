"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Settings, Plus, Edit, Trash2, CheckCircle, AlertCircle, Zap, Eye, EyeOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import googleProviderStubRaw from "./google"

const googleProviderStub = {
  id: "2",
  name: "Google AI",
  type: "google",
  model: "gemini-pro",
  status: "active",
  apiKey: "*********************",
  endpoint: "https://generativelanguage.googleapis.com",
  priority: 2,
  enabled: true,
  lastUsed: "10 minutes ago",
  requestCount: 456,
  errorRate: 0.1,
  // You can spread googleProviderStubRaw if needed for additional properties
  ...googleProviderStubRaw,
}

export default function AIProviders() {
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  // Allow overriding API base in dev via NEXT_PUBLIC_API_BASE (e.g. http://localhost:3001)
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "")
  const apiUrl = (path: string) => (apiBase ? `${apiBase}${path}` : path)
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  // Add / edit dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpenId, setEditDialogOpenId] = useState<string | null>(null)

  const [formState, setFormState] = useState({
    id: "",
    name: "",
    type: "openai",
    model: "",
    apiKey: "",
    endpoint: "",
    priority: 1,
    enabled: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const resetForm = () =>
    setFormState({ id: "", name: "", type: "openai", model: "", apiKey: "", endpoint: "", priority: 1, enabled: true })

  const validateForm = (state = formState) => {
    const errs: Record<string, string> = {}
    if (!state.name || state.name.trim().length < 2) {
      errs.name = "Name is required (min 2 characters)"
    }

    // Map some UI types to server provider types when validating
    const uiType = state.type
    const providerType = uiType === "azure-openai" ? "azure" : uiType === "copilot" || uiType === "ollama" ? "openai" : uiType

    if (!["openai", "google", "azure"].includes(providerType)) {
      errs.type = "Unsupported provider type for creation. Choose OpenAI, Google, or Azure."
    }

    if (!state.apiKey || state.apiKey.trim().length < 16) {
      errs.apiKey = "API key looks too short. Paste the full key (min 16 chars)."
    } else if (providerType === "openai" && !state.apiKey.startsWith("sk-")) {
      // gentle hint, not a hard block
      errs.apiKey = "OpenAI keys usually start with 'sk-'. Verify you pasted the right key."
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // run validation live when the form changes
  useEffect(() => {
    validateForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState])

  const isFormValid = Object.keys(formErrors).length === 0

  const handleAddProvider = (e: React.FormEvent) => {
    e.preventDefault()
  if (!validateForm()) return
  ;(async () => {
      setActionLoading((s) => ({ ...s, create: true }))
      setError(null)
      try {
  const resp = await fetch(apiUrl(`/api/context-ai/providers`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: formState.name,
            provider_type: formState.type,
            api_key: formState.apiKey,
            configuration: { model: formState.model, endpoint: formState.endpoint, priority: formState.priority },
          }),
        })

        if (!resp.ok) {
          const body = await resp.text()
          throw new Error(`Create failed: ${resp.status} ${body}`)
        }

  await loadProviders()
  resetForm()
  setAddDialogOpen(false)
  toast.success("Provider created")
      } catch (err: any) {
        console.error(err)
        setError(err?.message || "Failed to create provider")
  toast.error(err?.message || "Failed to create provider")
      } finally {
        setActionLoading((s) => ({ ...s, create: false }))
      }
    })()
  }

  const handleEditProvider = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDialogOpenId) return
  if (!validateForm()) return
  ;(async () => {
      setActionLoading((s) => ({ ...s, [editDialogOpenId]: true }))
      setError(null)
      try {
  const resp = await fetch(apiUrl(`/api/context-ai/providers/${encodeURIComponent(formState.id || editDialogOpenId)}/configure`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            api_key: formState.apiKey,
            configuration: { model: formState.model, endpoint: formState.endpoint, priority: formState.priority },
            is_active: formState.enabled,
          }),
        })

        if (!resp.ok) {
          const body = await resp.text()
          throw new Error(`Update failed: ${resp.status} ${body}`)
        }

  await loadProviders()
  setEditDialogOpenId(null)
  resetForm()
  toast.success("Provider updated")
      } catch (err: any) {
        console.error(err)
        setError(err?.message || "Failed to update provider")
  toast.error(err?.message || "Failed to update provider")
      } finally {
        setActionLoading((s) => ({ ...s, [editDialogOpenId]: false }))
      }
    })()
  }

  const handleDeleteProvider = (id: string) => {
    // open confirmation dialog
    const p = providers.find((x) => x.id === id || x.name === id)
    setDeleteTarget({ id, name: p?.name || id })
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setActionLoading((s) => ({ ...s, [id]: true }))
    setError(null)
    try {
  const resp = await fetch(apiUrl(`/api/context-ai/providers/${encodeURIComponent(id)}`), {
        method: "DELETE",
        credentials: "include",
      })

      if (!resp.ok) {
        const body = await resp.text()
        throw new Error(`Delete failed: ${resp.status} ${body}`)
      }

  await loadProviders()
  setDeleteDialogOpen(false)
  setDeleteTarget(null)
  toast.success("Provider deleted")
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Failed to delete provider")
  toast.error(err?.message || "Failed to delete provider")
    } finally {
      setActionLoading((s) => ({ ...s, [id]: false }))
    }
  }

  const handleToggleEnabled = (id: string) => {
    ;(async () => {
      setActionLoading((s) => ({ ...s, [id]: true }))
      setError(null)
      try {
        const p = providers.find((x) => x.id === id || x.name === id)
        const newEnabled = !p?.enabled
  const resp = await fetch(apiUrl(`/api/context-ai/providers/${encodeURIComponent(id)}/configure`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ is_active: newEnabled }),
        })

        if (!resp.ok) {
          const body = await resp.text()
          throw new Error(`Toggle failed: ${resp.status} ${body}`)
        }

        await loadProviders()
      } catch (err: any) {
        console.error(err)
        setError(err?.message || "Failed to toggle provider")
      } finally {
        setActionLoading((s) => ({ ...s, [id]: false }))
      }
    })()
  }

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKey((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }))
  }

  // Load providers from backend
  const loadProviders = async () => {
    setLoading(true)
    setError(null)
    try {
      // Prefer the context-aware providers endpoint which returns providers with context support
      const resp = await fetch(apiUrl(`/api/context-ai/providers`), { credentials: "include" })
      if (!resp.ok) {
        const body = await resp.text()
        throw new Error(`Failed to load providers: ${resp.status} ${body}`)
      }
      const payload = await resp.json()
      // payload may be { providers: [...] } or an array directly
      const data = Array.isArray(payload) ? payload : payload?.providers ?? []
      // normalize providers (some endpoints may return name instead of id)
      const normalized = data.map((p: any) => ({ id: p.name || p.id, ...p }))
      setProviders(normalized)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Failed to load providers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProviders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">AI Providers</h1>
                <p className="text-muted-foreground">Configure and manage AI providers for document generation</p>
              </div>
              <>
                <Button onClick={() => { resetForm(); setAddDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Provider
                </Button>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleAddProvider}>
                    <DialogHeader>
                      <DialogTitle>Add AI Provider</DialogTitle>
                      <DialogDescription>Configure a new AI provider for document generation.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="provider-type" className="text-right">
                          Provider
                        </Label>
                        <Select onValueChange={(val) => setFormState((s) => ({ ...s, type: val }))}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="google">Google AI</SelectItem>
                            <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
                            <SelectItem value="ollama">Ollama</SelectItem>
                            <SelectItem value="copilot">GitHub Copilot</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <div className="col-span-3">
                          <Input id="name" value={formState.name} onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))} placeholder="Provider name" />
                          {formErrors.name && <div className="text-xs text-red-600 mt-1">{formErrors.name}</div>}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="api-key" className="text-right">
                          API Key
                        </Label>
                        <div className="col-span-3">
                          <Input id="api-key" type="password" value={formState.apiKey} onChange={(e) => setFormState((s) => ({ ...s, apiKey: e.target.value }))} placeholder="Enter API key" />
                          {formErrors.apiKey && <div className="text-xs text-red-600 mt-1">{formErrors.apiKey}</div>}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="model" className="text-right">
                          Model
                        </Label>
                        <Input id="model" value={formState.model} onChange={(e) => setFormState((s) => ({ ...s, model: e.target.value }))} placeholder="e.g., gpt-4o" className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={!isFormValid}>Add Provider</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
                </>
            </div>

            <Tabs defaultValue="providers" className="space-y-4">
              <TabsList>
                <TabsTrigger value="providers">Providers</TabsTrigger>
                <TabsTrigger value="failover">Failover Settings</TabsTrigger>
                <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="providers" className="space-y-4">
                <div className="grid gap-4">
                  {providers.map((provider) => (
                    <Card key={provider.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Zap className="h-8 w-8 text-primary" />
                            <div>
                              <CardTitle className="flex items-center space-x-2">
                                <span>{provider.name}</span>
                                <Badge variant={provider.status === "active" ? "default" : "secondary"}>
                                  {provider.status}
                                </Badge>
                              </CardTitle>
                              <CardDescription>
                                Model: {provider.model} • Priority: {provider.priority} • Last used: {provider.lastUsed}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch checked={provider.enabled} onCheckedChange={() => handleToggleEnabled(provider.id)} />
                            <Button variant="ghost" size="sm" onClick={() => {
                              // populate form and open edit dialog
                              setFormState({
                                id: provider.id,
                                name: provider.name,
                                type: provider.type || "openai",
                                model: provider.model || "",
                                apiKey: provider.apiKey || "",
                                endpoint: provider.endpoint || "",
                                priority: provider.priority || 1,
                                enabled: provider.enabled ?? true,
                              })
                              setEditDialogOpenId(provider.id)
                            }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteProvider(provider.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium">API Endpoint</Label>
                            <p className="text-sm text-muted-foreground mt-1">{provider.endpoint}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">API Key</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="text-sm text-muted-foreground font-mono">
                                {showApiKey[provider.id]
                                  ? provider.apiKey ?? ""
                                  : (provider.apiKey ?? "").replace(/./g, "*")}
                              </p>
                              <Button variant="ghost" size="sm" onClick={() => toggleApiKeyVisibility(provider.id)}>
                                {showApiKey[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={async () => {
                                try {
                                  setActionLoading((s) => ({ ...s, [provider.id || provider.name]: true }))
                                  setError(null)

                                                          const endpoint = provider.type?.includes("google")
                                                            ? apiUrl(`/api/context-ai/google/test/${encodeURIComponent(provider.name)}`)
                                                            : apiUrl(`/api/context-ai/openai/test/${encodeURIComponent(provider.name)}`)

                                  const resp = await fetch(endpoint, { method: "POST", credentials: "include" })
                                  if (!resp.ok) {
                                    const body = await resp.text()
                                    throw new Error(`Test failed: ${resp.status} ${body}`)
                                  }

                                  const result = await resp.json().catch(() => null)
                                  console.log("Test result:", result)
                                  toast.success("Provider test completed")
                                } catch (err: any) {
                                  console.error(err)
                                  setError(err?.message || "Provider test failed")
                                  toast.error(err?.message || "Provider test failed")
                                } finally {
                                  setActionLoading((s) => ({ ...s, [provider.id || provider.name]: false }))
                                }
                              }}>
                                <Zap className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Performance</Label>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">{provider.requestCount} requests</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm">{provider.errorRate}% errors</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {/* Edit Provider Dialog */}
                <Dialog open={!!editDialogOpenId} onOpenChange={(open) => { if (!open) setEditDialogOpenId(null) }}>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleEditProvider}>
                      <DialogHeader>
                        <DialogTitle>Edit AI Provider</DialogTitle>
                        <DialogDescription>Edit an existing AI provider.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Name</Label>
                          <div className="col-span-3">
                            <Input value={formState.name} onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))} />
                            {formErrors.name && <div className="text-xs text-red-600 mt-1">{formErrors.name}</div>}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">API Key</Label>
                          <div className="col-span-3">
                            <Input type="password" value={formState.apiKey} onChange={(e) => setFormState((s) => ({ ...s, apiKey: e.target.value }))} />
                            {formErrors.apiKey && <div className="text-xs text-red-600 mt-1">{formErrors.apiKey}</div>}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Model</Label>
                          <Input value={formState.model} onChange={(e) => setFormState((s) => ({ ...s, model: e.target.value }))} className="col-span-3" />
                        </div>
                      </div>
                      {formErrors && Object.keys(formErrors).length > 0 && (
                        <div className="text-sm text-red-600 py-2">
                          {Object.values(formErrors).map((m) => (
                            <div key={m}>{m}</div>
                          ))}
                        </div>
                      )}
                      <DialogFooter>
                        <Button type="submit" disabled={Object.keys(formErrors).length > 0}>Save Changes</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Delete confirmation dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Confirm delete</DialogTitle>
                      <DialogDescription>Deleting a provider is irreversible. This will remove its configuration and any usage history links.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null) }}>Cancel</Button>
                      <Button className="ml-2" onClick={confirmDelete} disabled={!deleteTarget || !!actionLoading[deleteTarget?.id || ""]}>Delete</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              <TabsContent value="failover" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Failover Configuration</CardTitle>
                    <CardDescription>
                      Configure automatic failover between AI providers when primary providers are unavailable
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Enable Automatic Failover</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically switch to backup providers when primary fails
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label>Failover Priority Order</Label>
                      <div className="space-y-2">
                        {providers
                          .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
                          .map((provider, index) => (
                            <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                                  {index + 1}
                                </span>
                                <span className="font-medium">{provider.name}</span>
                                <Badge variant="outline">{provider.model}</Badge>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Total Requests Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">2,479</div>
                      <p className="text-sm text-muted-foreground">+12% from yesterday</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Average Response Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">1.2s</div>
                      <p className="text-sm text-muted-foreground">-0.3s from yesterday</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">99.7%</div>
                      <p className="text-sm text-muted-foreground">+0.2% from yesterday</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
