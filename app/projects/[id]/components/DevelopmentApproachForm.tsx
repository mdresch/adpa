"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2, Save, X } from "lucide-react"
import type { DevelopmentApproachData } from "./DevelopmentApproachTab"

interface DevelopmentApproachFormProps {
  formData: Partial<DevelopmentApproachData>
  onChange: (data: Partial<DevelopmentApproachData>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}

export function DevelopmentApproachForm({
  formData,
  onChange,
  onSave,
  onCancel,
  saving
}: DevelopmentApproachFormProps) {
  const updateField = <K extends keyof DevelopmentApproachData>(
    field: K,
    value: DevelopmentApproachData[K]
  ) => {
    onChange({ ...formData, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Approach */}
        <div className="space-y-2">
          <Label htmlFor="approach">
            Approach <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.approach || ''}
            onValueChange={(value: DevelopmentApproachData['approach']) => updateField('approach', value)}
          >
            <SelectTrigger id="approach">
              <SelectValue placeholder="Select approach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="predictive">Predictive (Waterfall)</SelectItem>
              <SelectItem value="adaptive">Adaptive (Agile)</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="incremental">Incremental</SelectItem>
              <SelectItem value="iterative">Iterative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Methodology */}
        <div className="space-y-2">
          <Label htmlFor="methodology">Methodology</Label>
          <Select
            value={formData.methodology || '__none__'}
            onValueChange={(value: string) => updateField('methodology', value === '__none__' ? null : value as DevelopmentApproachData['methodology'])}
          >
            <SelectTrigger id="methodology">
              <SelectValue placeholder="Select methodology (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              <SelectItem value="waterfall">Waterfall</SelectItem>
              <SelectItem value="scrum">Scrum</SelectItem>
              <SelectItem value="kanban">Kanban</SelectItem>
              <SelectItem value="lean">Lean</SelectItem>
              <SelectItem value="safe">SAFe (Scaled Agile)</SelectItem>
              <SelectItem value="prince2">PRINCE2</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Justification - Required */}
      <div className="space-y-2">
        <Label htmlFor="justification">
          Justification <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="justification"
          value={formData.justification || ''}
          onChange={(e) => updateField('justification', e.target.value)}
          placeholder="Explain why this approach was selected for this project..."
          className="min-h-[120px]"
          required
        />
        <p className="text-sm text-muted-foreground">
          Minimum 10 characters. Describe the rationale for selecting this development approach.
        </p>
      </div>

      {/* Context Factors */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Context Factors</h3>
        <div className="grid grid-cols-3 gap-4">
          {/* Uncertainty Level */}
          <div className="space-y-2">
            <Label htmlFor="uncertainty_level">Uncertainty Level</Label>
            <Select
              value={formData.uncertainty_level || '__none__'}
              onValueChange={(value: string) => updateField('uncertainty_level', value === '__none__' ? null : value as DevelopmentApproachData['uncertainty_level'])}
            >
              <SelectTrigger id="uncertainty_level">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requirements Stability */}
          <div className="space-y-2">
            <Label htmlFor="requirements_stability">Requirements Stability</Label>
            <Select
              value={formData.requirements_stability || '__none__'}
              onValueChange={(value: string) => updateField('requirements_stability', value === '__none__' ? null : value as DevelopmentApproachData['requirements_stability'])}
            >
              <SelectTrigger id="requirements_stability">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="evolving">Evolving</SelectItem>
                <SelectItem value="uncertain">Uncertain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Cadence */}
          <div className="space-y-2">
            <Label htmlFor="delivery_cadence">Delivery Cadence</Label>
            <Select
              value={formData.delivery_cadence || '__none__'}
              onValueChange={(value: string) => updateField('delivery_cadence', value === '__none__' ? null : value as DevelopmentApproachData['delivery_cadence'])}
            >
              <SelectTrigger id="delivery_cadence">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="iterative">Iterative</SelectItem>
                <SelectItem value="incremental">Incremental</SelectItem>
                <SelectItem value="continuous">Continuous</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Organizational Factors */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Organizational Factors</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Organizational Maturity */}
          <div className="space-y-2">
            <Label htmlFor="organizational_maturity">Organizational Maturity</Label>
            <Select
              value={formData.organizational_maturity || '__none__'}
              onValueChange={(value: string) => updateField('organizational_maturity', value === '__none__' ? null : value as DevelopmentApproachData['organizational_maturity'])}
            >
              <SelectTrigger id="organizational_maturity">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Team Experience Level */}
          <div className="space-y-2">
            <Label htmlFor="team_experience_level">Team Experience Level</Label>
            <Select
              value={formData.team_experience_level || '__none__'}
              onValueChange={(value: string) => updateField('team_experience_level', value === '__none__' ? null : value as DevelopmentApproachData['team_experience_level'])}
            >
              <SelectTrigger id="team_experience_level">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                <SelectItem value="junior">Junior</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Regulatory Constraints */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="regulatory_constraints"
            checked={formData.regulatory_constraints || false}
            onCheckedChange={(checked) => updateField('regulatory_constraints', checked as boolean)}
          />
          <Label htmlFor="regulatory_constraints" className="font-normal cursor-pointer">
            Regulatory constraints apply (compliance requirements)
          </Label>
        </div>
      </div>

      {/* Life Cycle & Iterations */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Life Cycle & Iterations</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Iteration Length */}
          <div className="space-y-2">
            <Label htmlFor="iteration_length">Iteration Length</Label>
            <div className="flex gap-2">
              <Input
                id="iteration_length"
                type="number"
                min="1"
                value={formData.iteration_length || ''}
                onChange={(e) => updateField('iteration_length', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g., 2"
              />
              <Select
                value={formData.iteration_unit || 'weeks'}
                onValueChange={(value: string) => updateField('iteration_unit', value as DevelopmentApproachData['iteration_unit'])}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Governance Approach */}
          <div className="space-y-2">
            <Label htmlFor="governance_approach">Governance Approach</Label>
            <Select
              value={formData.governance_approach || '__none__'}
              onValueChange={(value: string) => updateField('governance_approach', value === '__none__' ? null : value as DevelopmentApproachData['governance_approach'])}
            >
              <SelectTrigger id="governance_approach">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                <SelectItem value="lightweight">Lightweight</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Life Cycle Phases */}
        <div className="space-y-2">
          <Label htmlFor="life_cycle_phases">Life Cycle Phases (comma-separated)</Label>
          <Input
            id="life_cycle_phases"
            value={formData.life_cycle_phases?.join(', ') || ''}
            onChange={(e) => {
              const phases = e.target.value
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0)
              updateField('life_cycle_phases', phases.length > 0 ? phases : undefined)
            }}
            placeholder="e.g., Initiation, Planning, Execution, Closure"
          />
        </div>

        {/* Review Gates */}
        <div className="space-y-2">
          <Label htmlFor="review_gates">Review Gates (comma-separated)</Label>
          <Input
            id="review_gates"
            value={formData.review_gates?.join(', ') || ''}
            onChange={(e) => {
              const gates = e.target.value
                .split(',')
                .map(g => g.trim())
                .filter(g => g.length > 0)
              updateField('review_gates', gates.length > 0 ? gates : undefined)
            }}
            placeholder="e.g., Phase Gate 1, Phase Gate 2, Go-Live Approval"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving || !formData.justification || formData.justification.trim().length < 10}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

