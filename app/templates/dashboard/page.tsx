"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion"
import {
  FileText,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  ArrowRight,
  Eye,
  Zap,
} from "@/components/ui/icons-shim"
import { Award, Target, Brain, Network, RefreshCw, Search as SearchIcon, GitBranch, ShieldCheck } from "lucide-react"
import { apiClient, type Template } from "@/lib/api"

// ---------------------------------------------------------------------------
// Lifecycle configuration (mirrors app/templates/[id]/page.tsx)
// ---------------------------------------------------------------------------

type DevStatus = NonNullable<Template["development_status"]>

interface StageConfig {
  key: DevStatus
  label: string
  emoji: string
  ring: string
  bar: string
  text: string
  description: string
}

const LIFECYCLE_STAGES: StageConfig[] = [
  { key: "draft", label: "Draft", emoji: "⚪", ring: "ring-gray-400", bar: "bg-gray-400", text: "text-gray-600 dark:text-gray-300", description: "Newly created, untested" },
  { key: "testing", label: "Testing", emoji: "🔵", ring: "ring-blue-500", bar: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", description: "Under validation (3+ runs @ 75%)" },
  { key: "compliance", label: "Compliance", emoji: "🟣", ring: "ring-purple-500", bar: "bg-purple-500", text: "text-purple-600 dark:text-purple-400", description: "Framework alignment (5+ runs @ 80%)" },
  { key: "validated", label: "Validated", emoji: "🟡", ring: "ring-yellow-500", bar: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400", description: "Compliance approved (10+ runs @ 90%)" },
  { key: "production", label: "Production", emoji: "🟢", ring: "ring-green-500", bar: "bg-green-500", text: "text-green-600 dark:text-green-400", description: "Batch generation enabled" },
]

const TERMINAL_STAGES: StageConfig[] = [
  { key: "deprecated", label: "Deprecated", emoji: "🔴", ring: "ring-red-500", bar: "bg-red-500", text: "text-red-600 dark:text-red-400", description: "No longer recommended" },
  { key: "archived", label: "Archived", emoji: "📦", ring: "ring-gray-400", bar: "bg-gray-400", text: "text-gray-500", description: "Inactive" },
]

const ALL_STAGES = [...LIFECYCLE_STAGES, ...TERMINAL_STAGES]

const DONUT_COLORS: Record<DevStatus, string> = {
  draft: "#9ca3af",
  testing: "#3b82f6",
  compliance: "#a855f7",
  validated: "#eab308",
  production: "#22c55e",
  deprecated: "#ef4444",
  archived: "#6b7280",
}

interface ApprovalStats {
  pending: number
  approved: number
  rejected: number
  overdue: number
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function statusOf(t: Template): DevStatus {
  return t.development_status ?? "draft"
}

function successRateOf(t: Template): number {
  if (typeof t.success_rate === "number") return Math.round(t.success_rate)
  const runs = t.validation_count ?? 0
  const ok = t.success_count ?? 0
  return runs > 0 ? Math.round((ok / runs) * 100) : 0
}

function healthScoreOf(t: Template): number {
  const sr = successRateOf(t)
  const runs = t.validation_count ?? 0
  const maturity: Record<DevStatus, number> = {
    draft: 4, testing: 6, compliance: 7, validated: 8, production: 10, deprecated: 0, archived: 0,
  }
  const evidence = Math.min(10, runs) // more runs -> more trustworthy score
  return Math.min(100, Math.round(sr * 0.8 + maturity[statusOf(t)] + evidence))
}

function barColor(pct: number): string {
  if (pct >= 85) return "bg-green-500"
  if (pct >= 70) return "bg-blue-500"
  if (pct >= 50) return "bg-yellow-500"
  return "bg-red-500"
}

// ---------------------------------------------------------------------------
// Animated counter (framer-motion showcase)
// ---------------------------------------------------------------------------

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v: number) => `${Math.round(v)}${suffix}`)
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: "easeOut" })
    return controls.stop
  }, [value, mv])
  return <motion.span>{rounded}</motion.span>
}

