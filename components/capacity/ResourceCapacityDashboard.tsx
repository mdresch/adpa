"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Loader2, Users, Clock, AlertTriangle, CheckCircle2, 
  TrendingUp, Settings, Calendar, RefreshCw, Search,
  BarChart3, Target, AlertCircle, Briefcase, ClipboardList
} from '@/components/ui/icons-shim'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/api-url'
import { CapacitySettingsDialog } from './CapacitySettingsDialog'
import { UnavailabilityDialog } from './UnavailabilityDialog'
import { UserUtilizationCard } from './UserUtilizationCard'
import { TasksAndResourceTab } from './TasksAndResourceTab'
import { ChecklistItemsTab } from './ChecklistItemsTab'

// ================================================================
// INTERFACES
// ================================================================

interface PortfolioUtilization {
  userId: string
  userName: string
  userEmail: string
  resourceType: string
  contractedWeeklyHours: number
  monthlyCapacityHours: number
  targetUtilizationPercent: number
  maxAllocationPercent: number
  totalPlannedHours: number
  totalActualHours: number
  projectsAssigned: number
  unavailableHoursNext30Days: number
  availableCapacityHours: number
  plannedUtilizationPercent: number
  actualUtilizationPercent: number
  allocationStatus: string
  hoursToTarget: number
  hoursToMax: number
}

interface PortfolioSummary {
  totalResources: number
  fullTimeCount: number
  otherCount: number
  totalWeeklyCapacity: number
  totalMonthlyCapacity: number
  totalAvailableCapacity: number
  totalPlannedHours: number
  totalActualHours: number
  avgUtilizationPercent: number
  avgActiveUtilization: number
  overAllocatedCount: number
  over100Count: number
  optimalCount: number
  underTargetCount: number
  lowUtilizationCount: number
  unallocatedCount: number
  targetAchievementPercent: number
}

interface PendingRequest {
  id: string
  userId: string
  userName: string
  userEmail: string
  unavailabilityType: string
  description?: string
  startDate: string
  endDate: string
  hoursUnavailable: number
  createdAt: string
}

// ================================================================
// COMPONENT
// ================================================================

