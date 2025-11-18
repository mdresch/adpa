"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Users, TrendingUp, AlertTriangle, CheckCircle, XCircle } from '@/components/ui/icons-shim'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/api-url'
import { ResourceAllocationMatrix } from './ResourceAllocationMatrix'
import { CapacityPlanningDashboard } from './CapacityPlanningDashboard'
import { SkillsInventoryView } from './SkillsInventoryView'
import { ResourceConflictsView } from './ResourceConflictsView'

interface ProgramResourcesTabProps {
  programId: string
}

export function ProgramResourcesTab({ programId }: ProgramResourcesTabProps) {
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState('allocation')
  const [summary, setSummary] = useState<{
    totalResources: number
    activeAllocations: number
    conflicts: number
    utilization: number
  } | null>(null)

  useEffect(() => {
    void fetchSummary()
  }, [programId])

  const fetchSummary = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      
      // Fetch allocations
      const allocationsResponse = await fetch(
        getApiUrl(`/programs/${programId}/resources/allocations`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      // Fetch conflicts
      const conflictsResponse = await fetch(
        getApiUrl(`/programs/${programId}/resources/conflicts`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      // Fetch utilization
      const utilizationResponse = await fetch(
        getApiUrl(`/programs/${programId}/resources/utilization`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      const allocations = allocationsResponse.ok 
        ? await allocationsResponse.json().then((r: any) => r.data || [])
        : []
      
      const conflicts = conflictsResponse.ok
        ? await conflictsResponse.json().then((r: any) => r.data || [])
        : []
      
      const utilization = utilizationResponse.ok
        ? await utilizationResponse.json().then((r: any) => r.data)
        : null

      const activeAllocations = allocations.filter((a: any) => 
        a.allocationStatus === 'active' || a.allocationStatus === 'planned'
      ).length

      setSummary({
        totalResources: new Set(allocations.map((a: any) => a.resourceId)).size,
        activeAllocations,
        conflicts: conflicts.length,
        utilization: utilization?.avgUtilization || 0
      })
    } catch (error) {
      console.error('[RESOURCES] Failed to fetch summary:', error)
      setSummary({
        totalResources: 0,
        activeAllocations: 0,
        conflicts: 0,
        utilization: 0
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{summary?.totalResources || 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Allocations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="text-2xl font-bold">{summary?.activeAllocations || 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {summary && summary.conflicts > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div className="text-2xl font-bold text-red-600">{summary.conflicts}</div>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">0</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">
                {summary?.utilization ? `${Math.round(summary.utilization)}%` : '0%'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="allocation">Allocations</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="conflicts">
            Conflicts
            {summary && summary.conflicts > 0 && (
              <Badge variant="destructive" className="ml-2">
                {summary.conflicts}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="allocation" className="mt-6">
          <ResourceAllocationMatrix programId={programId} />
        </TabsContent>

        <TabsContent value="capacity" className="mt-6">
          <CapacityPlanningDashboard programId={programId} />
        </TabsContent>

        <TabsContent value="skills" className="mt-6">
          <SkillsInventoryView programId={programId} />
        </TabsContent>

        <TabsContent value="conflicts" className="mt-6">
          <ResourceConflictsView programId={programId} onRefresh={fetchSummary} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

