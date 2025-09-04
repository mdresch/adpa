"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { motion } from "framer-motion"
import { apiClient, Project } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
  Sparkles,
  Clock,
  Loader2,
} from "lucide-react"
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

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const { isAuthenticated } = useAuth()

  // Form state for creating new project
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    framework: "",
    priority: "medium",
    start_date: "",
    end_date: "",
    budget: "",
    manager: "",
  })

  const [dialogOpen, setDialogOpen] = useState(false)

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      setLoading(true)
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      }

      if (statusFilter !== "all") {
        params.status = statusFilter
      }

      if (searchTerm) {
        params.search = searchTerm
      }

      const response = await apiClient.getProjects(params)
      setProjects(response.projects || [])
      setPagination(response.pagination || pagination)
    } catch (error) {
      console.error("Failed to fetch projects:", error)
      toast.error("Failed to load projects")
      // Use fallback mock data if API fails
      setProjects([
        {
          id: "1",
          name: "Customer Portal Redesign",
          description: "Complete redesign of the customer-facing portal with improved UX and new features",
          status: "active",
          framework: "PMBOK 7",
          priority: "high",
          owner_id: "user1",
          team_members: ["John Doe", "Jane Smith", "Mike Wilson"],
          start_date: "2024-01-15",
          end_date: "2024-06-30",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-20T00:00:00Z",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Create new project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProject.name || !newProject.framework) {
      toast.error("Please fill in required fields")
      return
    }

    try {
      setCreating(true)
      const projectData = {
        ...newProject,
        team_members: newProject.manager ? [newProject.manager] : [],
      }
      
      await apiClient.createProject(projectData)
      toast.success("Project created successfully!")
      setDialogOpen(false)
      setNewProject({
        name: "",
        description: "",
        framework: "",
        priority: "medium",
        start_date: "",
        end_date: "",
        budget: "",
        manager: "",
      })
      fetchProjects() // Refresh the list
    } catch (error) {
      console.error("Failed to create project:", error)
      toast.error("Failed to create project")
    } finally {
      setCreating(false)
    }
  }

  // Fetch projects on component mount and when filters change
  useEffect(() => {
    fetchProjects()
  }, [pagination.page, statusFilter, searchTerm])

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    return matchesSearch && matchesStatus
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500 bg-red-50 dark:bg-red-900/20"
      case "medium":
        return "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
      case "low":
        return "text-green-500 bg-green-50 dark:bg-green-900/20"
      default:
        return "text-slate-500 bg-slate-50 dark:bg-slate-900/20"
    }
  }

  // Mock progress calculation (in real app, this would come from API)
  const getProjectProgress = (project: Project) => {
    const startDate = new Date(project.start_date || Date.now())
    const endDate = new Date(project.end_date || Date.now())
    const now = new Date()
    
    if (now < startDate) return 0
    if (now > endDate) return 100
    
    const totalDays = endDate.getTime() - startDate.getTime()
    const elapsedDays = now.getTime() - startDate.getTime()
    return Math.round((elapsedDays / totalDays) * 100)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access projects.</p>
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
                        Projects
                      </motion.h1>
                      <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-slate-600 dark:text-slate-300 text-lg"
                      >
                        Manage projects and their associated documentation libraries
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
                        New Project
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        >
                          <Sparkles className="h-4 w-4 ml-2" />
                        </motion.div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
                      <form onSubmit={handleCreateProject}>
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Create New Project
                          </DialogTitle>
                          <DialogDescription className="text-slate-600 dark:text-slate-300">
                            Create a new project with document library and template integration.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="project-name" className="text-sm font-semibold">
                                Project Name *
                              </Label>
                              <Input
                                id="project-name"
                                placeholder="Enter project name"
                                value={newProject.name}
                                onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="framework" className="text-sm font-semibold">
                                Framework *
                              </Label>
                              <select 
                                className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                                value={newProject.framework}
                                onChange={(e) => setNewProject({...newProject, framework: e.target.value})}
                                required
                              >
                                <option value="">Select framework</option>
                                <option value="BABOK v3">BABOK v3</option>
                                <option value="PMBOK 7">PMBOK 7</option>
                                <option value="DMBOK 2.0">DMBOK 2.0</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="description" className="text-sm font-semibold">
                              Description
                            </Label>
                            <Textarea
                              id="description"
                              placeholder="Describe the project objectives and scope"
                              value={newProject.description}
                              onChange={(e) => setNewProject({...newProject, description: e.target.value})}
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
                                value={newProject.start_date}
                                onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
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
                                value={newProject.end_date}
                                onChange={(e) => setNewProject({...newProject, end_date: e.target.value})}
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
                                value={newProject.budget}
                                onChange={(e) => setNewProject({...newProject, budget: e.target.value})}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="manager" className="text-sm font-semibold">
                              Project Manager
                            </Label>
                            <Input
                              id="manager"
                              placeholder="Enter manager name"
                              value={newProject.manager}
                              onChange={(e) => setNewProject({...newProject, manager: e.target.value})}
                              className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={creating}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                          >
                            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Project
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              </motion.div>

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
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 focus:shadow-lg focus:shadow-blue-500/20"
                    />
                  </motion.div>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <motion.select
                    whileHover={{ scale: 1.02 }}
                    className="flex h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm focus:border-blue-500 transition-colors"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
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
                  <span className="ml-2 text-slate-600 dark:text-slate-300">Loading projects...</span>
                </div>
              )}

              {/* Projects Grid */}
              {!loading && (
                <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project, index) => {
                    const progress = getProjectProgress(project)
                    const documentsCount = (project as any).document_count || 0
                    
                    return (
                      <AnimatedGridItem key={project.id}>
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
                                  <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                                </motion.div>
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.1 + 0.4, type: "spring" }}
                                >
                                  <Badge variant="outline" className="border-slate-300 dark:border-slate-600">
                                    {project.framework}
                                  </Badge>
                                </motion.div>
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.1 + 0.5, type: "spring" }}
                                >
                                  <Badge className={getPriorityColor(project.priority)}>{project.priority}</Badge>
                                </motion.div>
                              </div>
                            </div>
                            <CardTitle className="text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors">
                                {project.name}
                              </Link>
                            </CardTitle>
                            <CardDescription className="line-clamp-2 text-slate-600 dark:text-slate-300">
                              {project.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="relative space-y-6">
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium text-slate-700 dark:text-slate-200">Progress</span>
                                <motion.span
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: index * 0.1 + 0.6 }}
                                  className="font-bold text-blue-600 dark:text-blue-400"
                                >
                                  {progress}%
                                </motion.span>
                              </div>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ delay: index * 0.1 + 0.7, duration: 0.8 }}
                              >
                                <Progress value={progress} className="h-3 bg-slate-100 dark:bg-slate-700">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ delay: index * 0.1 + 0.8, duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                                  />
                                </Progress>
                              </motion.div>
                            </div>

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
                                  {project.start_date && new Date(project.start_date).toLocaleDateString()} -{" "}
                                  {project.end_date && new Date(project.end_date).toLocaleDateString()}
                                </p>
                              </motion.div>
                              <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 + 1.0 }}
                                className="space-y-1"
                              >
                                <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                                  <FileText className="h-3 w-3" />
                                  <span>Documents</span>
                                </div>
                                <p className="font-medium text-slate-700 dark:text-slate-200">
                                  {documentsCount} files
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
                                <span className="text-sm">Team</span>
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium text-sm text-slate-700 dark:text-slate-200">
                                  {project.team_members?.length || 0} members
                                </p>
                              </div>
                            </motion.div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(project.updated_at).toLocaleDateString()}
                                </span>
                              </div>
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
                                    <DropdownMenuItem className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Project
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                      <Archive className="h-4 w-4 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
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

              {!loading && filteredProjects.length === 0 && (
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
                  <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">No projects found</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                    {searchTerm || statusFilter !== "all"
                      ? "Try adjusting your search or filter criteria to find what you're looking for"
                      : "Create your first project to get started with document automation"}
                  </p>
                  {!searchTerm && statusFilter === "all" && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Project
                            <Sparkles className="h-4 w-4 ml-2" />
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
