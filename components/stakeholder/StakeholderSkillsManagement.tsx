"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { getApiUrl } from "@/lib/api-url"
import { toast } from '@/lib/notify'
import { Award, Plus, Trash2, Edit, Loader2, CheckCircle2 } from "lucide-react"

interface Skill {
  id: string
  name: string
  description?: string
  category?: string
  proficiencyLevel?: string
  yearsOfExperience?: number
  verified?: boolean
}

interface StakeholderSkillsManagementProps {
  stakeholderId: string
  onUpdate?: () => void
}

export function StakeholderSkillsManagement({
  stakeholderId,
  onUpdate,
}: StakeholderSkillsManagementProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    skillId: "",
    proficiencyLevel: "intermediate",
    yearsOfExperience: 0,
    verified: false,
    notes: "",
  })

  useEffect(() => {
    fetchStakeholderSkills()
    fetchAvailableSkills()
  }, [stakeholderId])

  const fetchStakeholderSkills = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/stakeholders/${stakeholderId}/skills`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSkills(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch stakeholder skills:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableSkills = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl("/api/skills"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableSkills(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch available skills:", error)
    }
  }

  const handleAssignSkill = async () => {
    if (!formData.skillId) {
      toast.error("Please select a skill")
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const url = editingSkillId
        ? getApiUrl(`/api/stakeholders/${stakeholderId}/skills/${editingSkillId}`)
        : getApiUrl(`/api/stakeholders/${stakeholderId}/skills`)
      
      const response = await fetch(url, {
        method: editingSkillId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skillId: formData.skillId,
          proficiencyLevel: formData.proficiencyLevel,
          yearsOfExperience: formData.yearsOfExperience || undefined,
          verified: formData.verified,
          notes: formData.notes || undefined,
        }),
      })

      if (response.ok) {
        toast.success(editingSkillId ? "Skill updated successfully" : "Skill assigned successfully")
        setAssignDialogOpen(false)
        setEditDialogOpen(false)
        setEditingSkillId(null)
        setFormData({
          skillId: "",
          proficiencyLevel: "intermediate",
          yearsOfExperience: 0,
          verified: false,
          notes: "",
        })
        fetchStakeholderSkills()
        onUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.error || (editingSkillId ? "Failed to update skill" : "Failed to assign skill"))
      }
    } catch (error) {
      console.error("Failed to assign skill:", error)
      toast.error(editingSkillId ? "Failed to update skill" : "Failed to assign skill")
    }
  }

  const handleEditSkill = (skill: Skill) => {
    setEditingSkillId(skill.id)
    setFormData({
      skillId: skill.id,
      proficiencyLevel: skill.proficiencyLevel || "intermediate",
      yearsOfExperience: skill.yearsOfExperience || 0,
      verified: skill.verified || false,
      notes: "",
    })
    setEditDialogOpen(true)
  }

  const handleRemoveSkill = async (skillId: string) => {
    if (!confirm("Are you sure you want to remove this skill?")) {
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/stakeholders/${stakeholderId}/skills/${skillId}`),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        toast.success("Skill removed successfully")
        fetchStakeholderSkills()
        onUpdate?.()
      } else {
        toast.error("Failed to remove skill")
      }
    } catch (error) {
      console.error("Failed to remove skill:", error)
      toast.error("Failed to remove skill")
    }
  }

  const getProficiencyColor = (level?: string) => {
    switch (level) {
      case "expert":
        return "default"
      case "advanced":
        return "secondary"
      case "intermediate":
        return "outline"
      case "beginner":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const unassignedSkills = availableSkills.filter(
    (skill) => !skills.some((s) => s.id === skill.id)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Stakeholder Personal Skills</h3>
          <p className="text-sm text-muted-foreground">
            Manage the skills this stakeholder actually possesses. These are their personal skills, which may differ from the skills required by their assigned roles.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAssignDialogOpen(true)}
          disabled={unassignedSkills.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : skills.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No skills assigned</p>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(true)}
              disabled={unassignedSkills.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Skill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {skills.map((skill) => (
            <Card key={skill.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{skill.name}</h4>
                      {skill.verified && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" title="Verified" />
                      )}
                    </div>
                    {skill.description && (
                      <p className="text-sm text-muted-foreground mb-2">{skill.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {skill.proficiencyLevel && (
                        <Badge variant={getProficiencyColor(skill.proficiencyLevel)}>
                          {skill.proficiencyLevel}
                        </Badge>
                      )}
                      {skill.category && (
                        <Badge variant="outline">{skill.category}</Badge>
                      )}
                      {skill.yearsOfExperience !== undefined && skill.yearsOfExperience > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {skill.yearsOfExperience} year{skill.yearsOfExperience !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSkill(skill)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSkill(skill.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Skill Dialog */}
      <Dialog open={assignDialogOpen || editDialogOpen} onOpenChange={(open: boolean) => {
        if (!open) {
          setAssignDialogOpen(false)
          setEditDialogOpen(false)
          setEditingSkillId(null)
          setFormData({
            skillId: "",
            proficiencyLevel: "intermediate",
            yearsOfExperience: 0,
            verified: false,
            notes: "",
          })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSkillId ? "Edit Skill" : "Add Skill to Stakeholder"}</DialogTitle>
            <DialogDescription>
              {editingSkillId ? "Update the skill details and proficiency level" : "Assign a skill and specify proficiency level"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skill">Skill *</Label>
              <Select
                value={formData.skillId}
                onValueChange={(value: string) => setFormData({ ...formData, skillId: value })}
                disabled={!!editingSkillId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a skill" />
                </SelectTrigger>
                <SelectContent>
                  {(editingSkillId ? availableSkills : unassignedSkills).map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                      {skill.category && ` (${skill.category})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proficiency">Proficiency Level</Label>
              <Select
                value={formData.proficiencyLevel}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, proficiencyLevel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="years">Years of Experience</Label>
              <Input
                id="years"
                type="number"
                min="0"
                value={formData.yearsOfExperience}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    yearsOfExperience: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="verified"
                checked={formData.verified}
                onChange={(e) =>
                  setFormData({ ...formData, verified: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="verified" className="cursor-pointer">
                Verified (skill has been validated)
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this skill"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignSkill} disabled={!formData.skillId}>
              {editingSkillId ? "Update Skill" : "Add Skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

