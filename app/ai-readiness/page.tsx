"use client"

import React from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { PageTransition } from '@/components/page-transition'
import { AIReadinessAssessment } from '@/components/ai/AIReadinessAssessment'
import { TrustworthyAIFramework } from '@/components/ai/TrustworthyAIFramework'
import { AIProjectManagerSkills } from '@/components/ai/AIProjectManagerSkills'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Info, Shield, Users } from '@/components/ui/icons-shim'

export default function AIReadinessPage() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 dark:from-slate-900 dark:via-blue-900/20 dark:to-cyan-900/20">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            <PageTransition>
              {/* Page Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 bg-clip-text text-transparent">
                  AI Readiness Assessment
                </h1>
                <p className="text-muted-foreground mt-2">
                  Evaluate your organization's readiness for AI projects based on five critical foundations
                </p>
              </div>

              {/* Info Card */}
              <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <CardTitle className="text-base">About This Assessment</CardTitle>
                      <CardDescription className="mt-2">
                        This assessment is based on the framework outlined in "Is Your Organization Ready to Start an AI Project?" 
                        by Kathleen Walch and Ron Schmelzer. It evaluates five essential foundations that must be in place 
                        before launching AI projects:
                      </CardDescription>
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                        <li>Strong data governance framework</li>
                        <li>Working, well-understood data pipeline</li>
                        <li>Proactive AI data management</li>
                        <li>Measurable AI data quality standards</li>
                        <li>Clear-eyed AI maturity model</li>
                      </ul>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Assessment Tabs */}
              <Tabs defaultValue="readiness" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="readiness">AI Readiness</TabsTrigger>
                  <TabsTrigger value="trustworthy">
                    <Shield className="h-4 w-4 mr-2" />
                    Trustworthy AI
                  </TabsTrigger>
                  <TabsTrigger value="skills">
                    <Users className="h-4 w-4 mr-2" />
                    PM Skills
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="readiness" className="mt-6">
                  <AIReadinessAssessment />
                </TabsContent>

                <TabsContent value="trustworthy" className="mt-6">
                  <div className="mb-6">
                    <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <Shield className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <CardTitle className="text-base">About Trustworthy AI</CardTitle>
                            <CardDescription className="mt-2">
                              Trustworthy AI is built layer by layer through intentional choices about ethics, responsibility, 
                              transparency, governance, and explainability. This five-layer framework shows how ADPA earns trust 
                              instead of just asking for it.
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                  <TrustworthyAIFramework />
                </TabsContent>

                <TabsContent value="skills" className="mt-6">
                  <div className="mb-6">
                    <Card className="border-teal-200 bg-teal-50/50 dark:bg-teal-950/20">
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <Users className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <CardTitle className="text-base">About AI Project Manager Skills</CardTitle>
                            <CardDescription className="mt-2">
                              AI projects require specialized skills beyond traditional project management. This assessment evaluates 
                              how ADPA supports the seven essential skills for leading AI projects: data literacy, critical thinking, 
                              trustworthy AI practices, communication, agile delivery, AI lifecycle understanding, and tool proficiency.
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                  <AIProjectManagerSkills />
                </TabsContent>
              </Tabs>

              {/* Additional Resources */}
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <CardTitle>Related Documentation</CardTitle>
                  </div>
                  <CardDescription>
                    Learn more about ADPA's data governance and AI capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <a
                      href="/docs/06-features/AI_READINESS_ASSESSMENT.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <h4 className="font-medium mb-1">Full Assessment Report</h4>
                      <p className="text-sm text-muted-foreground">
                        Detailed evaluation with evidence, gaps, and recommendations
                      </p>
                    </a>
                    <a
                      href="/docs/generated-documents/dmbok/data-governance-framework.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <h4 className="font-medium mb-1">Data Governance Framework</h4>
                      <p className="text-sm text-muted-foreground">
                        ADPA's comprehensive data governance structure
                      </p>
                    </a>
                    <a
                      href="/docs/roadmap/CR-2025-001_RAG_INTEGRATION.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <h4 className="font-medium mb-1">RAG Integration</h4>
                      <p className="text-sm text-muted-foreground">
                        Semantic search-powered context retrieval
                      </p>
                    </a>
                    <a
                      href="/docs/06-features/TEMPLATE_ANALYTICS_COMPLETE.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <h4 className="font-medium mb-1">Template Analytics</h4>
                      <p className="text-sm text-muted-foreground">
                        Quality metrics and version control system
                      </p>
                    </a>
                    <a
                      href="/docs/06-features/TRUSTWORTHY_AI_FRAMEWORK_ASSESSMENT.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <h4 className="font-medium mb-1">Trustworthy AI Framework</h4>
                      <p className="text-sm text-muted-foreground">
                        Five-layer framework assessment: Ethics, Responsibility, Transparency, Governance, Explainability
                      </p>
                    </a>
                    <a
                      href="/docs/06-features/AI_PROJECT_MANAGER_SKILLS_ASSESSMENT.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <h4 className="font-medium mb-1">AI Project Manager Skills</h4>
                      <p className="text-sm text-muted-foreground">
                        Seven essential skills assessment: Data literacy, Critical thinking, Trustworthy AI, Communication, Agile delivery, AI lifecycle, Tool proficiency
                      </p>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  )
}

