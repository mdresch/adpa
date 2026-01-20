"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Edit, Save, X, Plus, Trash2, Info } from "lucide-react"
import { apiClient } from "@/lib/api"
import { toast } from '@/lib/notify'
import { DevelopmentApproachForm } from "./DevelopmentApproachForm"
import { TailoringDecisionsEditor } from "./TailoringDecisionsEditor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

interface DevelopmentApproachTabProps {
  projectId: string
}

export interface DevelopmentApproachData {
  id?: string
  project_id: string
  approach: 'predictive' | 'adaptive' | 'hybrid' | 'incremental' | 'iterative'
  methodology?: 'waterfall' | 'scrum' | 'kanban' | 'lean' | 'safe' | 'prince2' | 'custom' | null
  justification: string
  uncertainty_level?: 'low' | 'medium' | 'high' | null
  requirements_stability?: 'stable' | 'evolving' | 'uncertain' | null
  stakeholder_engagement_model?: string | null
  delivery_cadence?: 'single' | 'iterative' | 'incremental' | 'continuous' | null
  organizational_maturity?: 'low' | 'medium' | 'high' | null
  team_experience_level?: 'junior' | 'mixed' | 'senior' | null
  regulatory_constraints?: boolean | null
  tailoring_decisions?: TailoringDecision[]
  life_cycle_phases?: string[]
  iteration_length?: number | null
  iteration_unit?: 'days' | 'weeks' | null
  governance_approach?: 'lightweight' | 'standard' | 'formal' | null
  review_gates?: string[]
  source_document_id?: string | null
  approved_by?: string | null
  effective_date?: string | null
  defined_by_name?: string | null
  approved_by_name?: string | null
  created_at?: string
  updated_at?: string
}

export interface TailoringDecision {
  area: string
  standard_process: string
  tailored_process: string
  justification: string
}

const APPROACH_LABELS: Record<string, string> = {
  predictive: 'Predictive (Waterfall)',
  adaptive: 'Adaptive (Agile)',
  hybrid: 'Hybrid',
  incremental: 'Incremental',
  iterative: 'Iterative'
}

const METHODOLOGY_LABELS: Record<string, string> = {
  waterfall: 'Waterfall',
  scrum: 'Scrum',
  kanban: 'Kanban',
  lean: 'Lean',
  safe: 'SAFe (Scaled Agile)',
  prince2: 'PRINCE2',
  custom: 'Custom'
}