// ---------------------------------------------------------------------------
// Donut chart: animated SVG stroke segments
// ---------------------------------------------------------------------------

function StatusDonut({ counts, total }: { counts: Map<DevStatus, number>; total: number }) {
  const radius = 64
  const circumference = 2 * Math.PI * radius
  let offsetAcc = 0
  const segments = ALL_STAGES
    .map((s) => ({ stage: s, count: counts.get(s.key) ?? 0 }))
    .filter((s) => s.count > 0)

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-40 h-40 -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" strokeWidth="16" className="stroke-muted" />
        {segments.map(({ stage, count }, i) => {
          const frac = total > 0 ? count / total : 0
          const dash = frac * circumference
          const seg = (
            <motion.circle
              key={stage.key}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              strokeWidth="16"
              strokeLinecap="butt"
              stroke={DONUT_COLORS[stage.key]}
              strokeDasharray={`${dash} ${circumference - dash}`}
              initial={{ strokeDashoffset: circumference, opacity: 0 }}
              animate={{ strokeDashoffset: -offsetAcc, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.15 * i, ease: "easeOut" }}
            />
          )
          offsetAcc += dash
          return seg
        })}
      </svg>
      <div className="space-y-1.5">
        {segments.map(({ stage, count }) => (
          <div key={stage.key} className="flex items-center gap-2 text-sm">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: DONUT_COLORS[stage.key] }} />
            <span className={stage.text}>{stage.label}</span>
            <span className="font-mono font-semibold ml-auto pl-4">{count}</span>
          </div>
        ))}
        {segments.length === 0 && <p className="text-sm text-muted-foreground">No templates yet</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GKG flow strip: animated dependency ribbon
// ---------------------------------------------------------------------------

function GkgFlowStrip({ gkgEnabled, contextInjection, total }: { gkgEnabled: number; contextInjection: number; total: number }) {
  return (
    <div className="relative">
      <svg viewBox="0 0 640 120" className="w-full h-28">
        <defs>
          <linearGradient id="gkgGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        {/* flowing edges */}
        {[0, 1, 2].map((i) => (
          <motion.path
            key={i}
            d={`M 90 ${40 + i * 20} C 220 ${20 + i * 30}, 420 ${90 - i * 25}, 550 ${55 + i * 5}`}
            fill="none"
            stroke="url(#gkgGrad)"
            strokeWidth="2"
            strokeDasharray="6 8"
            initial={{ strokeDashoffset: 0, opacity: 0 }}
            animate={{ strokeDashoffset: [-0, -140], opacity: 0.85 }}
            transition={{
              strokeDashoffset: { duration: 4 + i, repeat: Infinity, ease: "linear" },
              opacity: { duration: 0.6, delay: 0.3 * i },
            }}
          />
        ))}
        {/* nodes */}
        <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }}>
          <circle cx="70" cy="60" r="34" className="fill-blue-500/10 stroke-blue-500" strokeWidth="2" />
          <text x="70" y="56" textAnchor="middle" className="fill-current text-[11px] font-semibold">Templates</text>
          <text x="70" y="72" textAnchor="middle" className="fill-current text-[13px] font-mono font-bold">{total}</text>
        </motion.g>
        <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.45 }}>
          <circle cx="320" cy="58" r="30" className="fill-purple-500/10 stroke-purple-500" strokeWidth="2" />
          <text x="320" y="54" textAnchor="middle" className="fill-current text-[10px] font-semibold">Entities</text>
          <text x="320" y="69" textAnchor="middle" className="fill-current text-[11px] font-mono">extract</text>
        </motion.g>
        <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.7 }}>
          <motion.circle
            cx="565" cy="60" r="38"
            className="fill-cyan-500/10 stroke-cyan-500"
            strokeWidth="2"
            animate={{ r: [38, 41, 38] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <text x="565" y="56" textAnchor="middle" className="fill-current text-[11px] font-semibold">GKG</text>
          <text x="565" y="72" textAnchor="middle" className="fill-current text-[10px]">knowledge graph</text>
        </motion.g>
      </svg>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="rounded-lg border p-3">
          <p className="text-2xl font-bold font-mono"><AnimatedNumber value={gkgEnabled} /></p>
          <p className="text-xs text-muted-foreground">templates with a GKG context strategy (pre-flight injection)</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-2xl font-bold font-mono"><AnimatedNumber value={contextInjection} /></p>
          <p className="text-xs text-muted-foreground">templates with context-injection sources configured</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TemplateControlCenterPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [approvalStats, setApprovalStats] = useState<ApprovalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<DevStatus | "all">("all")
  const [searchTerm, setSearchTerm] = useState("")

  const loadData = useCallback(async (initial: boolean) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    try {
      const resp = await apiClient.getTemplates({ limit: 200 })
      setTemplates(resp.templates ?? [])
    } catch (error) {
      console.error("Failed to load templates:", error)
    }
    try {
      const stats = await apiClient.get<{ stats?: ApprovalStats } & Partial<ApprovalStats>>("/approvals/stats/user")
      const s = stats.stats ?? stats
      if (typeof s.pending === "number") {
        setApprovalStats({ pending: s.pending, approved: s.approved ?? 0, rejected: s.rejected ?? 0, overdue: s.overdue ?? 0 })
      }
    } catch {
      // approvals stats are best-effort; the dashboard still works without them
      setApprovalStats(null)
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void loadData(true)
    const interval = setInterval(() => void loadData(false), 30000)
    return () => clearInterval(interval)
  }, [loadData])

  // ----- derived portfolio metrics -----
  const active = useMemo(() => templates.filter((t) => statusOf(t) !== "archived"), [templates])

  const statusCounts = useMemo(() => {
    const m = new Map<DevStatus, number>()
    for (const t of templates) m.set(statusOf(t), (m.get(statusOf(t)) ?? 0) + 1)
    return m
  }, [templates])

  const totals = useMemo(() => {
    const totalRuns = active.reduce((acc, t) => acc + (t.validation_count ?? 0), 0)
    const totalOk = active.reduce((acc, t) => acc + (t.success_count ?? 0), 0)
    const totalUses = active.reduce((acc, t) => acc + (t.usage_count ?? 0), 0)
    const gkgEnabled = active.filter((t) => t.gkg_context_strategy && t.gkg_context_strategy.profile).length
    const contextInjection = active.filter((t) => t.context_injection_config?.enabled).length
    return {
      templates: active.length,
      production: statusCounts.get("production") ?? 0,
      totalRuns,
      totalUses,
      passRate: totalRuns > 0 ? Math.round((totalOk / totalRuns) * 100) : 0,
      gkgEnabled,
      contextInjection,
      needsAttention: active.filter((t) => successRateOf(t) < 70 && (t.validation_count ?? 0) > 0).length,
    }
  }, [active, statusCounts])

  const filtered = useMemo(() => {
    return active
      .filter((t) => statusFilter === "all" || statusOf(t) === statusFilter)
      .filter((t) => {
        const q = searchTerm.toLowerCase()
        return !q || t.name.toLowerCase().includes(q) || (t.framework ?? "").toLowerCase().includes(q) || (t.category ?? "").toLowerCase().includes(q)
      })
      .sort((a, b) => healthScoreOf(b) - healthScoreOf(a))
  }, [active, statusFilter, searchTerm])

  const stageOf = (key: DevStatus): StageConfig => ALL_STAGES.find((s) => s.key === key) ?? LIFECYCLE_STAGES[0]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatedLayout>
            <div className="max-w-7xl mx-auto space-y-6">

              {/* ---------- header ---------- */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white"
                        animate={{ rotate: [0, 3, -3, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Brain className="h-5 w-5" />
                      </motion.div>
                      <h1 className="text-3xl font-bold">Template Lifecycle Control Center</h1>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Portfolio view of every template&apos;s lifecycle phase, health, quality gates and GKG integration
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => void loadData(false)} disabled={refreshing}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/templates")}>
                      <FileText className="h-4 w-4 mr-2" />
                      All Templates
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* ---------- KPI cards ---------- */}
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  {[
                    { label: "Templates", value: totals.templates, icon: FileText, color: "text-blue-500", suffix: "" },
                    { label: "In Production", value: totals.production, icon: Award, color: "text-green-500", suffix: "" },
                    { label: "Gate Pass Rate", value: totals.passRate, icon: ShieldCheck, color: "text-emerald-500", suffix: "%" },
                    { label: "Validation Runs", value: totals.totalRuns, icon: Activity, color: "text-purple-500", suffix: "" },
                    { label: "HITL Pending", value: approvalStats?.pending ?? 0, icon: Clock, color: "text-yellow-500", suffix: "" },
                    { label: "Needs Attention", value: totals.needsAttention, icon: AlertTriangle, color: "text-red-500", suffix: "" },
                  ].map((kpi, i) => (
                    <AnimatedCard key={kpi.label} delay={i * 0.07}>
                      <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                        <motion.div
                          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.07 }}
                        />
                        <CardContent className="pt-5 pb-4">
                          <kpi.icon className={`h-4 w-4 ${kpi.color} mb-2`} />
                          <p className="text-2xl font-bold font-mono">
                            <AnimatedNumber value={kpi.value} suffix={kpi.suffix} />
                          </p>
                          <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        </CardContent>
                      </Card>
                    </AnimatedCard>
                  ))}
                </div>
              )}

              {/* ---------- pipeline + donut ---------- */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <AnimatedCard delay={0.15} className="lg:col-span-3">
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base"><GitBranch className="h-4 w-4 text-blue-500" /> Lifecycle Pipeline</CardTitle>
                      <CardDescription>Where the portfolio sits on the promotion path — hover a stage for its gate criteria</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TooltipProvider>
                        <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
                          {LIFECYCLE_STAGES.map((stage, i) => {
                            const count = statusCounts.get(stage.key) ?? 0
                            return (
                              <React.Fragment key={stage.key}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <motion.button
                                      type="button"
                                      onClick={() => setStatusFilter(statusFilter === stage.key ? "all" : stage.key)}
                                      className={`flex-1 min-w-[105px] rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 ${statusFilter === stage.key ? `ring-2 ${stage.ring}` : ""}`}
                                      initial={{ opacity: 0, y: 14 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.25 + i * 0.1 }}
                                      whileHover={{ y: -3 }}
                                      whileTap={{ scale: 0.97 }}
                                    >
                                      <p className="text-xs font-medium">{stage.emoji} {stage.label}</p>
                                      <p className={`text-2xl font-bold font-mono ${stage.text}`}>
                                        <AnimatedNumber value={count} />
                                      </p>
                                      <motion.div
                                        className={`h-1 rounded-full mt-2 ${stage.bar}`}
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: totals.templates > 0 ? Math.max(0.06, count / totals.templates) : 0.06 }}
                                        style={{ transformOrigin: "left" }}
                                        transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                                      />
                                    </motion.button>
                                  </TooltipTrigger>
                                  <TooltipContent><p className="text-xs">{stage.description}</p></TooltipContent>
                                </Tooltip>
                                {i < LIFECYCLE_STAGES.length - 1 && (
                                  <motion.div
                                    className="self-center text-muted-foreground shrink-0"
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.45 + i * 0.1 }}
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                  </motion.div>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </div>
                      </TooltipProvider>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {TERMINAL_STAGES.map((s) => (
                          <button key={s.key} type="button" className="hover:text-foreground" onClick={() => setStatusFilter(statusFilter === s.key ? "all" : s.key)}>
                            {s.emoji} {s.label}: <span className="font-mono font-semibold">{statusCounts.get(s.key) ?? 0}</span>
                          </button>
                        ))}
                        <span className="ml-auto flex items-center gap-1"><Zap className="h-3 w-3" /> {totals.totalUses} total generations</span>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedCard>

                <AnimatedCard delay={0.25} className="lg:col-span-2">
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-purple-500" /> Status Distribution</CardTitle>
                      <CardDescription>All {templates.length} templates incl. terminal states</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? <Skeleton className="h-40 w-full" /> : <StatusDonut counts={statusCounts} total={templates.length} />}
                    </CardContent>
                  </Card>
                </AnimatedCard>
              </div>

              {/* ---------- GKG flow ---------- */}
              <AnimatedCard delay={0.3}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base"><Network className="h-4 w-4 text-cyan-500" /> Governance Knowledge Graph Integration</CardTitle>
                    <CardDescription>Templates feed extracted entities into the GKG; the GKG injects context back pre-flight</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <GkgFlowStrip gkgEnabled={totals.gkgEnabled} contextInjection={totals.contextInjection} total={totals.templates} />
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* ---------- registry ---------- */}
              <AnimatedCard delay={0.35}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-green-500" /> Template Registry</CardTitle>
                        <CardDescription>
                          Sorted by health · click a row for full lifecycle detail
                          {statusFilter !== "all" && <> · filtered to {stageOf(statusFilter).emoji} {stageOf(statusFilter).label}</>}
                        </CardDescription>
                      </div>
                      <div className="relative w-64 max-w-full">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search name, framework, category…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                              <th className="py-2 pr-3 font-medium">Template</th>
                              <th className="py-2 px-3 font-medium">Phase</th>
                              <th className="py-2 px-3 font-medium">Runs</th>
                              <th className="py-2 px-3 font-medium">Success</th>
                              <th className="py-2 px-3 font-medium">Health</th>
                              <th className="py-2 pl-3 font-medium"></th>
                            </tr>
                          </thead>
                          <tbody>
                            <AnimatePresence>
                              {filtered.map((t, i) => {
                                const stage = stageOf(statusOf(t))
                                const sr = successRateOf(t)
                                const health = healthScoreOf(t)
                                return (
                                  <motion.tr
                                    key={t.id}
                                    layout
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 12 }}
                                    transition={{ delay: Math.min(i * 0.03, 0.4) }}
                                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                                    onClick={() => router.push(`/templates/${t.id}`)}
                                  >
                                    <td className="py-2.5 pr-3">
                                      <p className="font-medium">{t.name}</p>
                                      <p className="text-xs text-muted-foreground">{t.framework}{t.category ? ` · ${t.category}` : ""}</p>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <Badge variant="outline" className={stage.text}>{stage.emoji} {stage.label}</Badge>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-xs">
                                      {t.validation_count ?? 0}
                                      <span className="text-muted-foreground"> / {t.usage_count ?? 0} uses</span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-2 min-w-[120px]">
                                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                                          <motion.div
                                            className={`h-full rounded-full ${barColor(sr)}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${sr}%` }}
                                            transition={{ duration: 0.7, delay: 0.2 + Math.min(i * 0.03, 0.4) }}
                                          />
                                        </div>
                                        <span className="font-mono text-xs w-9 text-right">{sr}%</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-2 min-w-[120px]">
                                        <Progress value={health} className="h-2 flex-1" />
                                        <span className="font-mono text-xs w-7 text-right">{health}</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 pl-3 text-right">
                                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/templates/${t.id}`) }}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </motion.tr>
                                )
                              })}
                            </AnimatePresence>
                          </tbody>
                        </table>
                        {filtered.length === 0 && (
                          <div className="text-center py-10 text-muted-foreground text-sm">
                            <CheckCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                            No templates match the current filter.
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedCard>

            </div>
          </AnimatedLayout>
        </main>
      </div>
    </div>
  )
}
