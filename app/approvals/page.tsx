"use client"

import React, { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Loader2,
} from "@/components/ui/icons-shim"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import Link from "next/link"
import { apiClient } from "@/lib/api"
import { CreateApprovalDialog } from "./components/CreateApprovalDialog"

interface ApprovalRequest {
  id: string
  request_type: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'escalated'
  priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency'
  severity: 'low' | 'medium' | 'high' | 'critical'
  sla_deadline: string | null
  requested_at: string
  project_id: string
  current_stage: number
  total_stages: number
}

interface ApprovalStats {
  pending: number
  approved: number
  rejected: number
  overdue: number
}

const priorityConfig = {
  low: { emoji: '📋', color: 'bg-gray-100 text-gray-800', label: 'Low' },
  medium: { emoji: 'ℹ️', color: 'bg-blue-100 text-blue-800', label: 'Medium' },
  high: { emoji: '⚠️', color: 'bg-orange-100 text-orange-800', label: 'High' },
  critical: { emoji: '🚨', color: 'bg-red-100 text-red-800', label: 'Critical' },
  emergency: { emoji: '🚨🚨', color: 'bg-red-600 text-white', label: 'Emergency' },
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  in_progress: { icon: Clock, color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
  approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Approved' },
  rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejected' },
  cancelled: { icon: XCircle, color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
  expired: { icon: AlertCircle, color: 'bg-red-100 text-red-800', label: 'Expired' },
  escalated: { icon: AlertCircle, color: 'bg-orange-100 text-orange-800', label: 'Escalated' },
}

export default function ApprovalsPage() {
  const { user } = useAuth()
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [stats, setStats] = useState<ApprovalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    if (user) {
      fetchApprovals()
      fetchStats()
    }
  }, [user, filter])

  const fetchApprovals = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<any>('/approvals')
      // API returns { success: true, approvals: [...], count: ... }
      setApprovals(response.approvals || [])
    } catch (error) {
      console.error('Error fetching approvals:', error)
      toast.error('Failed to load approvals')
      setApprovals([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiClient.get<any>('/approvals/stats/user')
      // API returns { success: true, stats: {...} } or direct stats object
      setStats(response.stats || response)
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Set default stats on error
      setStats({ pending: 0, approved: 0, rejected: 0, overdue: 0 })
    }
  }

  const filteredApprovals = approvals.filter(approval => {
    if (filter === 'pending') {
      return approval.status === 'pending' || approval.status === 'in_progress'
    } else if (filter === 'completed') {
      return approval.status === 'approved' || approval.status === 'rejected'
    }
    return true
  })

  const isOverdue = (slaDeadline: string | null) => {
    if (!slaDeadline) return false
    return new Date(slaDeadline) < new Date()
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Approval Requests" />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <PageTransition>
            <AnimatedLayout>
              {/* Header */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Approval Requests</h1>
                  <p className="text-muted-foreground">
                    Review and manage approval requests for change requests and drift resolutions
                  </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Approval Request
                </Button>
              </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Pending</CardDescription>
                    <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Approved</CardDescription>
                    <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Rejected</CardDescription>
                    <CardTitle className="text-3xl text-red-600">{stats.rejected}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Overdue</CardDescription>
                    <CardTitle className="text-3xl text-red-600">{stats.overdue}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                onClick={() => setFilter('completed')}
              >
                Completed
              </Button>
            </div>

            {/* Approvals List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : filteredApprovals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No approval requests</h3>
                  <p className="text-muted-foreground text-center">
                    {filter === 'pending'
                      ? "You don't have any pending approval requests"
                      : filter === 'completed'
                      ? "No completed approvals yet"
                      : "No approval requests found"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <AnimatedGrid>
                {filteredApprovals.map((approval) => {
                  const StatusIcon = statusConfig[approval.status].icon
                  const overdue = isOverdue(approval.sla_deadline)

                  return (
                    <AnimatedGridItem key={approval.id}>
                      <Link href={`/approvals/${approval.id}`}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                          <CardHeader>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <CardTitle className="text-lg mb-1">{approval.title}</CardTitle>
                                <CardDescription className="text-sm line-clamp-2">
                                  {approval.description}
                                </CardDescription>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-3">
                              {/* Status Badge */}
                              <Badge className={statusConfig[approval.status].color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[approval.status].label}
                              </Badge>

                              {/* Priority Badge */}
                              <Badge className={priorityConfig[approval.priority].color}>
                                <span className="mr-1">{priorityConfig[approval.priority].emoji}</span>
                                {priorityConfig[approval.priority].label}
                              </Badge>

                              {/* Overdue Badge */}
                              {overdue && (approval.status === 'pending' || approval.status === 'in_progress') && (
                                <Badge className="bg-red-600 text-white">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Overdue
                                </Badge>
                              )}

                              {/* Stage Progress */}
                              <Badge variant="outline">
                                Stage {approval.current_stage}/{approval.total_stages}
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                <span>
                                  Requested: {new Date(approval.requested_at).toLocaleDateString()}
                                </span>
                              </div>
                              {approval.sla_deadline && (
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2" />
                                  <span className={overdue ? 'text-red-600 font-semibold' : ''}>
                                    SLA: {new Date(approval.sla_deadline).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                <span className="capitalize">{approval.request_type.replace('_', ' ')}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </AnimatedGridItem>
                  )
                })}
              </AnimatedGrid>
            )}
            </AnimatedLayout>
          </PageTransition>
        </main>
      </div>

      <CreateApprovalDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          void fetchApprovals()
          void fetchStats()
        }}
      />
    </div>
  )
}
