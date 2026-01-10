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
import { Plus, Edit, Trash2, Search, Target, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface Competency {
  id: string
  competencyName: string
  description?: string
  category?: string
  createdAt?: string
  updatedAt?: string
}

export default function CompetenciesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null)
  const [formData, setFormData] = useState({
    competencyName: "",
    description: "",
    category: "",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchCompetencies()
    }
  }, [user])

  const fetchCompetencies = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl("/competencies"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Map API response (name) to frontend format (competencyName)
        const mappedCompetencies = (data.data || []).map((comp: any) => ({
          ...comp,
          competencyName: comp.name || comp.competencyName || "",
        }))
        setCompetencies(mappedCompetencies)
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("Failed to fetch competencies:", response.status, errorData)
        toast.error(`Failed to fetch competencies: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error("Failed to fetch competencies:", error)
      toast.error("Failed to fetch competencies")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (competency?: Competency) => {
    if (competency) {
      setEditingCompetency(competency)
      setFormData({
        competencyName: competency.competencyName,
        description: competency.description || "",
        category: competency.category || "management",
      })
    } else {
      setEditingCompetency(null)
      setFormData({
        competencyName: "",
        description: "",
        category: "",
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingCompetency(null)
    setFormData({
      competencyName: "",
      description: "",
      category: "management",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.competencyName.trim()) {
      toast.error("Competency name is required")
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem("auth_token")
      const url = editingCompetency
        ? getApiUrl(`/competencies/${editingCompetency.id}`)
        : getApiUrl("/competencies")
      
      const response = await fetch(url, {
        method: editingCompetency ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.competencyName, // API expects 'name', not 'competencyName'
          description: formData.description || undefined,
          category: formData.category || undefined,
        }),
      })

      if (response.ok) {
        toast.success(
          editingCompetency ? "Competency updated successfully" : "Competency created successfully"
        )
        handleCloseDialog()
        fetchCompetencies()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save competency")
      }
    } catch (error) {
      console.error("Failed to save competency:", error)
      toast.error("Failed to save competency")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (competencyId: string) => {
    if (!confirm("Are you sure you want to delete this competency?")) {
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl(`/competencies/${competencyId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success("Competency deleted successfully")
        fetchCompetencies()
      } else {
        toast.error("Failed to delete competency")
      }
    } catch (error) {
      console.error("Failed to delete competency:", error)
      toast.error("Failed to delete competency")
    }
  }

  const filteredCompetencies = competencies.filter((competency) => {
    const matchesSearch =
      (competency.competencyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (competency.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || competency.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(
    new Set(competencies.map((c) => c.category).filter(Boolean))
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
                <h1 className="text-3xl font-bold tracking-tight">Competencies Management</h1>
                <p className="text-muted-foreground mt-2">
                  Manage competencies catalog for roles and stakeholders
                </p>
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Competency
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
                        placeholder="Search competencies..."
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

            {/* Competencies Table */}
            <Card>
              <CardHeader>
                <CardTitle>Competencies Catalog</CardTitle>
                <CardDescription>
                  {filteredCompetencies.length} competenc{filteredCompetencies.length !== 1 ? "ies" : "y"} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredCompetencies.length === 0 ? (
                  <div className="py-12 text-center">
                    <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No competencies found</p>
                    <Button onClick={() => handleOpenDialog()} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Competency
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
                      {filteredCompetencies.map((competency) => (
                        <TableRow key={competency.id}>
                          <TableCell className="font-medium">
                            {competency.competencyName}
                          </TableCell>
                          <TableCell>
                            {competency.category && (
                              <Badge variant="secondary">{competency.category}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {competency.description || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(competency)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(competency.id)}
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
                      {editingCompetency ? "Edit Competency" : "Create New Competency"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCompetency
                        ? "Update competency information"
                        : "Add a new competency to the catalog"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="competencyName">Competency Name *</Label>
                      <Input
                        id="competencyName"
                        value={formData.competencyName}
                        onChange={(e) =>
                          setFormData({ ...formData, competencyName: e.target.value })
                        }
                        placeholder="e.g., Project Management, Leadership"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <div className="space-y-2">
                        <Input
                          id="category"
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({ ...formData, category: e.target.value })
                          }
                          placeholder="e.g., PMBOK Performance Domain, Management, Technical"
                          list="category-suggestions"
                        />
                        <datalist id="category-suggestions">
                          {categories.length > 0 ? (
                            categories.map((cat) => (
                              <option key={cat} value={cat} />
                            ))
                          ) : (
                            <>
                              <option value="PMBOK Performance Domain" />
                              <option value="BABOK Underlying Competency" />
                              <option value="BABOK Knowledge Area" />
                              <option value="DMBOK Knowledge Area" />
                              <option value="General Professional Competency" />
                              <option value="Management" />
                              <option value="Leadership" />
                              <option value="Technical" />
                              <option value="Communication" />
                              <option value="Analytical" />
                            </>
                          )}
                        </datalist>
                        <p className="text-xs text-muted-foreground">
                          Type a category name or select from existing categories above
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Brief description of the competency"
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
                      {editingCompetency ? "Update" : "Create"}
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

