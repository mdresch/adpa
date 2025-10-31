"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { apiClient, Program } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import {
  FolderOpen,
  Plus,
  Search,
  Loader2,
  Calendar,
  DollarSign,
} from "@/components/ui/icons-shim"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function ProgramsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    status: "green" as 'green' | 'amber' | 'red',
    start_date: "",
    end_date: "",
    budget: "",
    currency: "USD",
  })

  // Fetch programs
  const fetchPrograms = async () => {
    try {
      setLoading(true)
      const data = await apiClient.request<{ success: boolean; data: Program[] }>('/programs')
      console.log('[PROGRAMS] API Response:', data)
      // FIX: Backend returns { success: true, data: programs }, not { programs: [] }
      setPrograms(data.data || [])
    } catch (error) {
      console.error("Failed to fetch programs:", error)
      toast.error("Failed to load programs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (authLoading) {
      return
    }
    
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    
    fetchPrograms()
  }, [isAuthenticated, authLoading, router])

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleCreateProgram = async () => {
    try {
      setCreating(true)
      const newProgram = await apiClient.request<Program>('/programs', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          status: createForm.status,
          start_date: createForm.start_date || null,
          end_date: createForm.end_date || null,
          budget: createForm.budget ? parseFloat(createForm.budget) : null,
          currency: createForm.currency,
        })
      })
      toast.success('Program created successfully')
      setCreateDialogOpen(false)
      setCreateForm({
        name: "",
        description: "",
        status: "green",
        start_date: "",
        end_date: "",
        budget: "",
        currency: "USD",
      })
      // Redirect to the new program
      router.push(`/programs/${newProgram.id}`)
    } catch (error: any) {
      console.error('Failed to create program:', error)
      toast.error(error?.message || 'Failed to create program')
    } finally {
      setCreating(false)
    }
  }

  // Filter programs by search term
  const filteredPrograms = programs.filter(program =>
    program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    program.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // RAG status configuration
  const ragConfig = {
    green: { 
      emoji: '🟢', 
      label: 'GREEN', 
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 border-green-300'
    },
    amber: { 
      emoji: '🟡', 
      label: 'AMBER', 
      variant: 'secondary' as const,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    },
    red: { 
      emoji: '🔴', 
      label: 'RED', 
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 border-red-300'
    },
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-8">
          <div className="container mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Programs</h1>
                <p className="text-muted-foreground">
                  Manage and monitor your program portfolio
                </p>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Program
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Program</DialogTitle>
                    <DialogDescription>
                      Create a new program to group and manage related projects
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Program Name *</Label>
                      <Input
                        id="name"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="Enter program name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        placeholder="Enter program description"
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="status">Initial RAG Status</Label>
                        <select
                          id="status"
                          value={createForm.status}
                          onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as 'green' | 'amber' | 'red' })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="green">🟢 Green</option>
                          <option value="amber">🟡 Amber</option>
                          <option value="red">🔴 Red</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="budget">Budget</Label>
                        <Input
                          id="budget"
                          type="number"
                          value={createForm.budget}
                          onChange={(e) => setCreateForm({ ...createForm, budget: e.target.value })}
                          placeholder="Enter budget amount"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start_date">Start Date</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={createForm.start_date}
                          onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end_date">End Date</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={createForm.end_date}
                          onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateProgram} disabled={creating || !createForm.name}>
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Program'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Programs Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading programs...</span>
              </div>
            ) : filteredPrograms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrograms.map((program) => {
                  const statusInfo = ragConfig[program.status]
                  return (
                    <Link key={program.id} href={`/programs/${program.id}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl">{program.name}</CardTitle>
                              <CardDescription className="mt-2 line-clamp-2">
                                {program.description || "No description"}
                              </CardDescription>
                            </div>
                            <Badge className={`ml-2 ${statusInfo.className} border`}>
                              {statusInfo.emoji}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {/* Project Count */}
                            {typeof program.project_count !== 'undefined' && (
                              <div className="flex items-center gap-2 text-sm">
                                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Projects:</span>
                                <span className="font-semibold">
                                  {program.project_count}
                                </span>
                              </div>
                            )}
                            {program.budget && (
                              <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Budget:</span>
                                <span className="font-semibold">
                                  ${program.budget.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {program.start_date && program.end_date && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Timeline:</span>
                                <span className="font-semibold">
                                  {new Date(program.start_date).toLocaleDateString()} - {new Date(program.end_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Created {new Date(program.created_at).toLocaleDateString()}</span>
                                {program.owner_name && (
                                  <span>Owner: {program.owner_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            ) : searchTerm ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No programs found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search criteria
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No programs yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first program to get started
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Program
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