export function DevelopmentApproachTab({ projectId }: DevelopmentApproachTabProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [approach, setApproach] = useState<DevelopmentApproachData | null>(null)
  const [formData, setFormData] = useState<Partial<DevelopmentApproachData>>({})

  const fetchApproach = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiClient.request<{
        success: boolean
        data: DevelopmentApproachData
      }>(`/projects/${projectId}/development-approach`)

      if (response.success && response.data) {
        setApproach(response.data)
        setFormData(response.data)
      } else {
        // No approach exists yet
        setApproach(null)
        setFormData({
          project_id: projectId,
          approach: 'hybrid',
          justification: ''
        })
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No approach exists yet - this is expected for new projects
        setApproach(null)
        setFormData({
          project_id: projectId,
          approach: 'hybrid',
          justification: ''
        })
      } else {
        console.error('Failed to fetch development approach:', error)
        toast.error('Failed to load development approach')
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchApproach()
  }, [fetchApproach])

  const handleSave = async () => {
    if (!formData.justification || formData.justification.trim().length < 10) {
      toast.error('Justification is required and must be at least 10 characters')
      return
    }

    if (!formData.approach) {
      toast.error('Approach is required')
      return
    }

    try {
      setSaving(true)

      const response = await apiClient.request<{
        success: boolean
        data: DevelopmentApproachData
      }>(`/projects/${projectId}/development-approach`, {
        method: approach ? 'PUT' : 'POST',
        body: JSON.stringify(formData)
      })

      if (response.success && response.data) {
        setApproach(response.data)
        setFormData(response.data)
        setEditing(false)
        toast.success('Development approach saved successfully')
      } else {
        throw new Error('Failed to save development approach')
      }
    } catch (error: any) {
      console.error('Failed to save development approach:', error)
      toast.error(error.response?.data?.message || 'Failed to save development approach')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (approach) {
      setFormData(approach)
    } else {
      setFormData({
        project_id: projectId,
        approach: 'hybrid',
        justification: ''
      })
    }
    setEditing(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Development Approach</CardTitle>
              <CardDescription>
                Define the methodology and approach for this project (PMBOK 8 Development Approach & Life Cycle Domain)
              </CardDescription>
            </div>
            {!editing && (
              <Button onClick={() => setEditing(true)} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                {approach ? 'Edit' : 'Create'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <DevelopmentApproachForm
              formData={formData}
              onChange={setFormData}
              onSave={handleSave}
              onCancel={handleCancel}
              saving={saving}
            />
          ) : (
            <DevelopmentApproachSummary approach={approach} />
          )}
        </CardContent>
      </Card>

      {approach && (
        <Card>
          <CardHeader>
            <CardTitle>Tailoring Decisions</CardTitle>
            <CardDescription>
              Document how standard processes were adapted for this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TailoringDecisionsEditor
              projectId={projectId}
              decisions={approach.tailoring_decisions || []}
              onUpdate={async (decisions) => {
                const updatedFormData = { ...formData, tailoring_decisions: decisions }
                setFormData(updatedFormData)
                // Auto-save tailoring decisions
                try {
                  await apiClient.request(`/projects/${projectId}/development-approach`, {
                    method: 'PUT',
                    body: JSON.stringify({ tailoring_decisions: decisions })
                  })
                  setApproach({ ...approach, tailoring_decisions: decisions })
                  toast.success('Tailoring decisions updated')
                } catch (error) {
                  console.error('Failed to update tailoring decisions:', error)
                  toast.error('Failed to update tailoring decisions')
                }
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface DevelopmentApproachSummaryProps {
  approach: DevelopmentApproachData | null
}

function DevelopmentApproachSummary({ approach }: DevelopmentApproachSummaryProps) {
  if (!approach) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No development approach has been defined for this project yet. Click "Create" to define the methodology and approach.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Approach</Label>
          <div className="mt-1">
            <Badge variant="outline" className="text-base">
              {APPROACH_LABELS[approach.approach] || approach.approach}
            </Badge>
          </div>
        </div>

        {approach.methodology && (
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Methodology</Label>
            <div className="mt-1">
              <Badge variant="secondary">
                {METHODOLOGY_LABELS[approach.methodology] || approach.methodology}
              </Badge>
            </div>
          </div>
        )}
      </div>

      <div>
        <Label className="text-sm font-medium text-muted-foreground">Justification</Label>
        <div className="mt-1 p-3 bg-muted rounded-md">
          <p className="text-sm whitespace-pre-wrap">{approach.justification}</p>
        </div>
      </div>

      {(approach.uncertainty_level || approach.requirements_stability || approach.delivery_cadence) && (
        <div className="grid grid-cols-3 gap-4">
          {approach.uncertainty_level && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Uncertainty Level</Label>
              <div className="mt-1">
                <Badge variant="outline">{approach.uncertainty_level}</Badge>
              </div>
            </div>
          )}
          {approach.requirements_stability && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Requirements Stability</Label>
              <div className="mt-1">
                <Badge variant="outline">{approach.requirements_stability}</Badge>
              </div>
            </div>
          )}
          {approach.delivery_cadence && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Delivery Cadence</Label>
              <div className="mt-1">
                <Badge variant="outline">{approach.delivery_cadence}</Badge>
              </div>
            </div>
          )}
        </div>
      )}

      {approach.regulatory_constraints && (
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Regulatory Constraints</Label>
          <div className="mt-1">
            <Badge variant="outline">Yes</Badge>
          </div>
        </div>
      )}

      {approach.life_cycle_phases && approach.life_cycle_phases.length > 0 && (
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Life Cycle Phases</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {approach.life_cycle_phases.map((phase, idx) => (
              <Badge key={idx} variant="outline">{phase}</Badge>
            ))}
          </div>
        </div>
      )}

      {approach.iteration_length && (
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Iteration Length</Label>
          <div className="mt-1">
            <Badge variant="outline">
              {approach.iteration_length} {approach.iteration_unit || 'weeks'}
            </Badge>
          </div>
        </div>
      )}

      {approach.governance_approach && (
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Governance Approach</Label>
          <div className="mt-1">
            <Badge variant="outline">{approach.governance_approach}</Badge>
          </div>
        </div>
      )}

      {approach.tailoring_decisions && approach.tailoring_decisions.length > 0 && (
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Tailoring Decisions</Label>
          <div className="mt-1 text-sm text-muted-foreground">
            {approach.tailoring_decisions.length} decision{approach.tailoring_decisions.length !== 1 ? 's' : ''} documented
          </div>
        </div>
      )}
    </div>
  )
}

