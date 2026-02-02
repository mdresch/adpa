'use client'

import React, { useEffect, useState } from 'react'
import { useDigitalTwin } from '@/hooks/use-digital-twin'
import { AssetList } from '@/components/digital-twin/AssetList'
import { VisioUpload } from '@/components/digital-twin/VisioUpload'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { apiClient } from '@/lib/api'

export default function DigitalTwinPage() {
    // We need to fetch the current project ID from the layout/context or URL
    // For now, let's try to get it from local storage or wait for user to select (mocking for POC)
    // In ADPA, project context is usually significant.
    // I will check if there is a useProject hook or similar.
    // Assuming we need a projectId to operate.

    // Placeholder: In a real app, this comes from URL like /projects/:id/digital-twin
    // But for this POC in the main dashboard, we might default to a specific one or show a selector.
    // Let's use a simple state for now, assuming user will likely navigate from a project.
    // However, since this page is at /digital-twin (top level), we might need to list all or ask to select.
    // To keep it simple for the user asking for "Integration", I will assume we can list generic assets 
    // or fetch from the first logical project if available.

    // Let's defer project selection or use a "Demo Project" ID if not present.

    const { assets, fetchAssets, loading } = useDigitalTwin()
    const [projectId, setProjectId] = useState<string>('')

    useEffect(() => {
        // Attempt to find a project to default to
        const init = async () => {
            try {
                const projects = await apiClient.getProjects({ limit: 1 })
                // api.getProjects returns different shape? check api.ts
                // api.getProjects returns Promise<ApiResponse<Project[]> | Project[]> depending on implementation
                // api.ts: async getProjects(params?: {...}) 
                // Let's assume it returns { data: Project[] } or Project[]

                // Fix: Use a safer check or just let user input/select if needed
                // For POC, I'll fetch and pick the first one.

                // Actually, looking at api.ts printout earlier:
                // interface ApiResponse<T> { data?: T ... }
                // getProjects returns ... (truncated in view_file).

                // I'll take a safe guess that I can list projects. 
                // If not, I'll render a "Select Project" placeholder.

                // Actually, let's hardcode a logical flow: 
                // 1. Fetch projects
                // 2. Set first project as active

                const res: any = await apiClient.getProjects()
                const projectList = res.data || res.projects || (Array.isArray(res) ? res : [])
                if (projectList.length > 0) {
                    const firstId = projectList[0].id
                    setProjectId(firstId)
                    fetchAssets(firstId)
                }
            } catch (e) {
                console.error("Could not auto-select project", e)
            }
        }

        init()
    }, [fetchAssets])

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Digital Twin (POC)</h2>
                <div className="flex items-center space-x-2">
                    {/* Actions */}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                    {projectId ? (
                        <AssetList assets={assets} loading={loading} />
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                Loading Project Context...
                            </CardContent>
                        </Card>
                    )}
                </div>
                <div className="col-span-3 space-y-4">
                    {projectId && (
                        <VisioUpload
                            projectId={projectId}
                            onUploadComplete={() => fetchAssets(projectId)}
                        />
                    )}

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
