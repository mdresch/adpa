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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getApiUrl } from "@/lib/api-url"
import { toast } from "sonner"
import {
  Users,
  Award,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
} from "lucide-react"

interface Role {
  id: string
  roleName: string
  roleCode?: string
}

interface TaskRole {
  id: string
  roleId: string
  roleName: string
  roleType: string
  isPrimary: boolean
  requiredCount: number
  assignedCount: number
}

interface SuggestedStakeholder {
  stakeholderId: string
  stakeholderName: string
  stakeholderEmail: string
  matchPercentage: number
  matchedSkills: number
  totalRequiredSkills: number
  missingSkills: string[]
}

interface SkillGap {
  skillName: string
  requiredProficiency: string
  assignedCount: number
  requiredCount: number
  gap: number
}

interface TaskRoleAssignmentProps {
  taskId: string
  projectId: string
  onUpdate?: () => void
}

export function TaskRoleAssignment({
  taskId,
  projectId,
  onUpdate,
}: TaskRoleAssignmentProps) {
  const [roles, setRoles] = useState<Role[]>([])
  const [taskRoles, setTaskRoles] = useState<TaskRole[]>([])
  const [suggestedStakeholders, setSuggestedStakeholders] = useState<SuggestedStakeholder[]>([])
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false)
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false)
  const [selectedRoleForSuggestions, setSelectedRoleForSuggestions] = useState<TaskRole | null>(null)
  const [formData, setFormData] = useState({
    roleId: "",
    roleType: "executor",
    isPrimary: false,
    requiredCount: 1,
  })

  useEffect(() => {
    fetchRoles()
    fetchTaskRoles()
    fetchSkillGaps()
  }, [taskId])

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

  const fetchTaskRoles = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl(`/api/tasks/${taskId}/roles`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTaskRoles(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch task roles:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSkillGaps = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl(`/api/tasks/${taskId}/skill-gaps`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSkillGaps(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch skill gaps:", error)
    }
  }

  const fetchSuggestedStakeholders = async (roleId: string) => {
    try {
      setLoadingSuggestions(true)
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/tasks/${taskId}/suggested-stakeholders?roleId=${roleId}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSuggestedStakeholders(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch suggested stakeholders:", error)
      toast.error("Failed to fetch suggestions")
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleAssignRole = async () => {
    if (!formData.roleId) {
      toast.error("Please select a role")
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl(`/api/tasks/${taskId}/roles`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roleId: formData.roleId,
          roleType: formData.roleType,
          isPrimary: formData.isPrimary,
          requiredCount: formData.requiredCount,
        }),
      })

      if (response.ok) {
        toast.success("Role assigned to task successfully")
        setAssignRoleDialogOpen(false)
        setFormData({
          roleId: "",
          roleType: "executor",
          isPrimary: false,
          requiredCount: 1,
        })
        fetchTaskRoles()
        fetchSkillGaps()
        onUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to assign role")
      }
    } catch (error) {
      console.error("Failed to assign role:", error)
      toast.error("Failed to assign role")
    }
  }

  const handleRemoveRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to remove this role from the task?")) {
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/tasks/${taskId}/roles/${roleId}`),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        toast.success("Role removed from task")
        fetchTaskRoles()
        fetchSkillGaps()
        onUpdate?.()
      } else {
        toast.error("Failed to remove role")
      }
    } catch (error) {
      console.error("Failed to remove role:", error)
      toast.error("Failed to remove role")
    }
  }

  const handleViewSuggestions = (taskRole: TaskRole) => {
    setSelectedRoleForSuggestions(taskRole)
    setSuggestionsDialogOpen(true)
    fetchSuggestedStakeholders(taskRole.roleId)
  }

  const getRoleTypeColor = (type: string) => {
    switch (type) {
      case "owner":
        return "default"
      case "executor":
        return "secondary"
      case "reviewer":
        return "outline"
      case "approver":
        return "destructive"
      case "consultant":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600"
    if (percentage >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const availableRoles = roles.filter(
    (role) => !taskRoles.some((tr) => tr.roleId === role.id)
  )

  return (
    <div className="space-y-6">
      {/* Task Roles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Assigned Roles</h3>
            <p className="text-sm text-muted-foreground">
              Roles required for this task completion
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setAssignRoleDialogOpen(true)}
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
        ) : taskRoles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No roles assigned to this task</p>
              <Button
                variant="outline"
                onClick={() => setAssignRoleDialogOpen(true)}
                disabled={availableRoles.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign First Role
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {taskRoles.map((taskRole) => (
              <Card key={taskRole.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{taskRole.roleName}</h4>
                        <Badge variant={getRoleTypeColor(taskRole.roleType)}>
                          {taskRole.roleType}
                        </Badge>
                        {taskRole.isPrimary && (
                          <Badge variant="default">Primary</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Required: {taskRole.assignedCount}/{taskRole.requiredCount}
                        </span>
                        {taskRole.assignedCount < taskRole.requiredCount && (
                          <Badge variant="destructive" className="text-xs">
                            {taskRole.requiredCount - taskRole.assignedCount} needed
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewSuggestions(taskRole)}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Find Match
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRole(taskRole.roleId)}
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
      </div>

      {/* Skill Gaps */}
      {skillGaps.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Skill Gaps</h3>
            <p className="text-sm text-muted-foreground">
              Skills that need to be filled for this task
            </p>
          </div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Required Proficiency</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Gap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skillGaps.map((gap, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{gap.skillName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{gap.requiredProficiency}</Badge>
                      </TableCell>
                      <TableCell>{gap.assignedCount}</TableCell>
                      <TableCell>{gap.requiredCount}</TableCell>
                      <TableCell>
                        {gap.gap > 0 ? (
                          <Badge variant="destructive">{gap.gap} needed</Badge>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assign Role Dialog */}
      <Dialog open={assignRoleDialogOpen} onOpenChange={setAssignRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to Task</DialogTitle>
            <DialogDescription>
              Assign a role required for this task
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.roleName}
                      {role.roleCode && ` (${role.roleCode})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleType">Role Type</Label>
              <Select
                value={formData.roleType}
                onValueChange={(value) => setFormData({ ...formData, roleType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="executor">Executor</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="approver">Approver</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="requiredCount">Required Count</Label>
              <Input
                id="requiredCount"
                type="number"
                min="1"
                value={formData.requiredCount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    requiredCount: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={formData.isPrimary}
                onChange={(e) =>
                  setFormData({ ...formData, isPrimary: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Primary role (main responsibility)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignRole} disabled={!formData.roleId}>
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suggested Stakeholders Dialog */}
      <Dialog open={suggestionsDialogOpen} onOpenChange={setSuggestionsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggested Stakeholders</DialogTitle>
            <DialogDescription>
              Stakeholders with matching skills for {selectedRoleForSuggestions?.roleName}
            </DialogDescription>
          </DialogHeader>
          {loadingSuggestions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : suggestedStakeholders.length === 0 ? (
            <div className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                No stakeholders found with matching skills
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {suggestedStakeholders.map((stakeholder) => (
                <Card key={stakeholder.stakeholderId}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{stakeholder.stakeholderName}</h4>
                          <Badge
                            className={getMatchColor(stakeholder.matchPercentage)}
                            variant="outline"
                          >
                            {stakeholder.matchPercentage}% match
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {stakeholder.stakeholderEmail}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Skill Match</span>
                            <span>
                              {stakeholder.matchedSkills}/{stakeholder.totalRequiredSkills} skills
                            </span>
                          </div>
                          <Progress
                            value={stakeholder.matchPercentage}
                            className="h-2"
                          />
                          {stakeholder.missingSkills.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-1">
                                Missing skills:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {stakeholder.missingSkills.map((skill, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast.info("Stakeholder assignment feature coming soon")
                        }}
                      >
                        Assign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuggestionsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

