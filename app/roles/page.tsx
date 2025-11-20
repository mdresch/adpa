"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/AuthContext"
import { getApiUrl } from "@/lib/api-url"
import { toast } from "sonner"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  Award,
  Target,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface Role {
  id: string
  roleName: string
  roleCode?: string
  roleType?: string
  defaultHourlyRate?: number
  currency?: string
}

interface Skill {
  id: string
  name: string
  description?: string
  category?: string
  requiredProficiency?: string
  isRequired?: boolean
}

interface Competency {
  id: string
  competencyName: string
  description?: string
  category?: string
  requiredLevel?: string
  isRequired?: boolean
}

export default function RolesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [roleSkills, setRoleSkills] = useState<Skill[]>([])
  const [roleCompetencies, setRoleCompetencies] = useState<Competency[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRoleDetails, setLoadingRoleDetails] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [assignSkillDialogOpen, setAssignSkillDialogOpen] = useState(false)
  const [assignCompetencyDialogOpen, setAssignCompetencyDialogOpen] = useState(false)
  const [assignFormData, setAssignFormData] = useState({
    skillId: "",
    competencyId: "",
    proficiencyLevel: "intermediate",
    isRequired: true,
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchRoles()
      fetchSkills()
      fetchCompetencies()
    }
  }, [user])

  useEffect(() => {
    if (selectedRole) {
      fetchRoleSkills()
      fetchRoleCompetencies()
    }
  }, [selectedRole])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl("/api/cost-management/roles"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRoles(data.data || [])
      } else {
        toast.error("Failed to fetch roles")
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error)
      toast.error("Failed to fetch roles")
    } finally {
      setLoading(false)
    }
  }

  const fetchSkills = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl("/api/skills"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSkills(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch skills:", error)
    }
  }

  const fetchCompetencies = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl("/api/competencies"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCompetencies(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch competencies:", error)
    }
  }

  const fetchRoleSkills = async () => {
    if (!selectedRole) return

    try {
      setLoadingRoleDetails(true)
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl(`/api/skills/role/${selectedRole.id}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRoleSkills(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch role skills:", error)
    } finally {
      setLoadingRoleDetails(false)
    }
  }

  const fetchRoleCompetencies = async () => {
    if (!selectedRole) return

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl(`/api/competencies/role/${selectedRole.id}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRoleCompetencies(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch role competencies:", error)
    }
  }

  const handleAssignSkill = async () => {
    if (!selectedRole || !assignFormData.skillId) {
      toast.error("Please select a skill")
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/skills/${assignFormData.skillId}/assign-to-role`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roleId: selectedRole.id,
            requiredProficiency: assignFormData.proficiencyLevel,
            isRequired: assignFormData.isRequired,
          }),
        }
      )

      if (response.ok) {
        toast.success("Skill assigned to role successfully")
        setAssignSkillDialogOpen(false)
        setAssignFormData({
          skillId: "",
          competencyId: "",
          proficiencyLevel: "intermediate",
          isRequired: true,
        })
        fetchRoleSkills()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to assign skill")
      }
    } catch (error) {
      console.error("Failed to assign skill:", error)
      toast.error("Failed to assign skill")
    }
  }

  const handleAssignCompetency = async () => {
    if (!selectedRole || !assignFormData.competencyId) {
      toast.error("Please select a competency")
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/competencies/${assignFormData.competencyId}/assign-to-role`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roleId: selectedRole.id,
            requiredLevel: assignFormData.proficiencyLevel,
            isRequired: assignFormData.isRequired,
          }),
        }
      )

      if (response.ok) {
        toast.success("Competency assigned to role successfully")
        setAssignCompetencyDialogOpen(false)
        setAssignFormData({
          skillId: "",
          competencyId: "",
          proficiencyLevel: "intermediate",
          isRequired: true,
        })
        fetchRoleCompetencies()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to assign competency")
      }
    } catch (error) {
      console.error("Failed to assign competency:", error)
      toast.error("Failed to assign competency")
    }
  }

  const handleRemoveSkill = async (skillId: string) => {
    if (!selectedRole) return

    if (!confirm("Are you sure you want to remove this skill from the role?")) {
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/skills/${skillId}/role/${selectedRole.id}`),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        toast.success("Skill removed from role")
        fetchRoleSkills()
      } else {
        toast.error("Failed to remove skill")
      }
    } catch (error) {
      console.error("Failed to remove skill:", error)
      toast.error("Failed to remove skill")
    }
  }

  const handleRemoveCompetency = async (competencyId: string) => {
    if (!selectedRole) return

    if (!confirm("Are you sure you want to remove this competency from the role?")) {
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(
        getApiUrl(`/api/competencies/${competencyId}/role/${selectedRole.id}`),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        toast.success("Competency removed from role")
        fetchRoleCompetencies()
      } else {
        toast.error("Failed to remove competency")
      }
    } catch (error) {
      console.error("Failed to remove competency:", error)
      toast.error("Failed to remove competency")
    }
  }

  const filteredRoles = roles.filter((role) =>
    role.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.roleCode?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const availableSkills = skills.filter(
    (skill) => !roleSkills.some((rs) => rs.id === skill.id)
  )
  const availableCompetencies = competencies.filter(
    (competency) => !roleCompetencies.some((rc) => rc.id === competency.id)
  )

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Roles & Skills Management</h1>
                <p className="text-muted-foreground mt-2">
                  Assign skills and competencies to project roles
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Roles List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Roles</CardTitle>
                  <CardDescription>Select a role to manage skills</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search roles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {loading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : filteredRoles.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No roles found</p>
                      ) : (
                        filteredRoles.map((role) => (
                          <Card
                            key={role.id}
                            className={`cursor-pointer transition-all ${
                              selectedRole?.id === role.id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => setSelectedRole(role)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold">{role.roleName}</h3>
                                  {role.roleCode && (
                                    <p className="text-sm text-muted-foreground">{role.roleCode}</p>
                                  )}
                                  {role.defaultHourlyRate && (
                                    <p className="text-sm font-medium mt-1">
                                      ${role.defaultHourlyRate}/{role.currency || "USD"}
                                    </p>
                                  )}
                                </div>
                                {selectedRole?.id === role.id && (
                                  <CheckCircle2 className="h-5 w-5 text-primary" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Role Details */}
              <Card className="lg:col-span-2">
                {selectedRole ? (
                  <>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{selectedRole.roleName}</CardTitle>
                          <CardDescription>
                            Manage skills and competencies for this role
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRole(null)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Selection
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="skills" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="skills">
                            <Award className="h-4 w-4 mr-2" />
                            Skills ({roleSkills.length})
                          </TabsTrigger>
                          <TabsTrigger value="competencies">
                            <Target className="h-4 w-4 mr-2" />
                            Competencies ({roleCompetencies.length})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="skills" className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Required Skills</h3>
                            <Button
                              size="sm"
                              onClick={() => setAssignSkillDialogOpen(true)}
                              disabled={availableSkills.length === 0}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Skill
                            </Button>
                          </div>
                          {loadingRoleDetails ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          ) : roleSkills.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                              <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>No skills assigned</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {roleSkills.map((skill) => (
                                <Card key={skill.id}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-medium">{skill.name}</h4>
                                          {skill.isRequired && (
                                            <Badge variant="default" className="text-xs">
                                              Required
                                            </Badge>
                                          )}
                                          {skill.requiredProficiency && (
                                            <Badge variant="secondary" className="text-xs">
                                              {skill.requiredProficiency}
                                            </Badge>
                                          )}
                                        </div>
                                        {skill.description && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {skill.description}
                                          </p>
                                        )}
                                        {skill.category && (
                                          <Badge variant="outline" className="mt-2 text-xs">
                                            {skill.category}
                                          </Badge>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveSkill(skill.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="competencies" className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Required Competencies</h3>
                            <Button
                              size="sm"
                              onClick={() => setAssignCompetencyDialogOpen(true)}
                              disabled={availableCompetencies.length === 0}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Competency
                            </Button>
                          </div>
                          {loadingRoleDetails ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          ) : roleCompetencies.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                              <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>No competencies assigned</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {roleCompetencies.map((competency) => (
                                <Card key={competency.id}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-medium">
                                            {competency.competencyName}
                                          </h4>
                                          {competency.isRequired && (
                                            <Badge variant="default" className="text-xs">
                                              Required
                                            </Badge>
                                          )}
                                          {competency.requiredLevel && (
                                            <Badge variant="secondary" className="text-xs">
                                              {competency.requiredLevel}
                                            </Badge>
                                          )}
                                        </div>
                                        {competency.description && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {competency.description}
                                          </p>
                                        )}
                                        {competency.category && (
                                          <Badge variant="outline" className="mt-2 text-xs">
                                            {competency.category}
                                          </Badge>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveCompetency(competency.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Select a role from the list to manage skills and competencies
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>

            {/* Assign Skill Dialog */}
            <Dialog open={assignSkillDialogOpen} onOpenChange={setAssignSkillDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Skill to Role</DialogTitle>
                  <DialogDescription>
                    Select a skill to assign to {selectedRole?.roleName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="skill">Skill *</Label>
                    <Select
                      value={assignFormData.skillId}
                      onValueChange={(value) =>
                        setAssignFormData({ ...assignFormData, skillId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a skill" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSkills.map((skill) => (
                          <SelectItem key={skill.id} value={skill.id}>
                            {skill.name}
                            {skill.category && ` (${skill.category})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proficiency">Required Proficiency</Label>
                    <Select
                      value={assignFormData.proficiencyLevel}
                      onValueChange={(value) =>
                        setAssignFormData({ ...assignFormData, proficiencyLevel: value })
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
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isRequired"
                      checked={assignFormData.isRequired}
                      onChange={(e) =>
                        setAssignFormData({ ...assignFormData, isRequired: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isRequired" className="cursor-pointer">
                      Required skill (mandatory for this role)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAssignSkillDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAssignSkill} disabled={!assignFormData.skillId}>
                    Assign Skill
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Assign Competency Dialog */}
            <Dialog
              open={assignCompetencyDialogOpen}
              onOpenChange={setAssignCompetencyDialogOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Competency to Role</DialogTitle>
                  <DialogDescription>
                    Select a competency to assign to {selectedRole?.roleName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="competency">Competency *</Label>
                    <Select
                      value={assignFormData.competencyId}
                      onValueChange={(value) =>
                        setAssignFormData({ ...assignFormData, competencyId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a competency" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCompetencies.map((competency) => (
                          <SelectItem key={competency.id} value={competency.id}>
                            {competency.competencyName}
                            {competency.category && ` (${competency.category})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="level">Required Level</Label>
                    <Select
                      value={assignFormData.proficiencyLevel}
                      onValueChange={(value) =>
                        setAssignFormData({ ...assignFormData, proficiencyLevel: value })
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
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isRequiredComp"
                      checked={assignFormData.isRequired}
                      onChange={(e) =>
                        setAssignFormData({ ...assignFormData, isRequired: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isRequiredComp" className="cursor-pointer">
                      Required competency (mandatory for this role)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAssignCompetencyDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignCompetency}
                    disabled={!assignFormData.competencyId}
                  >
                    Assign Competency
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  )
}

