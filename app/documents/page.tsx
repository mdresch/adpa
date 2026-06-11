"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout } from "@/components/animated-layout"
import DocumentLibraryWorkspace from "./document-library-workspace"

export default function DocumentLibraryPage() {
  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <DocumentLibraryWorkspace />
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
