"use client"

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SkeletonCard, SkeletonStats } from "@/components/ui/skeleton"
import { FolderOpen, Edit, FileText, AlertTriangle, Layers, RefreshCw } from "@/components/ui/icons-shim"

import { apiClient, ExtendedProject } from "@/lib/api"
import { toast } from "@/lib/notify"
import { ProjectSocketRoom } from "./ProjectSocketRoom"

// 🚀 Dynamic On-Demand Tab Mapping Matrix
const TabOverview = React.lazy(() => import("./tabs/OverviewTabWrapper"))
const TabDocuments = React.lazy(() => import("./tabs/DocumentsTabWrapper"))
const TabStakeholders = React.lazy(() => import("./tabs/StakeholdersTabWrapper"))
const TabContext = React.lazy(() => import("./ProjectContextTab").then(m => ({ default: m.ProjectContextTab })))
const TabExtraction = React.lazy(() => import("./ProjectDataExtraction").then(m => ({ default: m.ProjectDataExtraction })))
const TabLessons = React.lazy(() => import("./LessonsTab"))
const TabPerformance = React.lazy(() => import("@/components/project/PerformanceDashboard").then(m => ({ default: m.PerformanceDashboard })))
const TabFinancials = React.lazy(() => import("@/components/project/ProjectFinancialsTab"))
const TabRisks = React.lazy(() => import("@/components/project/ProjectRisksTab").then(m => ({ default: m.ProjectRisksTab })))
const TabIssues = React.lazy(() => import("@/components/project/ProjectIssuesTab").then(m => ({ default: m.ProjectIssuesTab })))
const TabCompliance = React.lazy(() => import("./ComplianceSecurityTab").then(m => ({ default: m.ComplianceSecurityTab })))
const TabIntegrations = React.lazy(() => import("./IntegrationsTab").then(m => ({ default: m.IntegrationsTab })))
const TabDigitalTwins = React.lazy(() => import("./DigitalTwinAnalyticsTab").then(m => ({ default: m.DigitalTwinAnalyticsTab })))

interface Props {
  projectId: string
}

export default function ProjectWorkspaceOrchestrator({ projectId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [project, setProject] = useState<ExtendedProject | null>(null)
  const [loading, setLoading] = useState(true)

  // 1. URL Query Param Synchronization Core
  const activeTab = useMemo(() => searchParams.get("tab") || "overview", [searchParams])

  const fetchProjectBaseline = useCallback(async () => {
    try {
      setLoading(true)
      const projectData = await apiClient.getProject(projectId)
      setProject(projectData as ExtendedProject)
    } catch (error) {
      console.error("Failed to load project context layer:", error)
      toast.error("Ecosystem baseline loading offline")
      setProject(null)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) fetchProjectBaseline()
  }, [fetchProjectBaseline])

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // 2. Performance Core: Conditional Rendering Strategy (Destroys dead nodes)
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "overview": return <TabOverview project={project} projectId={projectId} />
      case "documents": return <TabDocuments projectId={projectId} project={project} />
      case "stakeholders": return <TabStakeholders projectId={projectId} />
      case "context": return <TabContext projectId={projectId} />
      case "extraction": return <TabExtraction projectId={projectId} documents={[]} />
      case "lessons": return <TabLessons projectId={projectId} />
      case "performance": return <TabPerformance projectId={projectId} />
      case "financials": return <TabFinancials projectId={projectId} />
      case "risks": return <TabRisks projectId={projectId} />
      case "issues": return <TabIssues projectId={projectId} />
      case "compliance-security": return <TabCompliance projectId={projectId} />
      case "integrations": return <TabIntegrations projectId={projectId} />
      case "digital-twins": return <TabDigitalTwins projectId={projectId} />
      default: return <TabOverview project={project} projectId={projectId} />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 w-full p-4">
        <div className="h-8 w-1/4 animate-pulse rounded bg-slate-200" />
        <SkeletonStats items={3} />
        <SkeletonCard className="h-96 w-full" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-white dark:bg-slate-900 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200">Ecosystem Profile Record Mismatch</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">Could not resolve operational tracking matrices for target record segment.</p>
        <Button onClick={fetchProjectBaseline} size="sm" className="mt-4"><RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry Sync</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full relative">
      {/* 🚀 FIXED: Socket Node stands adjacent as an environmental background listener */}
      <ProjectSocketRoom projectId={projectId} />

      {/* Project Identity Dashboard Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-100 dark:border-slate-800/60">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl"><FolderOpen className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{project.name}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{project.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-md font-bold">{project?.status}</Badge>
            <Badge variant="outline" className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md border-slate-200 bg-slate-50 text-slate-600">{project?.framework}</Badge>
            <Badge variant="secondary" className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md uppercase">{project?.priority}</Badge>
          </div>
        </div>

        {/* Workspace Quick-Jump Utility Dock */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-9 text-xs font-semibold"><Link href={`/projects/${projectId}/drift`}><AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-amber-500" /> Drift Management</Link></Button>
          <Button variant="outline" size="sm" asChild className="h-9 text-xs font-semibold"><Link href={`/projects/${projectId}/digital-twins`}><Layers className="mr-1.5 h-3.5 w-3.5 text-blue-500" /> Twin SNAPSHOT</Link></Button>
        </div>
      </div>

      {/* High-Performance Micro-orchestrated Tab Engine */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100/80 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/40 select-none">
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="overview">Overview</TabsTrigger>
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="documents">Documents</TabsTrigger>
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="context">Project Context</TabsTrigger>
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="extraction">AI Extraction</TabsTrigger>
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="lessons">Lessons Learned</TabsTrigger>
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="performance">Performance Metric</TabsTrigger>
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="financials">Financials Domain</TabsTrigger>
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="risks">Risk Log</TabsTrigger>
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="issues">Issues</TabsTrigger>
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="compliance-security">Compliance & Sec</TabsTrigger>
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="integrations">Integrations Dock</TabsTrigger>
          <TabsTrigger className="text-xs font-bold px-3 py-2 rounded-lg" value="digital-twins">Digital Twins</TabsTrigger>
        </TabsList>

        {/* Suspense Boundary manages dynamic lazy load passes at a tab-level footprint */}
        <div className="w-full mt-4">
          <Suspense fallback={
            <div className="w-full space-y-4 p-2 animate-in fade-in duration-200">
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/40" />
              <div className="h-64 w-full animate-pulse rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200/50" />
            </div>
          }>
            {renderActiveTabContent()}
          </Suspense>
        </div>
      </Tabs>
    </div>
  )
}