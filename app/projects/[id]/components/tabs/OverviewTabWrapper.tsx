"use client"

import React, { useState, useEffect } from "react"
import { OverviewTab } from "../OverviewTab"
import { apiClient, ExtendedProject, Stakeholder } from "@/lib/api"

export default function OverviewTabWrapper({ project, projectId }: { project: ExtendedProject, projectId: string }) {
  const [documentStats, setDocumentStats] = useState<any>({
    totalDocuments: 0,
    counts: { draft: 0, published: 0, review: 0, archived: 0 }
  })
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    async function fetchData() {
      try {
        setLoading(true)
        const [statsResponse, stakeholdersData] = await Promise.all([
          apiClient.request(`/documents/project/${projectId}/stats`).catch(() => ({ stats: {} })),
          apiClient.getProjectStakeholders(projectId).catch(() => ({ stakeholders: [] }))
        ]) as [any, any]
        
        if (isMounted) {
          const statsData = statsResponse.stats || {}
          setDocumentStats({
            totalDocuments: Number(statsData.total_documents) || 0,
            counts: {
              draft: Number(statsData.draft_documents) || 0,
              published: Number(statsData.published_documents) || 0,
              review: Number(statsData.review_documents) || 0,
              archived: 0,
            },
          })
          
          setStakeholders(Array.isArray(stakeholdersData.stakeholders) ? stakeholdersData.stakeholders : [])
        }
      } catch (error) {
        console.error("Failed to fetch overview data:", error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    
    fetchData()
    
    return () => { isMounted = false }
  }, [projectId])

  const getProjectProgress = () => {
    if (!project?.start_date || !project?.end_date) return 0

    const startDate = new Date(project.start_date)
    const endDate = new Date(project.end_date)
    const now = new Date()

    if (now < startDate) return 0
    if (now > endDate) return 100

    const totalDays = endDate.getTime() - startDate.getTime()
    const elapsedDays = now.getTime() - startDate.getTime()
    return Math.round((elapsedDays / totalDays) * 100)
  }

  const managerName = (project as any).owner_name || 'Not assigned'
  const progress = getProjectProgress()

  if (loading) {
    return <div className="p-4 flex items-center justify-center">Loading overview...</div>
  }

  return (
    <OverviewTab
      project={project}
      progress={progress}
      managerName={managerName}
      documentStats={documentStats}
      stakeholders={stakeholders}
      projectId={projectId}
    />
  )
}
