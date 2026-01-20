"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout } from "@/components/animated-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Loader2,
  ArrowLeft,
  ChevronRight,
} from "@/components/ui/icons-shim"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from '@/lib/notify'
import Link from "next/link"
import { apiClient } from "@/lib/api"

interface ApprovalRequest {
  id: string
  workflow_id: string | null
  request_type: string
  change_request_id: string | null
  drift_record_id: string | null
  project_id: string
  title: string
  description: string
  impact_summary: any
  current_stage: number
  total_stages: number
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'escalated'
  priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency'
  severity: 'low' | 'medium' | 'high' | 'critical'
  sla_deadline: string | null
  escalation_deadline: string | null
  requested_by: string
  requested_at: string
  completed_at: string | null
  final_decision: string | null
  decision_notes: string | null
  decided_by: string | null
  decided_at: string | null
  metadata: any
}

interface ApprovalStep {
  id: string
  approval_request_id: string
  step_order: number
  step_name: string
  step_description: string | null
  approver_role: string | null
  approver_user_id: string | null
  is_required: boolean
  is_conditional: boolean
  condition_expression: string | null
  status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'delegated'
  decision: string | null
  decision_notes: string | null
  conditions: string[] | null
  assigned_at: string
  responded_at: string | null
  delegated_to: string | null
  delegated_at: string | null
  delegated_reason: string | null
  metadata: any
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

const stepStatusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-50', label: 'Pending' },
  approved: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50', label: 'Rejected' },
  skipped: { icon: ChevronRight, color: 'text-gray-600', bgColor: 'bg-gray-50', label: 'Skipped' },
  delegated: { icon: User, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Delegated' },
}

export default function ApprovalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const approvalId = params?.id as string

  const [approval, setApproval] = useState<ApprovalRequest | null>(null)
  const [steps, setSteps] = useState<ApprovalStep[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedStep, setSelectedStep] = useState<ApprovalStep | null>(null)
  const [decisionNotes, setDecisionNotes] = useState("")

  useEffect(() => {
    if (approvalId && user) {
      fetchApprovalDetails()
    }
  }, [approvalId, user])

