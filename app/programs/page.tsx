"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { motion } from "framer-motion"
import { apiClient, Program } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// RAG status configuration
const ragStatusConfig = {
  green: { emoji: '🟢', label: 'Green', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', variant: 'default' as const },
  amber: { emoji: '🟡', label: 'Amber', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', variant: 'default' as const },
  red: { emoji: '🔴', label: 'Red', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', variant: 'destructive' as const },
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [ownerFilter, setOwnerFilter] = useState("all")
  const [ragFilter, setRagFilter] = useState("all")
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    pages: number
  }>({
    page: 1,
    limit: 9,
    total: 0,
    pages: 0,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const { isAuthenticated } = useAuth()

  // Form state for creating new program
  const [newProgram, setNewProgram] = useState<{
    name: string
    description: string
    budget: string
    currency_code: string
    start_date: string
    end_date: string
    owner_id: string
    rag_status: 'green' | 'amber' | 'red'
  }>({
    name: "",
    description: "",
    budget: "",
    currency_code: "USD",
    start_date: "",
    end_date: "",
    owner_id: "",
    rag_status: "green",
  })

  // Form state for editing program
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Fetch programs from API
  const fetchPrograms = React.useCallback(async () => {
    try {
      setLoading(true)
      const params: {
        page: number
        limit: number
        status?: string
        owner_id?: string
        rag_status?: string
        search?: string
      } = {
        page: pagination.page,
        limit: pagination.limit,
      }

      if (statusFilter !== "all") {
        params.status = statusFilter
      }

      if (ownerFilter !== "all") {
        params.owner_id = ownerFilter
      }

      if (ragFilter !== "all") {
        params.rag_status = ragFilter
      }

      if (searchTerm) {
        params.search = searchTerm
      }

      const response = await apiClient.getPrograms(params)
      setPrograms(response.programs || [])
      setPagination(prev => response.pagination || prev)
    } catch (error) {
      console.error("Failed to fetch programs:", error)
      toast.error("Failed to load programs")
      // Use empty array as fallback
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, statusFilter, ownerFilter, ragFilter, searchTerm])

  // Create new program
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProgram.name) {
      toast.error("Please fill in required fields (Name)")
      return
    }

    // Validate dates if provided
    if (newProgram.start_date && newProgram.end_date) {
      const startDate = new Date(newProgram.start_date)
      const endDate = new Date(newProgram.end_date)
      if (endDate <= startDate) {
        toast.error("End date must be after start date")
        return
      }
    }

    // Validate budget if provided
    if (newProgram.budget && isNaN(parseFloat(newProgram.budget))) {
      toast.error("Please enter a valid budget amount")
      return
    }

    try {
      setCreating(true)
      const programData = {
        ...newProgram,
        budget: newProgram.budget ? parseFloat(newProgram.budget) : undefined,
        start_date: newProgram.start_date || undefined,
        end_date: newProgram.end_date || undefined,
      }
      
      await apiClient.createProgram(programData)
      toast.success("Program created successfully!")
      setDialogOpen(false)
      setNewProgram({
        name: "",
        description: "",
        budget: "",
        currency_code: "USD",
        start_date: "",
        end_date: "",
        owner_id: "",
        rag_status: "green",
      })
      fetchPrograms() // Refresh the list
    } catch (error) {
      console.error("Failed to create program:", error)
      toast.error("Failed to create program. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  // Update program
  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingProgram?.name) {
      toast.error("Please fill in required fields (Name)")
      return
    }

    // Validate dates if provided
    if (editingProgram.start_date && editingProgram.end_date) {
      const startDate = new Date(editingProgram.start_date)
      const endDate = new Date(editingProgram.end_date)
      if (endDate <= startDate) {
        toast.error("End date must be after start date")
        return
      }
    }

    // Validate budget if provided
    if (editingProgram.budget && isNaN(parseFloat(editingProgram.budget.toString()))) {
      toast.error("Please enter a valid budget amount")
      return
    }

    try {
      setUpdating(true)
      const programData = {
        ...editingProgram,
        budget: editingProgram.budget ? parseFloat(editingProgram.budget.toString()) : undefined,
        start_date: editingProgram.start_date || undefined,
        end_date: editingProgram.end_date || undefined,
      }
      
      await apiClient.updateProgram(editingProgram.id, programData)
      toast.success("Program updated successfully!")
      setEditDialogOpen(false)
      setEditingProgram(null)
      fetchPrograms() // Refresh the list
    } catch (error) {
      console.error("Failed to update program:", error)
      toast.error("Failed to update program. Please try again.")
    } finally {
      setUpdating(false)
    }
  }

  // Handle edit program
  const handleEditProgram = (program: Program) => {
    // Normalize dates to YYYY-MM-DD so <input type="date"> displays them correctly
    const normalizeDate = (d?: string | null) => {
      try {
        if (!d) return ""
        const dt = new Date(d)
        if (isNaN(dt.getTime())) return ""
        
        const year = dt.getFullYear()
        const month = String(dt.getMonth() + 1).padStart(2, '0')
        const day = String(dt.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } catch (e) {
        console.warn("Error formatting date:", d, e)
        return ""
      }
    }

    setEditingProgram({
      ...program,
      start_date: normalizeDate(program.start_date),
      end_date: normalizeDate(program.end_date),
    })
    setEditDialogOpen(true)
  }

  // Handle delete program
  const handleDeleteProgram = async (programId: string) => {
    if (!confirm("Are you sure you want to delete this program? This action cannot be undone.")) {
      return
    }
    try {
      await apiClient.deleteProgram(programId)
      toast.success("Program deleted successfully!")
      fetchPrograms()
    } catch (error) {
      console.error("Failed to delete program:", error)
      toast.error("Failed to delete program")
    }
  }

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch =
      program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (program.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    const matchesStatus = statusFilter === "all" || program.status === statusFilter
    const matchesOwner = ownerFilter === "all" || program.owner_id === ownerFilter
    const matchesRAG = ragFilter === "all" || program.rag_status === ragFilter
    return matchesSearch && matchesStatus && matchesOwner && matchesRAG
  })

  // Sort by most recently updated first
  const sortedPrograms = [...filteredPrograms].sort((a, b) => {
    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0
    return bTime - aTime
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
      case "planning":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
      case "completed":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
      case "on-hold":
        return "bg-gradient-to-r from-orange-500 to-red-500 text-white"
      default:
        return "bg-gradient-to-r from-slate-500 to-gray-500 text-white"
    }
  }

  // Format currency
  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return "Not set"
    const currencySymbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$"
    return `${currencySymbol}${amount.toLocaleString()}`
  }

  // Fetch programs on component mount and when filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchPrograms()
    }
  }, [isAuthenticated, statusFilter, ownerFilter, ragFilter, searchTerm, pagination.page, fetchPrograms])

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access programs.</p>
        </div>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <AnimatedLayout className="space-y-8">
              {/* Hero Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg"
                    >
                      <FolderOpen className="h-8 w-8 text-white" />
                    </motion.div>
                    <div>
                      <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                      >
                        Programs
                      </motion.h1>
                      <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-slate-600 dark:text-slate-300 text-lg"
                      >
                        Manage programs and their associated projects ({pagination.total} total)
                      </motion.p>
                    </div>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Program
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        >
                          <Sparkles className="h-4 w-4 ml-2" />
                        </motion.div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
                      <form onSubmit={handleCreateProgram}>
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Create New Program
                          </DialogTitle>
                          <DialogDescription className="text-slate-600 dark:text-slate-300">
                            Create a new program to organize multiple related projects.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="program-name" className="text-sm font-semibold">
                                Program Name *
                              </Label>
                              <Input
                                id="program-name"
                                placeholder="Enter program name"
                                value={newProgram.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProgram({...newProgram, name: e.target.value})}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="rag-status" className="text-sm font-semibold">
                                RAG Status
                              </Label>
                              <select 
                                id="rag-status"
                                title="RAG Status"
                                className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                                value={newProgram.rag_status}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewProgram({...newProgram, rag_status: e.target.value as 'green' | 'amber' | 'red'})}
                              >
                                <option value="green">🟢 Green - On Track</option>
                                <option value="amber">🟡 Amber - At Risk</option>
                                <option value="red">🔴 Red - Critical</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="description" className="text-sm font-semibold">
                              Description
                            </Label>
                            <Textarea
                              id="description"
                              placeholder="Describe the program objectives and scope"
                              value={newProgram.description}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewProgram({...newProgram, description: e.target.value})}
                              className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="start-date" className="text-sm font-semibold">
                                Start Date
                              </Label>
                              <Input
                                id="start-date"
                                type="date"
                                value={newProgram.start_date}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProgram({...newProgram, start_date: e.target.value})}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <Label htmlFor="end-date" className="text-sm font-semibold">
                                End Date
                              </Label>
                              <Input
                                id="end-date"
                                type="date"
                                value={newProgram.end_date}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProgram({...newProgram, end_date: e.target.value})}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <Label htmlFor="budget" className="text-sm font-semibold">
                                Budget
                              </Label>
                              <Input
                                id="budget"
                                placeholder="$0"
                                value={newProgram.budget}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProgram({...newProgram, budget: e.target.value})}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={creating}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                          >
                            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Program
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              </motion.div>

              {/* Edit Program Dialog */}
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
                  <form onSubmit={handleUpdateProgram}>
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Edit Program
                      </DialogTitle>
                      <DialogDescription className="text-slate-600 dark:text-slate-300">
                        Update program details and settings.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-program-name" className="text-sm font-semibold">
                            Program Name *
                          </Label>
                          <Input
                            id="edit-program-name"
                            placeholder="Enter program name"
                            value={editingProgram?.name || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingProgram({...editingProgram!, name: e.target.value})}
                            className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-rag-status" className="text-sm font-semibold">
                            RAG Status
                          </Label>
                          <select 
                            id="edit-rag-status"
                            title="RAG Status"
                            className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                            value={editingProgram?.rag_status || "green"}
                            onChange={(e) => setEditingProgram({...editingProgram!, rag_status: e.target.value as 'green' | 'amber' | 'red'})}
                          >
                            <option value="green">🟢 Green - On Track</option>
                            <option value="amber">🟡 Amber - At Risk</option>
                            <option value="red">🔴 Red - Critical</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="edit-description" className="text-sm font-semibold">
                          Description
                        </Label>
                        <Textarea
                          id="edit-description"
                          placeholder="Describe the program objectives and scope"
                          value={editingProgram?.description || ""}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingProgram({...editingProgram!, description: e.target.value})}
                          className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="edit-start-date" className="text-sm font-semibold">
                            Start Date
                          </Label>
                          <Input
                            id="edit-start-date"
                            type="date"
                            value={editingProgram?.start_date || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingProgram({...editingProgram!, start_date: e.target.value})}
                            className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-end-date" className="text-sm font-semibold">
                            End Date
                          </Label>
                          <Input
                            id="edit-end-date"
                            type="date"
                            value={editingProgram?.end_date || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingProgram({...editingProgram!, end_date: e.target.value})}
                            className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-budget" className="text-sm font-semibold">
                            Budget
                          </Label>
                          <Input
                            id="edit-budget"
                            placeholder="$0"
                            value={editingProgram?.budget?.toString() || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingProgram({...editingProgram!, budget: Number(e.target.value)})}
                            className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={updating}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                      >
                        {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Update Program
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Search and Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="flex items-center space-x-4"
              >
                <div className="relative flex-1 max-w-md group">
                  <motion.div whileHover={{ scale: 1.02 }} className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 transition-colors group-focus-within:text-blue-500" />
                    <Input
                      placeholder="Search programs..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 focus:shadow-lg focus:shadow-blue-500/20"
                    />
                  </motion.div>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <motion.select
                    whileHover={{ scale: 1.02 }}
                    className="flex h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm focus:border-blue-500 transition-colors"
                    value={ragFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRagFilter(e.target.value)}
                  >
                    <option value="all">All RAG Status</option>
                    <option value="green">🟢 Green</option>
                    <option value="amber">🟡 Amber</option>
                    <option value="red">🔴 Red</option>
                  </motion.select>
                  <motion.select
                    whileHover={{ scale: 1.02 }}
                    className="flex h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm focus:border-blue-500 transition-colors"
                    value={statusFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="planning">Planning</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </motion.select>
                </div>
              </motion.div>

              {/* Loading State */}
              {loading && (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-slate-600 dark:text-slate-300">Loading programs...</span>
                </div>
              )}

              {/* Programs Grid */}
              {!loading && (
                <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedPrograms.map((program, index) => {
                    const projectCount = program.project_count || 0
                    
                    return (
                      <AnimatedGridItem key={program.id}>
                        <Card className="glass border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <CardHeader className="relative">
                            <div className="flex items-start justify-between">
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg"
                              >
                                <FolderOpen className="h-6 w-6 text-white" />
                              </motion.div>
                              <div className="flex flex-col space-y-2">
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                                >
                                  <Badge className={ragStatusConfig[program.rag_status].color}>
                                    {ragStatusConfig[program.rag_status].emoji} {ragStatusConfig[program.rag_status].label}
                                  </Badge>
                                </motion.div>
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.1 + 0.4, type: "spring" }}
                                >
                                  <Badge className={getStatusColor(program.status)}>{program.status}</Badge>
                                </motion.div>
                              </div>
                            </div>
                            <CardTitle className="text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              <Link href={`/programs/${program.id}`} className="hover:text-primary transition-colors">
                                {program.name}
                              </Link>
                            </CardTitle>
                            <CardDescription className="line-clamp-2 text-slate-600 dark:text-slate-300">
                              {program.description || "No description provided"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="relative space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 + 0.9 }}
                                className="space-y-1"
                              >
                                <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                                  <Calendar className="h-3 w-3" />
                                  <span>Timeline</span>
                                </div>
                                <p className="font-medium text-xs text-slate-700 dark:text-slate-200">
                                  {program.start_date ? new Date(program.start_date).toLocaleDateString() : "Not set"} -{" "}
                                  {program.end_date ? new Date(program.end_date).toLocaleDateString() : "Not set"}
                                </p>
                              </motion.div>
                              <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 + 1.0 }}
                                className="space-y-1"
                              >
                                <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                                  <DollarSign className="h-3 w-3" />
                                  <span>Budget</span>
                                </div>
                                <p className="font-medium text-slate-700 dark:text-slate-200">
                                  {formatCurrency(program.budget, program.currency_code)}
                                </p>
                              </motion.div>
                            </div>

                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 + 1.1 }}
                              className="space-y-2"
                            >
                              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                                <Users className="h-3 w-3" />
                                <span className="text-sm">Projects</span>
                              </div>
                              <p className="font-medium text-sm text-slate-700 dark:text-slate-200">
                                {projectCount} project{projectCount !== 1 ? 's' : ''}
                              </p>
                              {program.owner_name && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Owner: {program.owner_name}
                                </p>
                              )}
                            </motion.div>

                            <div className="flex items-center justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 + 1.2, type: "spring" }}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="glass border-0 shadow-xl">
                                    <DropdownMenuItem 
                                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                                      onClick={() => handleEditProgram(program)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Program
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      onClick={() => handleDeleteProgram(program.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </motion.div>
                            </div>
                          </CardContent>
                        </Card>
                      </AnimatedGridItem>
                    )
                  })}
                </AnimatedGrid>
              )}

              {!loading && sortedPrograms.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-16"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    className="p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl inline-block mb-6"
                  >
                    <FolderOpen className="h-16 w-16 text-slate-400 mx-auto" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">No programs found</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                    {searchTerm || statusFilter !== "all" || ragFilter !== "all"
                      ? "Try adjusting your search or filter criteria to find what you're looking for"
                      : "Create your first program to organize multiple related projects"}
                  </p>
                  {!searchTerm && statusFilter === "all" && ragFilter === "all" && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Program
                            <Sparkles className="h-4 w-4 ml-2" />
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Pagination */}
              {!loading && sortedPrograms.length > 0 && pagination.pages > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="flex items-center justify-between"
                >
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} programs
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
