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

          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-morphic shadow-neo-out">
            <StatusOrb active={!loading} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              {loading ? 'Synchronizing' : 'Canvas Live'}
            </span>
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
                    <Switch 
                      checked={provider.is_enabled === 1}
                      onCheckedChange={() => toggleProvider(provider)}
                    />
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
              >
                <div className="size-12 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="size-6" />
                </div>
                <span className="text-sm font-medium">Add New Intelligence</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
