"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient, type Job } from "@/lib/api"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { SkeletonStats, DashboardGridSkeleton } from "@/components/ui/skeleton"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout } from "@/components/animated-layout"

import { DashboardHero } from "@/components/dashboard/DashboardHero"
import { StatsOverview } from "@/components/dashboard/StatsOverview"
import { AIProviderStatus } from "@/components/dashboard/AIProviderStatus"
import { RecentActivity } from "@/components/dashboard/RecentActivity"
import { IntegrationHealth } from "@/components/dashboard/IntegrationHealth"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { IntelligenceShowcase } from "@/components/dashboard/IntelligenceShowcase"
import { KnowledgeCompression } from "@/components/dashboard/KnowledgeCompression"
import { ProcessingPipeline } from "@/components/dashboard/ProcessingPipeline"
import { SystemPerformanceMetrics } from "@/components/dashboard/SystemPerformanceMetrics"
import { LandingPage } from "@/components/landing/LandingPage"

interface DashboardData {
  projects: {
    total_projects: number
    active_projects: number
    completed_projects: number
    projects_last_30d: number
  }
  documents: {
    total_documents: number
    published_documents: number
    documents_last_30d: number
  }
  ai: {
    total_generations: number
    generations_last_30d: number
  }
  recent_activity: Array<{
    action: string
    resource_type: string
    resource_id: string
    created_at: string
    new_values?: Record<string, unknown>
  }>
  ai_performance?: {
    avg_response_time_ms: number
    success_rate: number
  } | null
}

/** Shape returned by `/api/ai-providers` and consumed by dashboard widgets. */
export interface DashboardAIProvider {
  id?: string
  name: string
  is_active?: boolean
  success_rate?: number
  requestCount?: number
  usage_stats?: {
    total_requests?: number
  }
}

/** Shape returned by `/api/integrations` and consumed by IntegrationHealth. */
export interface DashboardIntegration {
  id?: string
  name: string
  status?: string
  lastSync?: string
  enabled?: boolean
}

const EMPTY_DASHBOARD_DATA: DashboardData = {
  projects: {
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    projects_last_30d: 0,
  },
  documents: {
    total_documents: 0,
    published_documents: 0,
    documents_last_30d: 0,
  },
  ai: {
    total_generations: 0,
    generations_last_30d: 0,
  },
  recent_activity: [],
  ai_performance: null,
}

export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [aiProviders, setAiProviders] = useState<DashboardAIProvider[]>([])
  const [recentJobs, setRecentJobs] = useState<Job[]>([])
  const [integrations, setIntegrations] = useState<DashboardIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated) return

      try {
        setLoading(true)
        const [analytics, providers, jobs, integrationsRes] = await Promise.all([
          apiClient.getDashboardAnalytics(),
          apiClient.getAIProviders(),
          apiClient.getJobs({ limit: 5 }),
          apiClient.getIntegrations(),
        ])

        setDashboardData(analytics)
        setAiProviders(providers as DashboardAIProvider[])
        setRecentJobs(jobs.jobs)
        setIntegrations(integrationsRes as DashboardIntegration[])
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [isAuthenticated])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <SkeletonStats />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LandingPage />
  }

  const resolvedDashboard = dashboardData ?? EMPTY_DASHBOARD_DATA

  return (
    <AnimatedLayout>
      <div className="flex h-screen bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden text-slate-900 dark:text-slate-100">
        <Sidebar className="hidden md:flex" />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 scrollbar-custom">
            <PageTransition>
              <DashboardHero user={user} prefersReducedMotion={prefersReducedMotion} />

              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="dashboard-skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DashboardGridSkeleton />
                  </motion.div>
                ) : (
                  <motion.div
                    key="dashboard-content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                  >
                    <div className="lg:col-span-2 space-y-8">
                      <StatsOverview
                        recentJobs={recentJobs}
                        dashboardData={resolvedDashboard}
                      />
                      <IntelligenceShowcase />
                      <ProcessingPipeline jobs={recentJobs} />
                      <KnowledgeCompression />
                    </div>

                    <div className="space-y-8">
                      <QuickActions quickActions={[]} />
                      <RecentActivity activities={dashboardData?.recent_activity || []} />
                      <AIProviderStatus
                        aiProviders={aiProviders}
                        performance={dashboardData?.ai_performance}
                        prefersReducedMotion={prefersReducedMotion}
                        onProviderClick={() => router.push("/settings?tab=ai")}
                      />
                      <IntegrationHealth
                        integrations={integrations}
                        prefersReducedMotion={prefersReducedMotion}
                      />
                      <SystemPerformanceMetrics
                        dashboardData={resolvedDashboard}
                        aiProviders={aiProviders}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </PageTransition>
          </main>
        </div>
      </div>
    </AnimatedLayout>
  )
}
