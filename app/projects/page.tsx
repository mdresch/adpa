"use client"

import dynamic from "next/dynamic"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout } from "@/components/animated-layout"
import { ProjectsGridSkeleton } from "@/components/ui/skeleton"

const ProjectsWorkspace = dynamic(() => import("./projects-workspace"), {
  ssr: false,
  loading: () => (
    <div className="animate-in fade-in space-y-6 duration-200">
      <div className="h-16 w-full animate-pulse rounded-xl bg-slate-200/50 dark:bg-slate-800/50" />
      <ProjectsGridSkeleton />
    </div>
  ),
})

export default function ProjectsPage() {
  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <AnimatedLayout>
              <ProjectsWorkspace />
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}