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
import { toast } from '@/lib/notify'
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
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("updated")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false)

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
      // Use apiClient.getPrograms() which handles the response format correctly
      const response = await apiClient.getPrograms()
      console.log('[PROGRAMS] API Response:', response)
      setPrograms(response.programs || [])
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
      // Use apiClient.createProgram() which handles the response format correctly
      const newProgram = await apiClient.createProgram({
        name: createForm.name,
        description: createForm.description,
        status: createForm.status,
        start_date: createForm.start_date || null,
        end_date: createForm.end_date || null,
        budget: createForm.budget ? parseFloat(createForm.budget) : null,
        currency: createForm.currency,
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

  // Filter and sort programs
  const filteredPrograms = programs
    .filter(program => {
      // Search filter
      const matchesSearch = program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        program.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Status filter
      const matchesStatus = filterStatus === "all" || program.status === filterStatus
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "updated":
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "budget":
          return (b.budget || 0) - (a.budget || 0)
        default:
          return 0
      }
    })

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedPrograms.length === filteredPrograms.length) {
      setSelectedPrograms([])
    } else {
      setSelectedPrograms(filteredPrograms.map(p => p.id))
    }
  }

  const handleSelectProgram = (programId: string) => {
    if (selectedPrograms.includes(programId)) {
      setSelectedPrograms(selectedPrograms.filter(id => id !== programId))
    } else {
      setSelectedPrograms([...selectedPrograms, programId])
    }
  }

  const handleBulkStatusUpdate = async (newStatus: 'green' | 'amber' | 'red') => {
    try {
      // Update all selected programs using apiClient.updateProgram()
      for (const programId of selectedPrograms) {
        await apiClient.updateProgram(programId, { status: newStatus })
      }
      toast.success(`Updated ${selectedPrograms.length} program(s)`)
      setSelectedPrograms([])
      setBulkActionDialogOpen(false)
      fetchPrograms()
    } catch (error) {
      console.error('Failed to update programs:', error)
      toast.error('Failed to update programs')
    }
  }

  const handleBulkArchive = async () => {
    if (!confirm(`Are you sure you want to archive ${selectedPrograms.length} program(s)?`)) {
      return
    }
    
    try {
      for (const programId of selectedPrograms) {
        await apiClient.request(`/programs/${programId}/archive`, {
          method: 'POST'
        })
      }
      toast.success(`Archived ${selectedPrograms.length} program(s)`)
      setSelectedPrograms([])
      setBulkActionDialogOpen(false)
      fetchPrograms()
    } catch (error) {
      console.error('Failed to archive programs:', error)
      toast.error('Failed to archive programs')
    }
  }

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 dark:from-slate-900 dark:via-blue-900/20 dark:to-cyan-900/20 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8 space-y-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 bg-clip-text text-transparent">
                  Programs
                </h1>
                <p className="text-muted-foreground text-lg">
                  Manage and monitor your program portfolio
                  {selectedPrograms.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedPrograms.length} selected
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-3">
                {selectedPrograms.length > 0 && (
                  <Dialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-2 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all shadow-sm"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Bulk Actions ({selectedPrograms.length})
                        </span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-semibold">Bulk Actions</DialogTitle>
                        <DialogDescription className="text-base">
                          Apply actions to {selectedPrograms.length} selected program{selectedPrograms.length > 1 ? 's' : ''}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Update Status</Label>
                          <div className="grid grid-cols-3 gap-3">
                            <Button 
                              onClick={() => handleBulkStatusUpdate('green')} 
                              variant="outline" 
                              className="h-auto py-4 flex-col gap-2 hover:bg-green-50 dark:hover:bg-green-950 border-2"
                            >
                              <span className="text-2xl">🟢</span>
                              <span className="text-xs font-medium">Green</span>
                            </Button>
                            <Button 
                              onClick={() => handleBulkStatusUpdate('amber')} 
                              variant="outline" 
                              className="h-auto py-4 flex-col gap-2 hover:bg-yellow-50 dark:hover:bg-yellow-950 border-2"
                            >
                              <span className="text-2xl">🟡</span>
                              <span className="text-xs font-medium">Amber</span>
                            </Button>
                            <Button 
                              onClick={() => handleBulkStatusUpdate('red')} 
                              variant="outline" 
                              className="h-auto py-4 flex-col gap-2 hover:bg-red-50 dark:hover:bg-red-950 border-2"
                            >
                              <span className="text-2xl">🔴</span>
                              <span className="text-xs font-medium">Red</span>
                            </Button>
                          </div>
                        </div>
                        <div className="pt-4 border-t">
                          <Button 
                            onClick={handleBulkArchive} 
                            variant="destructive" 
                            className="w-full h-12 text-base font-medium shadow-sm"
                          >
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            Archive Selected Programs
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setBulkActionDialogOpen(false)} className="border-2">
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                      <Plus className="h-5 w-5 mr-2" />
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
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCreateForm({ ...createForm, description: e.target.value })}
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
            </div>

            {/* Search and Filters */}
            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search programs by name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 text-base border-2 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="flex gap-3">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex h-12 w-full lg:w-[200px] rounded-md border-2 border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer hover:bg-accent transition-colors"
                    >
                      <option value="all">All Status</option>
                      <option value="green">🟢 Green</option>
                      <option value="amber">🟡 Amber</option>
                      <option value="red">🔴 Red</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="flex h-12 w-full lg:w-[200px] rounded-md border-2 border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer hover:bg-accent transition-colors"
                    >
                      <option value="updated">Recently Updated</option>
                      <option value="created">Recently Created</option>
                      <option value="name">Name (A-Z)</option>
                      <option value="budget">Budget (High-Low)</option>
                    </select>
                  </div>
                </div>
                
                {/* Results count */}
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Showing <strong className="text-foreground">{filteredPrograms.length}</strong> of{' '}
                    <strong className="text-foreground">{programs.length}</strong> program{programs.length !== 1 ? 's' : ''}
                  </span>
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      className="h-8 text-xs"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Programs Grid */}
            {loading ? (
              <div className="flex flex-col justify-center items-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                <span className="text-lg text-muted-foreground">Loading programs...</span>
              </div>
            ) : filteredPrograms.length > 0 ? (
              <div className="space-y-6">
                {/* Select All Checkbox */}
                <Card className="border-0 shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="select-all"
                        checked={selectedPrograms.length === filteredPrograms.length && filteredPrograms.length > 0}
                        onChange={handleSelectAll}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                      <Label htmlFor="select-all" className="font-medium text-base cursor-pointer">
                        Select all programs ({filteredPrograms.length})
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Programs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPrograms.map((program) => {
                    const statusInfo = ragConfig[program.status]
                    const isSelected = selectedPrograms.includes(program.id)
                    return (
                      <div key={program.id} className="group relative">
                        {/* Selection Checkbox */}
                        <div className="absolute top-4 left-4 z-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => { handleSelectProgram(program.id); }}
                            className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); }}
                          />
                        </div>
                        
                        <Link href={`/programs/${program.id}`}>
                          <Card className={`
                            h-full transition-all duration-300 border-0 shadow-md hover:shadow-2xl
                            bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm
                            hover:-translate-y-1 cursor-pointer
                            ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''}
                          `}>
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 pl-8">
                              <CardTitle className="text-xl font-bold mb-2 truncate group-hover:text-blue-600 transition-colors">
                                {program.name}
                              </CardTitle>
                              <CardDescription className="mt-2 line-clamp-2 text-sm leading-relaxed">
                                {program.description || "No description provided"}
                              </CardDescription>
                            </div>
                            <div className="flex-shrink-0">
                              <Badge className={`${statusInfo.className} border-2 px-3 py-1 text-sm font-semibold shadow-sm`}>
                                <span className="text-base mr-1">{statusInfo.emoji}</span>
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-4">
                            {/* Metrics */}
                            <div className="grid grid-cols-1 gap-3">
                              {/* Project Count */}
                              {typeof program.project_count !== 'undefined' && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                    <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground font-medium">Projects</p>
                                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                      {program.project_count}
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {program.budget && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900">
                                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground font-medium">Budget</p>
                                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                      ${program.budget.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {program.start_date && program.end_date && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900">
                                  <div className="p-2 bg-sky-100 dark:bg-sky-900 rounded-lg">
                                    <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground font-medium">Timeline</p>
                                    <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                                      {new Date(program.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(program.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Footer */}
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  {new Date(program.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                {program.owner_name && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
                                      {program.owner_name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs text-muted-foreground font-medium">{program.owner_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                )
              })}
              </div>
            </div>
            ) : searchTerm ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-20">
                  <div className="text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 rounded-full flex items-center justify-center mb-6">
                      <Search className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">No programs found</h3>
                    <p className="text-muted-foreground text-lg mb-6 max-w-md mx-auto">
                      We couldn't find any programs matching "{searchTerm}". Try adjusting your search criteria.
                    </p>
                    <Button variant="outline" onClick={() => setSearchTerm('')} className="border-2">
                      Clear search
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
                <CardContent className="py-20">
                  <div className="text-center">
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
                      <FolderOpen className="h-12 w-12 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      No programs yet
                    </h3>
                    <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                      Create your first program to start organizing and managing your project portfolio
                    </p>
                    <Button 
                      onClick={() => { setCreateDialogOpen(true); }}
                      size="lg"
                      className="shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-12 px-8"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create Your First Program
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