export function ResourceCapacityDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [utilization, setUtilization] = useState<PortfolioUtilization[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  
  // Dialogs
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [settingsDialogUser, setSettingsDialogUser] = useState<string | null>(null)
  const [unavailabilityDialogOpen, setUnavailabilityDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    void fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const headers = { 'Authorization': `Bearer ${token}` }

      const [summaryRes, utilizationRes, pendingRes] = await Promise.all([
        fetch(getApiUrl('/resource-capacity/utilization/portfolio/summary'), { headers }),
        fetch(getApiUrl('/resource-capacity/utilization/portfolio'), { headers }),
        fetch(getApiUrl('/resource-capacity/unavailability/pending'), { headers })
      ])

      if (summaryRes.ok) {
        const data = await summaryRes.json()
        setSummary(data.data)
      }

      if (utilizationRes.ok) {
        const data = await utilizationRes.json()
        // Deduplicate by userId to prevent duplicate key warnings
        const utilizationList = data.data || []
        const uniqueUtilization = Array.from(
          new Map(utilizationList.map((u: PortfolioUtilization) => [u.userId, u])).values()
        ) as PortfolioUtilization[]
        setUtilization(uniqueUtilization)
      }

      if (pendingRes.ok) {
        const data = await pendingRes.json()
        setPendingRequests(data.data || [])
      }
    } catch (error) {
      console.error('[CAPACITY] Failed to fetch data:', error)
      toast.error('Failed to load capacity data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
    toast.success('Data refreshed')
  }

  const handleApproveRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/resource-capacity/unavailability/${requestId}/status`),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        }
      )

      if (response.ok) {
        toast.success(`Request ${status}`)
        setPendingRequests(prev => prev.filter(r => r.id !== requestId))
        void fetchData()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update request')
      }
    } catch (error) {
      toast.error('Failed to update request')
    }
  }

  const openSettingsDialog = (userId?: string) => {
    setSettingsDialogUser(userId || null)
    setSettingsDialogOpen(true)
  }

  const openUnavailabilityDialog = (userId?: string) => {
    setSelectedUserId(userId || null)
    setUnavailabilityDialogOpen(true)
  }

  // Filter utilization data
  const filteredUtilization = utilization.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || user.allocationStatus === statusFilter
    const matchesType = typeFilter === 'all' || user.resourceType === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over-allocated': return 'bg-red-100 text-red-800 border-red-300'
      case 'over-100': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'optimal': return 'bg-green-100 text-green-800 border-green-300'
      case 'under-target': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low-utilization': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'unallocated': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resource Capacity Management</h1>
          <p className="text-muted-foreground">
            Monitor resource utilization, manage capacity settings, and track availability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" onClick={() => openUnavailabilityDialog()}>
            <Calendar className="h-4 w-4 mr-2" />
            Request Leave
          </Button>
          <Button onClick={() => openSettingsDialog()}>
            <Settings className="h-4 w-4 mr-2" />
            Capacity Settings
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Total Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(summary.totalResources)}</div>
              <p className="text-xs text-muted-foreground">
                {Number(summary.fullTimeCount)} full-time • {Number(summary.otherCount)} other
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Monthly Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(summary.totalMonthlyCapacity).toLocaleString()}h</div>
              <p className="text-xs text-muted-foreground">
                {Number(summary.totalAvailableCapacity).toLocaleString()}h available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Avg Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(Number(summary.avgUtilizationPercent))}%</div>
              <Progress 
                value={Number(summary.avgUtilizationPercent)} 
                className="h-2 mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Target Achievement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(Number(summary.targetAchievementPercent))}%</div>
              <p className="text-xs text-muted-foreground">
                {Number(summary.optimalCount)} at optimal • {Number(summary.underTargetCount)} below target
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Overview */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm font-medium">Over-allocated</span>
            </div>
            <div className="text-xl font-bold mt-1">{Number(summary.overAllocatedCount)}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <span className="text-sm font-medium">Over 100%</span>
            </div>
            <div className="text-xl font-bold mt-1">{Number(summary.over100Count)}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Optimal</span>
            </div>
            <div className="text-xl font-bold mt-1">{Number(summary.optimalCount)}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium">Under Target</span>
            </div>
            <div className="text-xl font-bold mt-1">{Number(summary.underTargetCount)}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">Low Util</span>
            </div>
            <div className="text-xl font-bold mt-1">{Number(summary.lowUtilizationCount)}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
              <span className="text-sm font-medium">Unallocated</span>
            </div>
            <div className="text-xl font-bold mt-1">{Number(summary.unallocatedCount)}</div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="utilization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="utilization" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Resource Utilization
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Pending Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Tasks & Resources
          </TabsTrigger>
          <TabsTrigger value="checklist" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Checklist Items
          </TabsTrigger>
        </TabsList>

        {/* Utilization Tab */}
        <TabsContent value="utilization" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="over-allocated">Over-allocated</SelectItem>
                <SelectItem value="over-100">Over 100%</SelectItem>
                <SelectItem value="optimal">Optimal</SelectItem>
                <SelectItem value="under-target">Under Target</SelectItem>
                <SelectItem value="low-utilization">Low Utilization</SelectItem>
                <SelectItem value="unallocated">Unallocated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="part-time">Part-time</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Utilization Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUtilization.map((user) => (
              <UserUtilizationCard
                key={user.userId}
                user={user}
                onEditSettings={() => openSettingsDialog(user.userId)}
                onRequestLeave={() => openUnavailabilityDialog(user.userId)}
              />
            ))}
          </div>

          {filteredUtilization.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No resources match your filters</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tasks & Resources Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <TasksAndResourceTab />
        </TabsContent>

        {/* Checklist Items Tab */}
        <TabsContent value="checklist" className="space-y-4">
          <ChecklistItemsTab />
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">No pending leave requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{request.userName}</span>
                          <Badge variant="outline" className="capitalize">
                            {request.unavailabilityType.replace('-', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{request.userEmail}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {Number(request.hoursUnavailable)}h
                          </span>
                        </div>
                        {request.description && (
                          <p className="text-sm text-muted-foreground mt-2">{request.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleApproveRequest(request.id, 'rejected')}
                        >
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleApproveRequest(request.id, 'approved')}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CapacitySettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        userId={settingsDialogUser}
        onSaved={() => {
          void fetchData()
          setSettingsDialogOpen(false)
        }}
      />

      <UnavailabilityDialog
        open={unavailabilityDialogOpen}
        onOpenChange={setUnavailabilityDialogOpen}
        userId={selectedUserId}
        onSaved={() => {
          void fetchData()
          setUnavailabilityDialogOpen(false)
        }}
      />
    </div>
  )
}

