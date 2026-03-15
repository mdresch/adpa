"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket, useJobUpdates } from "@/contexts/WebSocketContext"
import { apiClient, type Job } from "@/lib/api"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { SkeletonStats } from "@/components/ui/skeleton"

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

export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { isConnected } = useWebSocket()
  const jobUpdates = useJobUpdates()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [aiProviders, setAiProviders] = useState<any[]>([])
  const [recentJobs, setRecentJobs] = useState<Job[]>([])
  const [integrations, setIntegrations] = useState<any[]>([])
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
          apiClient.getIntegrations()
        ])

        setDashboardData(analytics)
        setAiProviders(providers)
        setRecentJobs(jobs.jobs)
        setIntegrations(integrationsRes)
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchDashboardData()
    }
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

  return (
    <AnimatedLayout>
      <div className="flex h-screen bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden text-slate-900 dark:text-slate-100">
        <Sidebar className="hidden md:flex" />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 scrollbar-custom">
            <PageTransition>
              <DashboardHero 
                user={user} 
                prefersReducedMotion={prefersReducedMotion} 
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <StatsOverview
                    isConnected={isConnected}
                    recentJobs={recentJobs ?? []}
                    jobUpdates={jobUpdates ?? {}}
                    dashboardData={dashboardData ?? {}}
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
                    onProviderClick={() => router.push('/settings?tab=ai')}
                  />
                  <IntegrationHealth
                    integrations={integrations}
                    prefersReducedMotion={prefersReducedMotion}
                  />
                  <SystemPerformanceMetrics
                    dashboardData={dashboardData ?? {}}
                    aiProviders={aiProviders ?? []}
                  />
                </div>
              </div>
            </PageTransition>
          </main>
        </div>
      </div>
    </AnimatedLayout>
  )
}
