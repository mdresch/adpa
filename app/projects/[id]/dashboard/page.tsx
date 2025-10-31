'use client'

import { use } from 'react'
import ProjectDashboardV0 from '@/components/project/ProjectDashboardV0'

export default function ProjectDashboardPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  
  return <ProjectDashboardV0 projectId={id} />
}

