'use client'

import React, { use } from 'react'
import { useDigitalTwin } from '@/hooks/use-digital-twin'
import { AssetList } from '@/components/digital-twin/AssetList'
import { VisioUpload } from '@/components/digital-twin/VisioUpload'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectDigitalTwinPage({ params }: PageProps) {
  // Unwrap params using React.use for Next.js 15+ compatibility
  const { id: projectId } = use(params)

  const { assets, fetchAssets, loading } = useDigitalTwin()

  // Initial fetch on mount or when projectId changes
  React.useEffect(() => {
    if (projectId) {
      fetchAssets(projectId)
    }
  }, [projectId, fetchAssets])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Digital Twin (Visio Bridge)</h2>
      </div>

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
    </div>
  )
}
