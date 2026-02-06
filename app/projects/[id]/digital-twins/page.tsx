'use client'

import React, { use } from 'react'
import { useDigitalTwin } from '@/hooks/use-digital-twin'
import { AssetList } from '@/components/digital-twin/AssetList'
import { VisioUpload } from '@/components/digital-twin/VisioUpload'
import { VisioDownloadButton } from '@/components/digital-twin/VisioDownloadButton'
import { TriggerRulesList } from '@/components/digital-twin/TriggerRulesList'
import { CreateTriggerRuleDialog } from '@/components/digital-twin/CreateTriggerRuleDialog'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectDigitalTwinPage({ params }: PageProps) {
  // Unwrap params using React.use for Next.js 15+ compatibility
  const { id: projectId } = use(params)

  const { assets, rules, fetchAssets, fetchRules, createRule, deleteRule, loading } = useDigitalTwin()

  // Initial fetch on mount or when projectId changes
  React.useEffect(() => {
    if (projectId) {
      fetchAssets(projectId)
      fetchRules(projectId)
    }
  }, [projectId, fetchAssets, fetchRules])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Digital Twin (Visio Bridge)</h2>
        <div className="flex items-center space-x-2">
          <VisioDownloadButton projectId={projectId} />
        </div>
      </div>

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets">Assets & Visualization</TabsTrigger>
          <TabsTrigger value="automation">Automation Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <AssetList assets={assets} loading={loading} />
            </div>
            <div className="col-span-3 space-y-4">
              <VisioUpload
                projectId={projectId}
                onUploadComplete={() => fetchAssets(projectId)}
              />

              <Card>
                <CardHeader>
                  <CardTitle>About Digital Twin</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This module bridges traditional <strong>Visio diagrams</strong> with
                    modern Digital Twin capabilities. Upload a .vsdx file to
                    automatically extract assets and properties into the ADPA ecosystem.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Event Triggers</h3>
              <p className="text-sm text-muted-foreground">
                Configure rules to automatically generate documents when assets detect changes.
              </p>
            </div>
            <CreateTriggerRuleDialog onCreate={(rule) => createRule(projectId, rule)} />
          </div>

          <TriggerRulesList
            rules={rules}
            onDelete={(id) => deleteRule(projectId, id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
