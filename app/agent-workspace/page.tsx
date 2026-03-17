"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout } from "@/components/animated-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Search, Layers, PlusCircle, Activity, Library } from "lucide-react"
import { TaskDecomposition } from "./components/TaskDecomposition"
import { AgentInteraction } from "./components/AgentInteraction"
import { DiscoveryHub } from "./components/DiscoveryHub"

export default function AgentWorkspacePage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState("new-task")

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access the Agentic Workspace.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <AnimatedLayout>
      <div className="flex h-screen bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden text-slate-900 dark:text-slate-100">
        <Sidebar className="hidden md:flex" />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-custom">
            <PageTransition>
              <div className="max-w-7xl mx-auto space-y-8">
                {/* Hero Section */}
                <div className="flex flex-col space-y-2">
                  <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    Agentic Workspace
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-[700px]">
                    Collaborate with autonomous agents to research, plan, and execute complex workflows.
                  </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <TabsList className="bg-background/50 backdrop-blur-sm border p-1 rounded-xl">
                      <TabsTrigger value="new-task" className="flex items-center space-x-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <PlusCircle className="h-4 w-4" />
                        <span>New Task</span>
                      </TabsTrigger>
                      <TabsTrigger value="agent" className="flex items-center space-x-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <Activity className="h-4 w-4" />
                        <span>Agent Hub</span>
                      </TabsTrigger>
                      <TabsTrigger value="discovery" className="flex items-center space-x-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <Search className="h-4 w-4" />
                        <span>Discovery</span>
                      </TabsTrigger>
                      <TabsTrigger value="library" className="flex items-center space-x-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <Library className="h-4 w-4" />
                        <span>Library</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="mt-6">
                    <TabsContent value="new-task" className="animate-in fade-in-50 duration-500 fill-mode-both">
                      <TaskDecomposition />
                    </TabsContent>

                    <TabsContent value="agent" className="animate-in fade-in-50 duration-500 fill-mode-both">
                      <AgentInteraction />
                    </TabsContent>

                    <TabsContent value="discovery" className="animate-in fade-in-50 duration-500 fill-mode-both">
                      <DiscoveryHub mode="search" />
                    </TabsContent>

                    <TabsContent value="library" className="animate-in fade-in-50 duration-500 fill-mode-both">
                      <DiscoveryHub mode="library" />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </PageTransition>
          </main>
        </div>
      </div>
    </AnimatedLayout>
  )
}
