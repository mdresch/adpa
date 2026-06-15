import React from 'react'
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AnimatedLayout } from "@/components/animated-layout"
import ProjectWorkspaceOrchestrator from './components/project-workspace'

export default function ProjectDetail({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>, 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const resolvedParams = React.use(params)
  const projectId = resolvedParams.id

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden bg-muted/30">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          <AnimatedLayout>
            <ProjectWorkspaceOrchestrator projectId={projectId} />
          </AnimatedLayout>
        </main>
      </div>
    </div>
  )
}
