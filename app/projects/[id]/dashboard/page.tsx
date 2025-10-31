'use client'

import ProjectDashboardV0 from '@/components/project/ProjectDashboardV0'

interface ProjectDashboardPageProps {
  params: { id: string }
}

export default function ProjectDashboardPage({ params }: ProjectDashboardPageProps) {
  return <ProjectDashboardV0 projectId={params.id} />
}