  const fetchApprovalDetails = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<any>(`/approvals/${approvalId}`)
      // API returns { success: true, approval: {...}, steps: [...] }
      setApproval(response.approval)
      setSteps(response.steps || [])
    } catch (error) {
      console.error('Error fetching approval details:', error)
      toast.error('Failed to load approval details')
      setApproval(null)
      setSteps([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedStep) return

    try {
      setProcessing(true)
      await apiClient.post(`/approvals/${approvalId}/steps/${selectedStep.id}/approve`, {
        decision_notes: decisionNotes || undefined,
      })
      toast.success('Approval step approved successfully')
      setShowApproveDialog(false)
      setDecisionNotes("")
      setSelectedStep(null)
      await fetchApprovalDetails()
    } catch (error: any) {
      console.error('Error approving step:', error)
      toast.error(error.response?.data?.message || 'Failed to approve step')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedStep || !decisionNotes.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    try {
      setProcessing(true)
      await apiClient.post(`/approvals/${approvalId}/steps/${selectedStep.id}/reject`, {
        decision_notes: decisionNotes,
      })
      toast.success('Approval step rejected')
      setShowRejectDialog(false)
      setDecisionNotes("")
      setSelectedStep(null)
      await fetchApprovalDetails()
    } catch (error: any) {
      console.error('Error rejecting step:', error)
      toast.error(error.response?.data?.message || 'Failed to reject step')
    } finally {
      setProcessing(false)
    }
  }

  const canApproveStep = (step: ApprovalStep) => {
    if (!approval || !user) return false
    if (step.status !== 'pending') return false
    if (approval.status !== 'pending' && approval.status !== 'in_progress') return false
    // Check if this step is in the current stage
    if (step.step_order !== approval.current_stage) return false
    // Check if user is assigned to this step
    return step.approver_user_id === user.id
  }

  const isOverdue = (slaDeadline: string | null) => {
    if (!slaDeadline) return false
    return new Date(slaDeadline) < new Date()
  }

  if (loading) {
    return (
      <AnimatedLayout>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Approval Details" />
          <PageTransition>
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            </main>
          </PageTransition>
        </div>
      </AnimatedLayout>
    )
  }

  if (!approval) {
    return (
      <AnimatedLayout>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Approval Details" />
          <PageTransition>
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Approval not found</h3>
                  <p className="text-gray-600 text-center mb-4">
                    The approval request you're looking for doesn't exist or you don't have access to it.
                  </p>
                  <Link href="/approvals">
                    <Button>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Approvals
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </main>
          </PageTransition>
        </div>
      </AnimatedLayout>
    )
  }

  const StatusIcon = statusConfig[approval.status].icon
  const overdue = isOverdue(approval.sla_deadline)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Approval Details" />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <PageTransition>
            <AnimatedLayout>
              {/* Back Button */}
              <div className="mb-4">
                <Link href="/approvals">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Approvals
                  </Button>
                </Link>
              </div>

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{approval.title}</h1>
                    <p className="text-muted-foreground">{approval.description}</p>
                  </div>
                </div>

              <div className="flex flex-wrap gap-2">
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
            </div>

            {/* Details Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Request Type</Label>
                    <p className="font-medium capitalize">{approval.request_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Severity</Label>
                    <p className="font-medium capitalize">{approval.severity}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Requested</Label>
                    <p className="font-medium">{new Date(approval.requested_at).toLocaleString()}</p>
                  </div>
                  {approval.sla_deadline && (
                    <div>
                      <Label className="text-sm text-gray-500">SLA Deadline</Label>
                      <p className={`font-medium ${overdue ? 'text-red-600' : ''}`}>
                        {new Date(approval.sla_deadline).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {approval.completed_at && (
                    <div>
                      <Label className="text-sm text-gray-500">Completed</Label>
                      <p className="font-medium">{new Date(approval.completed_at).toLocaleString()}</p>
                    </div>
                  )}
                  {approval.change_request_id && (
                    <div>
                      <Label className="text-sm text-gray-500">Change Request</Label>
                      <Link href={`/documents/${approval.change_request_id}/view`}>
                        <Button variant="link" className="h-auto p-0 font-medium text-blue-600">
                          View Document
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {approval.impact_summary && Object.keys(approval.impact_summary).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm text-gray-500 mb-2 block">Impact Summary</Label>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(approval.impact_summary, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Approval Steps</CardTitle>
                <CardDescription>
                  Progress through the approval workflow stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, index) => {
                    const StepIcon = stepStatusConfig[step.status].icon
                    const isCurrentStep = step.step_order === approval.current_stage
                    const canApprove = canApproveStep(step)

                    return (
                      <div
                        key={step.id}
                        className={`border rounded-lg p-4 ${
                          isCurrentStep ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono">
                                Step {step.step_order}
                              </Badge>
                              <Badge className={`${stepStatusConfig[step.status].bgColor} ${stepStatusConfig[step.status].color}`}>
                                <StepIcon className="h-3 w-3 mr-1" />
                                {stepStatusConfig[step.status].label}
                              </Badge>
                              {step.is_required && (
                                <Badge variant="outline" className="text-xs">Required</Badge>
                              )}
                              {isCurrentStep && (
                                <Badge className="bg-blue-600 text-white text-xs">Current</Badge>
                              )}
                            </div>

                            <h4 className="font-semibold mb-1">{step.step_name}</h4>
                            {step.step_description && (
                              <p className="text-sm text-gray-600 mb-2">{step.step_description}</p>
                            )}

                            {step.approver_role && (
                              <p className="text-sm text-gray-500">
                                <User className="inline h-3 w-3 mr-1" />
                                Role: <span className="font-medium">{step.approver_role}</span>
                              </p>
                            )}

                            {step.decision_notes && (
                              <div className="mt-2 p-2 bg-gray-50 rounded border">
                                <Label className="text-xs text-gray-500">Decision Notes:</Label>
                                <p className="text-sm mt-1">{step.decision_notes}</p>
                              </div>
                            )}

                            {step.responded_at && (
                              <p className="text-xs text-gray-500 mt-2">
                                Responded: {new Date(step.responded_at).toLocaleString()}
                              </p>
                            )}
                          </div>

                          {canApprove && (
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedStep(step)
                                  setShowApproveDialog(true)
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedStep(step)
                                  setShowRejectDialog(true)
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
            </AnimatedLayout>
          </PageTransition>
        </main>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Step</DialogTitle>
            <DialogDescription>
              You are about to approve this approval step. You can optionally add notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="approve-notes">Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                placeholder="Add any comments or conditions..."
                value={decisionNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDecisionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false)
                setDecisionNotes("")
                setSelectedStep(null)
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Step</DialogTitle>
            <DialogDescription>
              You are about to reject this approval step. Please provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reject-notes">Reason for Rejection *</Label>
              <Textarea
                id="reject-notes"
                placeholder="Explain why you are rejecting this request..."
                value={decisionNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDecisionNotes(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setDecisionNotes("")
                setSelectedStep(null)
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !decisionNotes.trim()}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
