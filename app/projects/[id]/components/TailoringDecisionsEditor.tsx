"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Edit, Save, X } from "lucide-react"
import type { TailoringDecision } from "./DevelopmentApproachTab"

interface TailoringDecisionsEditorProps {
  projectId: string
  decisions: TailoringDecision[]
  onUpdate: (decisions: TailoringDecision[]) => void
}

export function TailoringDecisionsEditor({
  projectId,
  decisions: initialDecisions,
  onUpdate
}: TailoringDecisionsEditorProps) {
  const [decisions, setDecisions] = useState<TailoringDecision[]>(initialDecisions || [])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [newDecision, setNewDecision] = useState<Partial<TailoringDecision>>({
    area: '',
    standard_process: '',
    tailored_process: '',
    justification: ''
  })
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = () => {
    if (!newDecision.area || !newDecision.standard_process || !newDecision.tailored_process || !newDecision.justification) {
      return
    }

    const updated = [...decisions, newDecision as TailoringDecision]
    setDecisions(updated)
    onUpdate(updated)
    setNewDecision({
      area: '',
      standard_process: '',
      tailored_process: '',
      justification: ''
    })
    setIsAdding(false)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
  }

  const handleSaveEdit = (index: number, updated: TailoringDecision) => {
    const newDecisions = [...decisions]
    newDecisions[index] = updated
    setDecisions(newDecisions)
    onUpdate(newDecisions)
    setEditingIndex(null)
  }

  const handleDelete = (index: number) => {
    const updated = decisions.filter((_, i) => i !== index)
    setDecisions(updated)
    onUpdate(updated)
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setNewDecision({
      area: '',
      standard_process: '',
      tailored_process: '',
      justification: ''
    })
  }

  return (
    <div className="space-y-4">
      {decisions.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tailoring decisions documented yet.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="mt-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tailoring Decision
          </Button>
        </div>
      )}

      {decisions.map((decision, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{decision.area}</CardTitle>
              <div className="flex gap-2">
                {editingIndex === index ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(index)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editingIndex === index ? (
              <TailoringDecisionForm
                decision={decision}
                onSave={(updated) => handleSaveEdit(index, updated)}
                onCancel={handleCancelEdit}
              />
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Standard Process</Label>
                  <p className="text-sm mt-1">{decision.standard_process}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tailored Process</Label>
                  <p className="text-sm mt-1">{decision.tailored_process}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Justification</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{decision.justification}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Tailoring Decision</CardTitle>
          </CardHeader>
          <CardContent>
            <TailoringDecisionForm
              decision={newDecision}
              onChange={setNewDecision}
              onSave={handleAdd}
              onCancel={handleCancelAdd}
            />
          </CardContent>
        </Card>
      )}

      {!isAdding && decisions.length > 0 && (
        <Button
          variant="outline"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Tailoring Decision
        </Button>
      )}
    </div>
  )
}

interface TailoringDecisionFormProps {
  decision: Partial<TailoringDecision>
  onChange?: (decision: Partial<TailoringDecision>) => void
  onSave: (decision: TailoringDecision) => void
  onCancel: () => void
}

function TailoringDecisionForm({
  decision,
  onChange,
  onSave,
  onCancel
}: TailoringDecisionFormProps) {
  const [formData, setFormData] = useState<Partial<TailoringDecision>>(decision)

  const updateField = <K extends keyof TailoringDecision>(
    field: K,
    value: TailoringDecision[K]
  ) => {
    const updated = { ...formData, [field]: value }
    setFormData(updated)
    if (onChange) {
      onChange(updated)
    }
  }

  const handleSave = () => {
    if (!formData.area || !formData.standard_process || !formData.tailored_process || !formData.justification) {
      return
    }
    onSave(formData as TailoringDecision)
  }

  const isValid = formData.area && formData.standard_process && formData.tailored_process && formData.justification

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="area">
          Area <span className="text-destructive">*</span>
        </Label>
        <input
          id="area"
          type="text"
          value={formData.area || ''}
          onChange={(e) => updateField('area', e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="e.g., Change Control Process"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="standard_process">
          Standard Process <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="standard_process"
          value={formData.standard_process || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('standard_process', e.target.value)}
          placeholder="Describe the standard organizational process..."
          className="min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tailored_process">
          Tailored Process <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="tailored_process"
          value={formData.tailored_process || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('tailored_process', e.target.value)}
          placeholder="Describe how the process was adapted for this project..."
          className="min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="justification">
          Justification <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="justification"
          value={formData.justification || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('justification', e.target.value)}
          placeholder="Explain why this tailoring was necessary..."
          className="min-h-[100px]"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} size="sm">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} size="sm" disabled={!isValid}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  )
}

