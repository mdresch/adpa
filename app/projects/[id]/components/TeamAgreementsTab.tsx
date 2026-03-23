"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Plus, Edit, Trash2, TrendingUp, Star, AlertCircle, BookOpen, ShieldAlert } from "lucide-react"
import { User, Users, Clock, MessageSquare, AlertTriangle, CheckCircle, Code, Zap, MoreHorizontal } from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"
import { toast } from '@/lib/notify'
import { TeamAgreementDialog } from "./TeamAgreementDialog"
import { AdherenceDialog } from "./AdherenceDialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ProjectTeamMember, AgreementParticipant } from "./team-agreements.types"

export interface TeamAgreement {
  id: string
  project_id: string
  title: string
  description: string
  category: 
    | 'working_hours'
    | 'communication'
    | 'decision_making'
    | 'conflict_resolution'
    | 'quality_standards'
    | 'meeting_norms'
    | 'code_of_conduct'
    | 'collaboration_tools'
    | 'response_times'
    | 'knowledge_sharing'
    | 'other'
  agreed_by?: string[]
  agreed_by_details?: AgreementParticipant[]
  facilitated_by?: string | null
  facilitated_by_name?: string | null
  effective_date?: string
  review_frequency?: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'annually' | 'as_needed' | ''
  next_review_date?: string
  status?: 'draft' | 'active' | 'under_review' | 'revised' | 'deprecated'
  adherence_score?: number
  violations_count?: number
  last_violation_date?: string
  notes?: string
  created_at: string
  updated_at: string
  created_by_name?: string | null
}

interface TeamAgreementsTabProps {
  projectId: string
}

// Category configuration with icons and labels
const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  working_hours: {
    label: 'Working Hours & Availability',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20'
  },
  communication: {
    label: 'Communication Protocol',
    icon: MessageSquare,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20'
  },
  decision_making: {
    label: 'Decision Making',
    icon: CheckCircle,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20'
  },
  conflict_resolution: {
    label: 'Conflict Resolution',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20'
  },
  quality_standards: {
    label: 'Quality Standards',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20'
  },
  meeting_norms: {
    label: 'Meeting Norms',
    icon: User,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/20'
  },
  code_of_conduct: {
    label: 'Code of Conduct',
    icon: Users,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/20'
  },
  collaboration_tools: {
    label: 'Collaboration Tools',
    icon: Code,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/20'
  },
  response_times: {
    label: 'Response Times',
    icon: Zap,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20'
  },
  knowledge_sharing: {
    label: 'Knowledge Sharing',
    icon: BookOpen,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50 dark:bg-violet-950/20'
  },
  other: {
    label: 'Other Agreements',
    icon: MoreHorizontal,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20'
  }
}

// Status badge configuration
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  under_review: { label: 'Under Review', variant: 'outline' },
  revised: { label: 'Revised', variant: 'default' },
  deprecated: { label: 'Deprecated', variant: 'destructive' }
}

