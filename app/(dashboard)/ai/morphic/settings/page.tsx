'use client'

export const dynamic = 'force-dynamic'


import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, 
  Cpu, 
  Zap, 
  Database, 
  ShieldCheck, 
  RefreshCw, 
  Activity,
  CheckCircle2,
  AlertCircle,
  X,
  Pencil,
  ArrowLeft,
  ChevronRight,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'

import { apiClient } from '@/lib/api'
import { Button } from '@/components/morphic/ui/button'
import { cn } from '@/lib/morphic/utils'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/morphic/ui/switch'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

// --- Constants ---
const SEARCH_MODES = [
  { id: 'quick', name: 'Quick Search', icon: Zap },
  { id: 'adaptive', name: 'Adaptive Research', icon: Activity }
]

const MODEL_TYPES = [
  { id: 'speed', name: 'Performance (Speed)', icon: Zap },
  { id: 'quality', name: 'Intelligence (Quality)', icon: Cpu }
]

// --- Components ---

const StatusOrb = ({ active }: { active: boolean }) => (
  <div className="relative flex items-center justify-center size-3">
    <div className={cn(
      "absolute inset-0 rounded-full animate-ping opacity-75",
      active ? "bg-emerald-400" : "bg-slate-400"
    )} />
    <div className={cn(
      "relative size-2 rounded-full",
      active ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-500"
    )} />
  </div>
)

