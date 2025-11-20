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
import { Progress } from "@/components/ui/progress"
import { getApiUrl } from "@/lib/api-url"
import { toast } from "sonner"
import {
  Users,
  Award,
  Target,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react"

interface Role {
  id: string
  roleName: string
  roleCode?: string
}

interface StakeholderRole {
  id: string
  roleId: string
  roleName: string
  assignmentType: string
  allocationPercentage: number
  startDate?: string
  endDate?: string
  status: string
}

interface RoleSkill {
  id: string
  skillId: string
  skillName: string
  requiredProficiency: string
  isRequired: boolean
}

interface SkillMatch {
  matchPercentage: number
  matchedSkills: number
  totalRequiredSkills: number
  missingSkills: Array<{
    skillName: string
    requiredProficiency: string
  }>
}

interface StakeholderRoleAssignmentProps {
  stakeholderId: string
  projectId: string
  onUpdate?: () => void
}

export function StakeholderRoleAssignment({
  stakeholderId,
  projectId,
  onUpdate,
}: StakeholderRoleAssignmentProps) {
  const [roles, setRoles] = useState<Role[]>([])
  const [stakeholderRoles, setStakeholderRoles] = useState<StakeholderRole[]>([])
  const [roleSkillsMap, setRoleSkillsMap] = useState<Record<string, RoleSkill[]>>({})
  const [loading, setLoading] = useState(true)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [skillMatchDialogOpen, setSkillMatchDialogOpen] = useState(false)
  const [selectedRoleForMatch, setSelectedRoleForMatch] = useState<Role | null>(null)
  const [skillMatch, setSkillMatch] = useState<SkillMatch | null>(null)
  const [loadingMatch, setLoadingMatch] = useState(false)
  const [formData, setFormData] = useState({
    roleId: "",
    assignmentType: "primary",
    allocationPercentage: 100,
    startDate: "",
    endDate: "",
    notes: "",
  })

  useEffect(() => {
    fetchRoles()
    fetchStakeholderRoles()
  }, [stakeholderId, projectId])

  useEffect(() => {
    // Fetch skills for all assigned roles
    stakeholderRoles.forEach((stakeholderRole) => {
      fetchRoleSkills(stakeholderRole.roleId)
    })
  }, [stakeholderRoles])

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl("/api/cost-management/roles"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRoles(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error)
    }
  }

  const fetchStakeholderRoles = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/stakeholders/${stakeholderId}/roles?projectId=${projectId}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setStakeholderRoles(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch stakeholder roles:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoleSkills = async (roleId: string) => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/skills/role/${roleId}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setRoleSkillsMap((prev) => ({
          ...prev,
          [roleId]: data.data || [],
        }))
      }
    } catch (error) {
      console.error("Failed to fetch role skills:", error)
    }
  }

  const handleAssignRole = async () => {
    if (!formData.roleId) {
      toast.error("Please select a role")
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const url = editingRoleId
        ? getApiUrl(`/api/stakeholders/${stakeholderId}/roles/${editingRoleId}`)
        : getApiUrl(`/api/stakeholders/${stakeholderId}/assign-role`)
      
      const response = await fetch(url, {
        method: editingRoleId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roleId: formData.roleId,
          projectId,
          assignmentType: formData.assignmentType,
          allocationPercentage: formData.allocationPercentage,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          notes: formData.notes || undefined,
        }),
      })

      if (response.ok) {
        toast.success(editingRoleId ? "Role updated successfully" : "Role assigned successfully")
        setAssignDialogOpen(false)
        setEditDialogOpen(false)
        setEditingRoleId(null)
        setFormData({
          roleId: "",
          assignmentType: "primary",
          allocationPercentage: 100,
          startDate: "",
          endDate: "",
          notes: "",
        })
        fetchStakeholderRoles()
        onUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.error || (editingRoleId ? "Failed to update role" : "Failed to assign role"))
      }
    } catch (error) {
      console.error("Failed to assign role:", error)
      toast.error(editingRoleId ? "Failed to update role" : "Failed to assign role")
    }
  }

  const handleEditRole = (stakeholderRole: StakeholderRole) => {
    setEditingRoleId(stakeholderRole.roleId)
    setFormData({
      roleId: stakeholderRole.roleId,
      assignmentType: stakeholderRole.assignmentType,
      allocationPercentage: stakeholderRole.allocationPercentage,
      startDate: stakeholderRole.startDate || "",
      endDate: stakeholderRole.endDate || "",
      notes: "",
    })
    setEditDialogOpen(true)
  }

  const handleRemoveRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to remove this role assignment?")) {
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/stakeholders/${stakeholderId}/roles/${roleId}?projectId=${projectId}`),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        toast.success("Role removed successfully")
        fetchStakeholderRoles()
        onUpdate?.()
      } else {
        toast.error("Failed to remove role")
      }
    } catch (error) {
      console.error("Failed to remove role:", error)
      toast.error("Failed to remove role")
    }
  }

  const handleCheckSkillMatch = async (role: Role) => {
    setSelectedRoleForMatch(role)
    setSkillMatchDialogOpen(true)
    setLoadingMatch(true)

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/stakeholders/${stakeholderId}/match-role/${role.id}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSkillMatch(data.data)
      } else {
        toast.error("Failed to check skill match")
      }
    } catch (error) {
      console.error("Failed to check skill match:", error)
      toast.error("Failed to check skill match")
    } finally {
      setLoadingMatch(false)
    }
  }

  const availableRoles = roles.filter(
    (role) => !stakeholderRoles.some((sr) => sr.roleId === role.id)
  )

  const getAssignmentTypeColor = (type: string) => {
    switch (type) {
      case "primary":
        return "default"
      case "secondary":
        return "secondary"
      case "backup":
        return "outline"
      case "consultant":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Role Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Assign roles to this stakeholder. Each role has required skills. The stakeholder's personal skills are managed separately in the Skills tab.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAssignDialogOpen(true)}
          disabled={availableRoles.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Assign Role
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : stakeholderRoles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No roles assigned</p>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(true)}
              disabled={availableRoles.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign First Role
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stakeholderRoles.map((stakeholderRole) => {
            const role = roles.find((r) => r.id === stakeholderRole.roleId)
            return (
              <Card key={stakeholderRole.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{stakeholderRole.roleName}</h4>
                        <Badge variant={getAssignmentTypeColor(stakeholderRole.assignmentType)}>
                          {stakeholderRole.assignmentType}
                        </Badge>
                        {stakeholderRole.status === "active" && (
                          <Badge variant="default" className="bg-green-500">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>Allocation: {stakeholderRole.allocationPercentage}%</span>
                        {stakeholderRole.startDate && (
                          <span>Start: {new Date(stakeholderRole.startDate).toLocaleDateString()}</span>
                        )}
                        {stakeholderRole.endDate && (
                          <span>End: {new Date(stakeholderRole.endDate).toLocaleDateString()}</span>
                        )}
                      </div>
                      {/* Show required skills for this role */}
                      {roleSkillsMap[stakeholderRole.roleId] && roleSkillsMap[stakeholderRole.roleId].length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Required Skills for Role:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {roleSkillsMap[stakeholderRole.roleId].map((roleSkill) => (
                              <Badge
                                key={roleSkill.id}
                                variant={roleSkill.isRequired ? "default" : "outline"}
                                className="text-xs"
                              >
                                {roleSkill.skillName}
                                {roleSkill.requiredProficiency && (
                                  <span className="ml-1 opacity-75">
                                    ({roleSkill.requiredProficiency})
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            These are the skills required by the role. The stakeholder's personal skills may differ.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {role && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckSkillMatch(role)}
                        >
                          <Target className="h-4 w-4 mr-2" />
                          Check Match
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRole(stakeholderRole)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRole(stakeholderRole.roleId)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Assign Role Dialog */}
      <Dialog open={assignDialogOpen || editDialogOpen} onOpenChange={(open: boolean) => {
        if (!open) {
          setAssignDialogOpen(false)
          setEditDialogOpen(false)
          setEditingRoleId(null)
          setFormData({
            roleId: "",
            assignmentType: "primary",
            allocationPercentage: 100,
            startDate: "",
            endDate: "",
            notes: "",
          })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoleId ? "Edit Role Assignment" : "Assign Role to Stakeholder"}</DialogTitle>
            <DialogDescription>
              {editingRoleId ? "Update the role assignment details" : "Assign a project role to this stakeholder"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value: string) => setFormData({ ...formData, roleId: value })}
                disabled={!!editingRoleId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {(editingRoleId ? roles : availableRoles).map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.roleName}
                      {role.roleCode && ` (${role.roleCode})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignmentType">Assignment Type</Label>
              <Select
                value={formData.assignmentType}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, assignmentType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="backup">Backup</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allocation">Allocation Percentage</Label>
              <Input
                id="allocation"
                type="number"
                min="0"
                max="100"
                value={formData.allocationPercentage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({
                    ...formData,
                    allocationPercentage: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this assignment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignRole} disabled={!formData.roleId}>
              {editingRoleId ? "Update Role" : "Assign Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skill Match Dialog */}
      <Dialog open={skillMatchDialogOpen} onOpenChange={setSkillMatchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Skill Match Analysis</DialogTitle>
            <DialogDescription>
              Comparing stakeholder skills with {selectedRoleForMatch?.roleName} requirements
            </DialogDescription>
          </DialogHeader>
          {loadingMatch ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : skillMatch ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Overall Match</Label>
                  <span className="text-2xl font-bold">{skillMatch.matchPercentage}%</span>
                </div>
                <Progress value={skillMatch.matchPercentage} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {skillMatch.matchedSkills} of {skillMatch.totalRequiredSkills} required skills
                  matched
                </p>
              </div>

              {skillMatch.matchPercentage === 100 ? (
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Perfect match! Stakeholder has all required skills.
                  </p>
                </div>
              ) : skillMatch.matchPercentage >= 70 ? (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Good match, but some skills may need development.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Low match. Consider training or alternative assignment.
                  </p>
                </div>
              )}

              {skillMatch.missingSkills.length > 0 && (
                <div className="space-y-2">
                  <Label>Missing Skills</Label>
                  <div className="space-y-2">
                    {skillMatch.missingSkills.map((skill, index) => (
                      <Card key={index}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{skill.skillName}</span>
                            <Badge variant="outline">Required: {skill.requiredProficiency}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground py-4">No match data available</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillMatchDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