export function TeamAgreementsTab({ projectId }: TeamAgreementsTabProps) {
  const [agreements, setAgreements] = useState<TeamAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([])
  const [teamMembersLoading, setTeamMembersLoading] = useState(true)
  const [teamMembersError, setTeamMembersError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAgreement, setEditingAgreement] = useState<TeamAgreement | null>(null)
  const [adherenceDialogOpen, setAdherenceDialogOpen] = useState(false)
  const [selectedAgreementForAdherence, setSelectedAgreementForAdherence] = useState<TeamAgreement | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAgreementId, setDeletingAgreementId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [violationLoadingId, setViolationLoadingId] = useState<string | null>(null)


  const fetchTeamAgreements = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.get<{
        success: boolean
        data: TeamAgreement[]
        count: number
      }>(`/team-agreements/project/${projectId}`)
      if (response.success && response.data) {
        setAgreements(response.data)
      } else {
        setAgreements([])
      }
    } catch (err: unknown) {
      console.error('Error fetching team agreements:', err)
      const message = err instanceof Error ? err.message : 'Failed to load team agreements'
      setError(message)
      toast.error('Failed to load team agreements')
      setAgreements([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const fetchTeamMembers = useCallback(async () => {
    try {
      setTeamMembersLoading(true)
      setTeamMembersError(null)
      const response = await apiClient.get<{
        success: boolean
        data: ProjectTeamMember[]
      }>(`/projects/${projectId}/team-members`)
      if (response.success && Array.isArray(response.data)) {
        setTeamMembers(response.data)
      } else {
        setTeamMembers([])
      }
    } catch (err: unknown) {
      console.error('Error fetching team members:', err)
      const message = err instanceof Error ? err.message : 'Failed to load team members'
      setTeamMembersError(message)
      toast.error(message)
      setTeamMembers([])
    } finally {
      setTeamMembersLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchTeamAgreements()
  }, [fetchTeamAgreements])

  useEffect(() => {
    void fetchTeamMembers()
  }, [fetchTeamMembers])

  const handleRecordViolation = async (agreementId: string) => {
    try {
      setViolationLoadingId(agreementId)
      const response = await apiClient.post<{
        success: boolean
        data: TeamAgreement
      }>(`/team-agreements/${agreementId}/violation`)

      if (response.success) {
        toast.success('Violation recorded')
        void fetchTeamAgreements()
      } else {
        throw new Error('Failed to record violation')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record violation'
      console.error('Error recording violation:', err)
      toast.error(message)
    } finally {
      setViolationLoadingId(null)
    }
  }

  // Group agreements by category
  const groupedAgreements = agreements.reduce((acc, agreement) => {
    const category = agreement.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(agreement)
    return acc
  }, {} as Record<string, TeamAgreement[]>)

  // Sort categories by order (defined categories first, then 'other')
  const categoryOrder = Object.keys(CATEGORY_CONFIG)
  const sortedCategories = Object.keys(groupedAgreements).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a)
    const bIndex = categoryOrder.indexOf(b)
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return dateString
    }
  }

  const formatReviewFrequency = (frequency?: string) => {
    if (!frequency) return null
    const freq = frequency.toLowerCase().replace(/_/g, ' ')
    return freq.charAt(0).toUpperCase() + freq.slice(1)
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return null
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const formatParticipantName = (participant?: AgreementParticipant) => {
    if (!participant) return ''
    return participant.name || participant.email || participant.id
  }

  const hasAgreements = agreements.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
        <p className="font-medium mb-1">Error Loading Agreements</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchTeamAgreements} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Agreements</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {agreements.length} agreement{agreements.length !== 1 ? 's' : ''} across {sortedCategories.length} categor{sortedCategories.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => {
              setEditingAgreement(null)
              setDialogOpen(true)
            }} 
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Agreement
          </Button>
          <Button onClick={fetchTeamAgreements} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {teamMembersError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load team members</AlertTitle>
          <AlertDescription>{teamMembersError}</AlertDescription>
        </Alert>
      )}

      {!teamMembersError && !teamMembersLoading && teamMembers.length === 0 && (
        <Alert>
          <AlertTitle>No project team configured</AlertTitle>
          <AlertDescription>
            Add team members to the project to assign agreements to individuals. Manual agreements can still be saved and edited.
          </AlertDescription>
        </Alert>
      )}

      {hasAgreements ? (
        sortedCategories.map((category) => {
        const categoryAgreements = groupedAgreements[category]
        const categoryInfo = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other
        const CategoryIcon = categoryInfo.icon

        return (
          <Card key={category} className="overflow-hidden">
            <CardHeader className={`${categoryInfo.bgColor} border-b`}>
              <div className="flex items-center gap-3">
                <CategoryIcon className={`h-5 w-5 ${categoryInfo.color}`} />
                <div className="flex-1">
                  <CardTitle className="text-lg">{categoryInfo.label}</CardTitle>
                  <CardDescription>
                    {categoryAgreements.length} agreement{categoryAgreements.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {categoryAgreements.map((agreement) => (
                  <div
                    key={agreement.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base mb-1">{agreement.title}</h3>
                        {agreement.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {agreement.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {agreement.status && STATUS_CONFIG[agreement.status] && (
                          <Badge variant={STATUS_CONFIG[agreement.status].variant}>
                            {STATUS_CONFIG[agreement.status].label}
                          </Badge>
                        )}
                        {agreement.adherence_score !== null && agreement.adherence_score !== undefined && (() => {
                          const score = typeof agreement.adherence_score === 'number' 
                            ? agreement.adherence_score 
                            : parseFloat(String(agreement.adherence_score))
                          if (!isNaN(score) && score >= 0 && score <= 10) {
                            return (
                              <Badge variant="outline" className="gap-1">
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                {score.toFixed(1)}/10
                              </Badge>
                            )
                          }
                          return null
                        })()}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAgreement(agreement)
                              setDialogOpen(true)
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAgreementForAdherence(agreement)
                              setAdherenceDialogOpen(true)
                            }}
                            className="h-8 w-8 p-0"
                            title="Record adherence"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRecordViolation(agreement.id)}
                          className="h-8 w-8 p-0"
                          title="Record violation"
                          disabled={violationLoadingId === agreement.id}
                        >
                          {violationLoadingId === agreement.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                          ) : (
                            <ShieldAlert className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingAgreementId(agreement.id)
                              setDeleteDialogOpen(true)
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {agreement.agreed_by_details && agreement.agreed_by_details.length > 0 ? (
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground">Agreed by:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {agreement.agreed_by_details.map(participant => (
                              <Badge key={participant.id} variant="secondary">
                                {formatParticipantName(participant)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : agreement.agreed_by && agreement.agreed_by.length > 0 ? (
                        <div>
                          <span className="text-muted-foreground">Agreed by:</span>
                          <p className="font-medium mt-0.5">
                            {agreement.agreed_by.length} member{agreement.agreed_by.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      ) : null}
                      {agreement.facilitated_by && (
                        <div>
                          <span className="text-muted-foreground">Facilitated by:</span>
                          <p className="font-medium mt-0.5">{agreement.facilitated_by}</p>
                        </div>
                      )}
                      {agreement.effective_date && (
                        <div>
                          <span className="text-muted-foreground">Effective:</span>
                          <p className="font-medium mt-0.5">{formatDate(agreement.effective_date)}</p>
                        </div>
                      )}
                      {agreement.review_frequency && (
                        <div>
                          <span className="text-muted-foreground">Review:</span>
                          <p className="font-medium mt-0.5">{formatReviewFrequency(agreement.review_frequency)}</p>
                        </div>
                      )}
                      {agreement.next_review_date && (
                        <div>
                          <span className="text-muted-foreground">Next Review:</span>
                          <p className="font-medium mt-0.5">{formatDate(agreement.next_review_date)}</p>
                        </div>
                      )}
                      {agreement.violations_count !== null && agreement.violations_count !== undefined && agreement.violations_count > 0 && (
                        <div>
                          <span className="text-muted-foreground">Violations:</span>
                          <p className="font-medium mt-0.5 text-orange-600">{agreement.violations_count}</p>
                        </div>
                      )}
                    </div>

                    {agreement.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">{agreement.notes}</p>
                      </div>
                    )}

                    <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-4">
                      {agreement.created_by_name && (
                        <span>Created by {agreement.created_by_name}</span>
                      )}
                      <span>Updated {formatDateTime(agreement.updated_at)}</span>
                      {agreement.last_violation_date && (
                        <span>Last violation {formatDateTime(agreement.last_violation_date)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
        })
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No Team Agreements yet</CardTitle>
            <CardDescription>
              Create agreements manually or rerun AI extraction to capture team norms automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Team Agreements capture working agreements, communication protocols, and decision-making rules for the project team.
            </p>
            <p>
              Use the <span className="font-medium text-foreground">Add Agreement</span> button above to create one, or re-run AI extraction after updating your project documents.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <TeamAgreementDialog
        open={dialogOpen}
        onOpenChange={(open: boolean) => {
          setDialogOpen(open)
          if (!open) {
            setEditingAgreement(null)
          }
        }}
        projectId={projectId}
        agreement={editingAgreement}
        teamMembers={teamMembers}
        teamMembersLoading={teamMembersLoading}
        onSuccess={() => {
          void fetchTeamAgreements()
        }}
      />

      {/* Adherence Dialog */}
      {selectedAgreementForAdherence && (
        <AdherenceDialog
          open={adherenceDialogOpen}
          onOpenChange={(open: boolean) => {
            setAdherenceDialogOpen(open)
            if (!open) {
              setSelectedAgreementForAdherence(null)
            }
          }}
          agreementId={selectedAgreementForAdherence.id}
          agreementTitle={selectedAgreementForAdherence.title}
          currentScore={selectedAgreementForAdherence.adherence_score}
          onSuccess={() => {
            void fetchTeamAgreements()
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Agreement?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team agreement
              and all associated adherence logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletingAgreementId) return
                
                try {
                  setDeleting(true)
                  const response = await apiClient.delete(`/team-agreements/${deletingAgreementId}`)
                  
                  if (response.success) {
                    toast.success('Team agreement deleted successfully')
                    setDeleteDialogOpen(false)
                    setDeletingAgreementId(null)
                    void fetchTeamAgreements()
                  } else {
                    throw new Error('Failed to delete agreement')
                  }
                } catch (error: unknown) {
                  console.error('Error deleting agreement:', error)
                  const message = error instanceof Error ? error.message : 'Failed to delete team agreement'
                  toast.error(message)
                } finally {
                  setDeleting(false)
                }
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