export default function MorphicMissionControl() {
  const [providers, setProviders] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orchestration' | 'providers'>('orchestration')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addMode, setAddMode] = useState<'provider' | 'model'>('provider')
  const [showEditProviderModal, setShowEditProviderModal] = useState(false)
  const [editTab, setEditTab] = useState<'provider' | 'model'>('provider')
  const [editProvider, setEditProvider] = useState({
    id: '',
    name: '',
    type: 'google',
    baseUrl: '',
    apiKey: '',
    isEnabled: true,
    priority: 1,
    defaultModel: ''
  })
  const [editModel, setEditModel] = useState<any | null>(null)
  const [newProvider, setNewProvider] = useState({
    id: '',
    name: '',
    type: 'google',
    baseUrl: '',
    apiKey: '',
    isEnabled: true,
    priority: 1
  })
  const [newModel, setNewModel] = useState({
    id: '',
    providerId: 'google',
    name: 'Gemini 2.5 Flash',
    modelId: 'gemini-2.5-flash',
    isEnabled: true
  })

  // Load Data
  const loadData = async () => {
    setLoading(true)
    try {
      const [pRes, mRes, cRes] = await Promise.all([
        apiClient.request<any[]>('/morphic/admin/providers', { method: 'GET' }),
        apiClient.request<any[]>('/morphic/admin/models', { method: 'GET' }),
        apiClient.request<any[]>('/morphic/admin/config', { method: 'GET' })
      ])
      setProviders(pRes || [])
      setModels(mRes || [])
      setConfigs(cRes || [])
    } catch (error: any) {
      toast.error('Failed to load Mission Control data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleProvider = async (provider: any) => {
    try {
      await apiClient.request('/morphic/admin/providers', {
        method: 'POST',
        body: JSON.stringify({
          ...provider,
          isEnabled: !provider.is_enabled
        })
      })
      toast.success(`${provider.name} ${!provider.is_enabled ? 'enabled' : 'disabled'}`)
      loadData()
    } catch (error: any) {
      toast.error('Failed to update provider: ' + error.message)
    }
  }

  const updateConfig = async (searchMode: string, modelType: string, modelId: string) => {
    try {
      await apiClient.request('/morphic/admin/config', {
        method: 'POST',
        body: JSON.stringify({
          searchMode,
          modelType,
          modelId
        })
      })
      toast.success(`Orchestration slot updated`)
      loadData()
    } catch (error: any) {
      toast.error('Failed to update config: ' + error.message)
    }
  }

  const openAddProvider = () => {
    setAddMode('provider')
    setNewProvider({
      id: '',
      name: '',
      type: 'google',
      baseUrl: '',
      apiKey: '',
      isEnabled: true,
      priority: 1
    })
    setShowAddModal(true)
  }

  const openAddModel = () => {
    setAddMode('model')
    setNewModel({
      id: '',
      providerId: 'google',
      name: 'Gemini 2.5 Flash',
      modelId: 'gemini-2.5-flash',
      isEnabled: true
    })
    setShowAddModal(true)
  }

  const submitAdd = async () => {
    try {
      if (addMode === 'provider') {
        const id = (newProvider.id || newProvider.name || 'provider')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .slice(0, 50)
        await apiClient.request('/morphic/admin/providers', {
          method: 'POST',
          body: JSON.stringify({
            id,
            name: newProvider.name || id,
            type: newProvider.type,
            baseUrl: newProvider.baseUrl || null,
            apiKey: newProvider.apiKey || null,
            isEnabled: !!newProvider.isEnabled,
            configuration: {},
            priority: Number(newProvider.priority) || 1
          })
        })
        toast.success('Provider added')
      } else {
        const id = (newModel.id || `${newModel.providerId}-${newModel.modelId}`)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .slice(0, 80)
        await apiClient.request('/morphic/admin/models', {
          method: 'POST',
          body: JSON.stringify({
            id,
            providerId: newModel.providerId,
            name: newModel.name || newModel.modelId,
            modelId: newModel.modelId,
            isEnabled: !!newModel.isEnabled
          })
        })
        toast.success('Model added')
      }
      setShowAddModal(false)
      await loadData()
    } catch (error: any) {
      toast.error(`Failed to add ${addMode}: ${error.message}`)
    }
  }

  const openEditProvider = (provider: any) => {
    setEditTab('provider')
    setEditProvider({
      id: String(provider?.id || ''),
      name: String(provider?.name || ''),
      type: String(provider?.type || 'google'),
      baseUrl: String(provider?.base_url || provider?.baseUrl || ''),
      apiKey: '',
      isEnabled: provider?.is_enabled === 1 || provider?.isEnabled === true,
      priority: Number(provider?.priority ?? 1),
      defaultModel: String(provider?.default_model || provider?.defaultModel || '')
    })
    setEditModel(null)
    setShowEditProviderModal(true)
  }

  const submitEditProvider = async () => {
    try {
      if (!editProvider.id) throw new Error('Provider ID is required')
      await apiClient.request('/morphic/admin/providers', {
        method: 'POST',
        body: JSON.stringify({
          id: editProvider.id,
          name: editProvider.name || editProvider.id,
          type: editProvider.type,
          baseUrl: editProvider.baseUrl || null,
          apiKey: editProvider.apiKey || null,
          isEnabled: !!editProvider.isEnabled,
          configuration: {},
          priority: Number(editProvider.priority) || 1,
          defaultModel: editProvider.defaultModel || null
        })
      })
      toast.success('Provider updated')
      setShowEditProviderModal(false)
      await loadData()
    } catch (error: any) {
      toast.error(`Failed to update provider: ${error.message}`)
    }
  }

  const softDeleteProvider = async () => {
    try {
      if (!editProvider.id) throw new Error('Provider ID is required')
      const ok =
        typeof window === 'undefined'
          ? true
          : window.confirm(
              `Disable provider "${editProvider.name || editProvider.id}"? This is a soft delete and can be re-enabled later.`
            )
      if (!ok) return

      await apiClient.request('/morphic/admin/providers', {
        method: 'POST',
        body: JSON.stringify({
          id: editProvider.id,
          name: editProvider.name || editProvider.id,
          type: editProvider.type,
          baseUrl: editProvider.baseUrl || null,
          // Do not change API key on disable unless explicitly provided.
          apiKey: editProvider.apiKey || null,
          isEnabled: false,
          configuration: {},
          priority: Number(editProvider.priority) || 1,
          defaultModel: editProvider.defaultModel || null
        })
      })
      toast.success('Provider disabled')
      setShowEditProviderModal(false)
      await loadData()
    } catch (error: any) {
      toast.error(`Failed to disable provider: ${error.message}`)
    }
  }

  const openEditModel = (modelRow: any) => {
    setEditTab('model')
    setEditModel({
      ...modelRow,
      providerId: modelRow.provider_id ?? modelRow.providerId,
      modelId: modelRow.model_id ?? modelRow.modelId,
      isEnabled:
        modelRow.is_enabled === 1 || modelRow.isEnabled === true || modelRow.is_enabled === true
    })
  }

  const submitEditModel = async () => {
    try {
      if (!editModel) throw new Error('No model selected')
      await apiClient.request('/morphic/admin/models', {
        method: 'POST',
        body: JSON.stringify({
          id: editModel.id,
          providerId: editModel.providerId,
          name: editModel.name || editModel.modelId,
          modelId: editModel.modelId,
          isEnabled: !!editModel.isEnabled
        })
      })
      toast.success('Model updated')
      await loadData()
    } catch (error: any) {
      toast.error(`Failed to update model: ${error.message}`)
    }
  }

  const softDeleteModel = async () => {
    try {
      if (!editModel) throw new Error('No model selected')
      const ok =
        typeof window === 'undefined'
          ? true
          : window.confirm(
              `Disable model "${editModel.name || editModel.id}"? This is a soft delete and can be re-enabled later.`
            )
      if (!ok) return

      await apiClient.request('/morphic/admin/models', {
        method: 'POST',
        body: JSON.stringify({
          id: editModel.id,
          providerId: editModel.providerId,
          name: editModel.name || editModel.modelId,
          modelId: editModel.modelId,
          isEnabled: false
        })
      })
      toast.success('Model disabled')
      await loadData()
      // Keep dialog open; reflect disabled state in the toggle.
      setEditModel((m: any) => ({ ...m, isEnabled: false }))
    } catch (error: any) {
      toast.error(`Failed to disable model: ${error.message}`)
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-[#fafafa] dark:bg-[#020617] transition-colors duration-1000">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* --- Header: Rising --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 flex items-end justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-2xl glass-morphic flex items-center justify-center shadow-neo-out">
                <Database className="size-5 text-primary" />
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 backdrop-blur-sm">
                System Logic v4.2
              </Badge>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground/90">
              Morphic Mission Control
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md">
              Orchestrate the brilliance of your multi-agent intelligence ecosystem through a unified blanc canvas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full shadow-neo-out"
              onClick={() => (window.location.href = '/ai-search')}
              title="Return to AI Search"
            >
              <ArrowLeft className="size-4 mr-2" />
              AI Search
            </Button>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-morphic shadow-neo-out">
              <StatusOrb active={!loading} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                {loading ? 'Synchronizing' : 'Canvas Live'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* --- Navigation Tabs --- */}
        <div className="flex gap-4 mb-8">
          {[
            { id: 'orchestration', name: 'Intelligence Orchestration', icon: Zap },
            { id: 'providers', name: 'Core Providers', icon: ShieldCheck }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-300 font-medium",
                activeTab === tab.id 
                  ? "bg-white dark:bg-slate-900 shadow-neo-out text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <tab.icon className="size-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* --- Content Area --- */}
        <AnimatePresence mode="wait">
          {activeTab === 'orchestration' ? (
            <motion.div
              key="orchestration"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 stagger-rising"
            >
              {SEARCH_MODES.map((mode) => (
                <Card key={mode.id} className="glass-morphic border-none shadow-neo-out animate-rising">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <mode.icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{mode.name}</CardTitle>
                      <CardDescription>Slotting for {mode.id === 'quick' ? 'immediate responses' : 'deep multi-agent research'}.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    {MODEL_TYPES.map((type) => {
                      const currentCfg = configs.find(c => c.search_mode === mode.id && c.model_type === type.id);
                      return (
                        <div key={type.id} className="p-4 rounded-3xl bg-secondary/30 border border-border/50 transition-all hover:bg-secondary/50 focus-bloom">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <type.icon className="size-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{type.name} Slot</span>
                            </div>
                            {currentCfg && (
                              <Badge variant="secondary" className="px-3 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-tighter">
                                {currentCfg.provider_name}
                              </Badge>
                            )}
                          </div>
                          
                          <select 
                            className="w-full bg-background/50 border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-sm"
                            value={currentCfg?.model_id || ''}
                            onChange={(e) => updateConfig(mode.id, type.id, e.target.value)}
                          >
                            <option value="">Unassigned</option>
                            {models.filter(m => m.is_enabled).map(m => (
                              <option key={m.id} value={m.id}>{m.provider_name}: {m.name}</option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="providers"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-rising"
            >
              {providers.map((provider) => (
                <div 
                  key={provider.id} 
                  className="group relative p-6 rounded-[2rem] glass-morphic border-none shadow-neo-out animate-rising transition-all hover:-translate-y-1 focus-bloom"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="size-14 rounded-2xl bg-white dark:bg-slate-800 shadow-neo-out flex items-center justify-center p-2">
                      {/* Logo Placeholder - would use provider logic here */}
                      <div className="size-full rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center font-bold text-primary">
                        {provider.name[0]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="size-9 rounded-full hover:bg-accent inline-flex items-center justify-center"
                        onClick={() => openEditProvider(provider)}
                        title="Edit provider"
                      >
                        <Pencil className="size-4 text-muted-foreground" />
                      </button>
                      <Switch 
                        checked={provider.is_enabled === 1}
                        onCheckedChange={() => toggleProvider(provider)}
                      />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold">{provider.name}</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1 mb-4">{provider.type}</p>
                  
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">API Configuration</span>
                      {provider.api_key ? (
                        <span className="text-emerald-500 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="size-3" /> Encrypted
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-1 font-medium">
                          <AlertCircle className="size-3" /> Missing Key
                        </span>
                      )}
                    </div>
                    
                    <div className="relative group/input">
                      <Input 
                        type="password"
                        placeholder="••••••••••••••••"
                        className="bg-secondary/40 border-none rounded-xl h-9 text-xs focus:ring-1 focus:ring-primary/30"
                        onBlur={(e) => {
                          if (e.target.value) {
                             apiClient.request('/morphic/admin/providers', {
                               method: 'POST',
                               body: JSON.stringify({ ...provider, apiKey: e.target.value })
                             }).then(() => toast.success('API Key updated'))
                          }
                        }}
                      />
                      <RefreshCw className="absolute right-3 top-2.5 size-4 text-muted-foreground opacity-0 group-hover/input:opacity-100 transition-opacity cursor-pointer" />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2">
                    <div className={cn(
                      "size-2 rounded-full",
                      provider.is_enabled === 1 ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                    )} />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                      {provider.is_enabled === 1 ? 'High Precision Active' : 'System Dormant'}
                    </span>
                  </div>
                </div>
              ))}
              
              <button 
                className="group p-6 rounded-[2rem] border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 text-muted-foreground hover:bg-white hover:border-primary/50 hover:text-primary transition-all duration-500 animate-rising"
                style={{ animationDelay: '0.6s' }}
                onClick={openAddProvider}
              >
                <div className="size-12 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="size-6" />
                </div>
                <span className="text-sm font-medium">Add New Intelligence</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAddModal ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-lg rounded-[2rem] bg-background shadow-neo-out border border-border/60"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
                  <div>
                    <div className="text-sm font-semibold">
                      {addMode === 'provider' ? 'Add Provider' : 'Add Model'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {addMode === 'provider'
                        ? 'Create a core provider (e.g., Google).'
                        : 'Register a model under an existing provider.'}
                    </div>
                  </div>
                  <button
                    className="size-9 rounded-full hover:bg-accent inline-flex items-center justify-center"
                    onClick={() => setShowAddModal(false)}
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={addMode === 'provider' ? 'default' : 'outline'}
                      onClick={openAddProvider}
                      className="rounded-full"
                    >
                      Provider
                    </Button>
                    <Button
                      type="button"
                      variant={addMode === 'model' ? 'default' : 'outline'}
                      onClick={openAddModel}
                      className="rounded-full"
                    >
                      Model
                    </Button>
                  </div>

                  {addMode === 'provider' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Provider ID</Label>
                          <Input
                            value={newProvider.id}
                            onChange={(e) => setNewProvider((p) => ({ ...p, id: e.target.value }))}
                            placeholder="google"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Name</Label>
                          <Input
                            value={newProvider.name}
                            onChange={(e) => setNewProvider((p) => ({ ...p, name: e.target.value }))}
                            placeholder="Google"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Type</Label>
                          <Input
                            value={newProvider.type}
                            onChange={(e) => setNewProvider((p) => ({ ...p, type: e.target.value }))}
                            placeholder="google"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Priority</Label>
                          <Input
                            value={String(newProvider.priority)}
                            onChange={(e) =>
                              setNewProvider((p) => ({ ...p, priority: Number(e.target.value || '1') }))
                            }
                            placeholder="1"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Base URL (optional)</Label>
                        <Input
                          value={newProvider.baseUrl}
                          onChange={(e) => setNewProvider((p) => ({ ...p, baseUrl: e.target.value }))}
                          placeholder="https://generativelanguage.googleapis.com"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>API Key (optional)</Label>
                        <Input
                          type="password"
                          value={newProvider.apiKey}
                          onChange={(e) => setNewProvider((p) => ({ ...p, apiKey: e.target.value }))}
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Model ID (row id)</Label>
                          <Input
                            value={newModel.id}
                            onChange={(e) => setNewModel((m) => ({ ...m, id: e.target.value }))}
                            placeholder="google-gemini-2-5-flash"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Provider ID</Label>
                          <Input
                            value={newModel.providerId}
                            onChange={(e) => setNewModel((m) => ({ ...m, providerId: e.target.value }))}
                            placeholder="google"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Display name</Label>
                        <Input
                          value={newModel.name}
                          onChange={(e) => setNewModel((m) => ({ ...m, name: e.target.value }))}
                          placeholder="Gemini 2.5 Flash"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Provider model id</Label>
                        <Input
                          value={newModel.modelId}
                          onChange={(e) => setNewModel((m) => ({ ...m, modelId: e.target.value }))}
                          placeholder="gemini-2.5-flash"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-5 border-t border-border/50 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={addMode === 'provider' ? openAddModel : openAddProvider}
                      title="Switch add mode"
                    >
                      Switch <ChevronRight className="size-4 ml-1" />
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full"
                      onClick={submitAdd}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showEditProviderModal ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowEditProviderModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-lg rounded-[2rem] bg-background shadow-neo-out border border-border/60"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
                  <div>
                    <div className="text-sm font-semibold">Edit Provider</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Update provider metadata and defaults.
                    </div>
                  </div>
                  <button
                    className="size-9 rounded-full hover:bg-accent inline-flex items-center justify-center"
                    onClick={() => setShowEditProviderModal(false)}
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={editTab === 'provider' ? 'default' : 'outline'}
                      onClick={() => setEditTab('provider')}
                      className="rounded-full"
                    >
                      Provider
                    </Button>
                    <Button
                      type="button"
                      variant={editTab === 'model' ? 'default' : 'outline'}
                      onClick={() => setEditTab('model')}
                      className="rounded-full"
                    >
                      Model
                    </Button>
                  </div>

                  {editTab === 'provider' ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Provider ID</Label>
                          <Input value={editProvider.id} disabled />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Name</Label>
                          <Input
                            value={editProvider.name}
                            onChange={(e) =>
                              setEditProvider((p) => ({ ...p, name: e.target.value }))
                            }
                            placeholder="Google"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Type</Label>
                          <Input
                            value={editProvider.type}
                            onChange={(e) =>
                              setEditProvider((p) => ({ ...p, type: e.target.value }))
                            }
                            placeholder="google"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Priority</Label>
                          <Input
                            value={String(editProvider.priority)}
                            onChange={(e) =>
                              setEditProvider((p) => ({
                                ...p,
                                priority: Number(e.target.value || '1')
                              }))
                            }
                            placeholder="1"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Base URL (optional)</Label>
                        <Input
                          value={editProvider.baseUrl}
                          onChange={(e) =>
                            setEditProvider((p) => ({ ...p, baseUrl: e.target.value }))
                          }
                          placeholder="https://generativelanguage.googleapis.com"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Default model (optional)</Label>
                        <Input
                          value={editProvider.defaultModel}
                          onChange={(e) =>
                            setEditProvider((p) => ({ ...p, defaultModel: e.target.value }))
                          }
                          placeholder="gemini-2.5-flash"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>API Key (leave blank to keep existing)</Label>
                        <Input
                          type="password"
                          value={editProvider.apiKey}
                          onChange={(e) =>
                            setEditProvider((p) => ({ ...p, apiKey: e.target.value }))
                          }
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          Models for provider <span className="font-mono">{editProvider.id}</span>
                        </div>
                        <select
                          className="w-full bg-background/50 border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-sm"
                          value={editModel?.id || ''}
                          onChange={(e) => {
                            const selected = models.find((m) => m.id === e.target.value)
                            if (selected) openEditModel(selected)
                          }}
                        >
                          <option value="">Select a model to edit</option>
                          {models
                            .filter((m) => (m.provider_id ?? m.providerId) === editProvider.id)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.model_id ?? m.modelId})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => {
                            setNewModel({
                              id: '',
                              providerId: editProvider.id,
                              name: 'Gemini 2.5 Flash',
                              modelId: 'gemini-2.5-flash',
                              isEnabled: true
                            })
                            setShowEditProviderModal(false)
                            openAddModel()
                          }}
                        >
                          Add model
                        </Button>
                      </div>

                      {editModel ? (
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label>Row ID</Label>
                              <Input value={String(editModel.id || '')} disabled />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Provider ID</Label>
                              <Input value={String(editModel.providerId || '')} disabled />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label>Display name</Label>
                            <Input
                              value={String(editModel.name || '')}
                              onChange={(e) =>
                                setEditModel((m: any) => ({ ...m, name: e.target.value }))
                              }
                              placeholder="Gemini 2.5 Flash"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label>Provider model id</Label>
                            <Input
                              value={String(editModel.modelId || '')}
                              onChange={(e) =>
                                setEditModel((m: any) => ({ ...m, modelId: e.target.value }))
                              }
                              placeholder="gemini-2.5-flash"
                            />
                          </div>

                          <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 bg-secondary/20">
                            <div>
                              <div className="text-sm font-medium">Enabled</div>
                              <div className="text-xs text-muted-foreground">
                                Toggle availability in orchestration slots.
                              </div>
                            </div>
                            <Switch
                              checked={!!editModel.isEnabled}
                              onCheckedChange={(checked) =>
                                setEditModel((m: any) => ({ ...m, isEnabled: checked }))
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">
                          Select a model above to edit it.
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="px-6 py-5 border-t border-border/50 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setShowEditProviderModal(false)}
                  >
                    Cancel
                  </Button>
                  <div className="flex items-center gap-2">
                    {editTab === 'provider' ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={softDeleteProvider}
                        >
                          Disable provider
                        </Button>
                        <Button
                          type="button"
                          className="rounded-full"
                          onClick={submitEditProvider}
                        >
                          Save provider
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={softDeleteModel}
                          disabled={!editModel}
                        >
                          Disable model
                        </Button>
                        <Button
                          type="button"
                          className="rounded-full"
                          onClick={submitEditModel}
                          disabled={!editModel}
                        >
                          Save model
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
