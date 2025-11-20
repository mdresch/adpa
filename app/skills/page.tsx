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
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/AuthContext"
import { getApiUrl } from "@/lib/api-url"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Search, Award, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface Skill {
  id: string
  name: string
  description?: string
  category?: string
  createdAt?: string
  updatedAt?: string
}

export default function SkillsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "technical",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchSkills()
    }
  }, [user])

  const fetchSkills = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl("/api/skills"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSkills(data.data || [])
      } else {
        toast.error("Failed to fetch skills")
      }
    } catch (error) {
      console.error("Failed to fetch skills:", error)
      toast.error("Failed to fetch skills")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (skill?: Skill) => {
    if (skill) {
      setEditingSkill(skill)
      setFormData({
        name: skill.name,
        description: skill.description || "",
        category: skill.category || "technical",
      })
    } else {
      setEditingSkill(null)
      setFormData({
        name: "",
        description: "",
        category: "technical",
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingSkill(null)
    setFormData({
      name: "",
      description: "",
      category: "technical",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("Skill name is required")
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem("auth_token")
      const url = editingSkill
        ? getApiUrl(`/api/skills/${editingSkill.id}`)
        : getApiUrl("/api/skills")
      
      const response = await fetch(url, {
        method: editingSkill ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skillName: formData.name,
          description: formData.description || undefined,
          category: formData.category || undefined,
        }),
      })

      if (response.ok) {
        toast.success(editingSkill ? "Skill updated successfully" : "Skill created successfully")
        handleCloseDialog()
        fetchSkills()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save skill")
      }
    } catch (error) {
      console.error("Failed to save skill:", error)
      toast.error("Failed to save skill")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (skillId: string) => {
    if (!confirm("Are you sure you want to delete this skill?")) {
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl(`/api/skills/${skillId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success("Skill deleted successfully")
        fetchSkills()
      } else {
        toast.error("Failed to delete skill")
      }
    } catch (error) {
      console.error("Failed to delete skill:", error)
      toast.error("Failed to delete skill")
    }
  }

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || skill.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(skills.map((s) => s.category).filter(Boolean)))

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
                <h1 className="text-3xl font-bold tracking-tight">Skills Management</h1>
                <p className="text-muted-foreground mt-2">
                  Manage skills catalog for roles and stakeholders
                </p>
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Skill
              </Button>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search skills..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Skills Table */}
            <Card>
              <CardHeader>
                <CardTitle>Skills Catalog</CardTitle>
                <CardDescription>
                  {filteredSkills.length} skill{filteredSkills.length !== 1 ? "s" : ""} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredSkills.length === 0 ? (
                  <div className="py-12 text-center">
                    <Award className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No skills found</p>
                    <Button onClick={() => handleOpenDialog()} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Skill
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSkills.map((skill) => (
                        <TableRow key={skill.id}>
                          <TableCell className="font-medium">{skill.name}</TableCell>
                          <TableCell>
                            {skill.category && (
                              <Badge variant="secondary">{skill.category}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {skill.description || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(skill)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(skill.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingSkill ? "Edit Skill" : "Create New Skill"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingSkill
                        ? "Update skill information"
                        : "Add a new skill to the catalog"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Skill Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="e.g., TypeScript, Project Management"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="soft">Soft Skills</SelectItem>
                          <SelectItem value="domain">Domain</SelectItem>
                          <SelectItem value="certification">Certification</SelectItem>
                          <SelectItem value="management">Management</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Brief description of the skill"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingSkill ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  )
}

