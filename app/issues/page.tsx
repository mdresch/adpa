"use client"

import React, { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import { getApiUrl } from "@/lib/api-url"
import { toast } from '@/lib/notify'
import {
  AlertCircle,
  TriangleAlert,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Filter,
  Search,
  Edit,
  Trash2,
  Sparkles,
  TrendingUp,
  Users,
  Calendar,
  Tag,
  ArrowRight,
  MoreVertical,
  CheckCircle,
  X,
  Loader2,
} from "lucide-react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { format } from "date-fns"

interface Issue {
  id: string
  project_id: string
  title: string
  description: string
  category: 'technical' | 'resource' | 'schedule' | 'communication' | 'quality' | 'external' | 'scope' | 'budget' | 'other'
  priority: 'critical' | 'high' | 'medium' | 'low'
  impact?: string
  affected_areas?: string[]
  raised_by?: string
  assigned_to?: string
  escalated_to?: string
  status: 'open' | 'acknowledged' | 'in_progress' | 'blocked' | 'resolved' | 'closed'
  resolution?: string
  workaround?: string
  root_cause?: string
  ai_suggested_resolution?: string
  date_raised: string
  target_resolution_date?: string
  date_resolved?: string
  date_closed?: string
  related_risk_id?: string
  tags?: string[]
  created_at: string
  updated_at: string
  raised_by_name?: string
  assigned_to_name?: string
}

interface IssueStats {
  total_issues: number
  open_issues: number
  acknowledged_issues: number
  in_progress_issues: number
  blocked_issues: number
  resolved_issues: number
  closed_issues: number
  critical_issues: number
  high_issues: number
  medium_issues: number
  low_issues: number
  overdue_issues: number
}

const PRIORITY_COLORS = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
}

const STATUS_COLORS = {
  open: 'bg-gray-500',
  acknowledged: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  blocked: 'bg-red-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-400',
}

const STATUS_ICONS = {
  open: AlertCircle,
  acknowledged: Clock,
  in_progress: TrendingUp,
  blocked: XCircle,
  resolved: CheckCircle2,
  closed: CheckCircle,
}

export default function IssuesPage() {
  const { user, loading: authLoading } = useAuth()
  const { isConnected } = useWebSocket()

  const [issues, setIssues] = useState<Issue[]>([])
  const [stats, setStats] = useState<IssueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "technical" as Issue['category'],
    priority: "medium" as Issue['priority'],
    impact: "",
    assigned_to: "",
    target_resolution_date: "",
    tags: [] as string[],
  })

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await apiClient.get("/projects")
        setProjects(data.projects || [])
        if (data.projects && data.projects.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0].id)
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      }
    }
    fetchProjects()
  }, [])

  // Fetch issues
  const fetchIssues = async () => {
    if (!selectedProject) return
    
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('project_id', selectedProject)
      
      if (statusFilter.length > 0) {
        statusFilter.forEach(s => params.append('status', s))
      }
      if (priorityFilter.length > 0) {
        priorityFilter.forEach(p => params.append('priority', p))
      }
      if (categoryFilter.length > 0) {
        categoryFilter.forEach(c => params.append('category', c))
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }
      
      const response = await fetch(`${getApiUrl('/issues')}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch issues')
      
      const data = await response.json()
      setIssues(data.data || [])
      
      // Fetch stats
      const statsResponse = await fetch(`${getApiUrl(`/issues/stats/${selectedProject}`)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.data || null)
      }
    } catch (error) {
      console.error("Failed to fetch issues:", error)
      toast.error("Failed to load issues")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIssues()
  }, [selectedProject, statusFilter, priorityFilter, categoryFilter, searchQuery])

  const handleCreateIssue = async () => {
    try {
      const response = await fetch(getApiUrl('/issues'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...formData,
          project_id: selectedProject,
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create issue')
      }
      
      toast.success("Issue created successfully")
      setCreateDialogOpen(false)
      setFormData({
        title: "",
        description: "",
        category: "technical",
        priority: "medium",
        impact: "",
        assigned_to: "",
        target_resolution_date: "",
        tags: [],
      })
      fetchIssues()
    } catch (error: any) {
      toast.error(error.message || "Failed to create issue")
    }
  }

  const handleUpdateIssue = async (issueId: string, updates: Partial<Issue>) => {
    try {
      const response = await fetch(getApiUrl(`/issues/${issueId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update issue')
      }
      
      toast.success("Issue updated successfully")
      setEditDialogOpen(false)
      setSelectedIssue(null)
      fetchIssues()
    } catch (error: any) {
      toast.error(error.message || "Failed to update issue")
    }
  }

  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm("Are you sure you want to delete this issue?")) return
    
    try {
      const response = await fetch(getApiUrl(`/issues/${issueId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete issue')
      }
      
      toast.success("Issue deleted successfully")
      fetchIssues()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete issue")
    }
  }

  const handleGetAISuggestions = async (issue: Issue) => {
    try {
      setLoadingSuggestions(true)
      setSelectedIssue(issue)
      setSuggestionsDialogOpen(true)
      
      const response = await fetch(getApiUrl('/issues/suggest-resolution'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          issue_id: issue.id,
          issue_title: issue.title,
          issue_description: issue.description,
          issue_category: issue.category,
          issue_priority: issue.priority,
          issue_impact: issue.impact,
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get AI suggestions')
      }
      
      const data = await response.json()
      setAiSuggestions(data.data?.suggestions || [])
    } catch (error: any) {
      toast.error(error.message || "Failed to get AI suggestions")
      setSuggestionsDialogOpen(false)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const filteredIssues = issues.filter(issue => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!issue.title.toLowerCase().includes(query) && 
          !issue.description.toLowerCase().includes(query)) {
        return false
      }
    }
    return true
  })

  const statusData = stats ? [
    { name: 'Open', value: stats.open_issues, color: '#6b7280' },
    { name: 'Acknowledged', value: stats.acknowledged_issues, color: '#3b82f6' },
    { name: 'In Progress', value: stats.in_progress_issues, color: '#eab308' },
    { name: 'Blocked', value: stats.blocked_issues, color: '#ef4444' },
    { name: 'Resolved', value: stats.resolved_issues, color: '#22c55e' },
    { name: 'Closed', value: stats.closed_issues, color: '#9ca3af' },
  ].filter(item => item.value > 0) : []

  const priorityData = stats ? [
    { name: 'Critical', value: stats.critical_issues, color: '#ef4444' },
    { name: 'High', value: stats.high_issues, color: '#f97316' },
    { name: 'Medium', value: stats.medium_issues, color: '#eab308' },
    { name: 'Low', value: stats.low_issues, color: '#3b82f6' },
  ].filter(item => item.value > 0) : []

  if (authLoading) {
    return <div>Loading...</div>
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">Issues & Blockers</h1>
                    <p className="text-muted-foreground mt-1">
                      Track current problems, blockers, and impediments
                    </p>
                  </div>
                  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Issue
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Issue</DialogTitle>
                        <DialogDescription>
                          Report a current problem or blocker that needs resolution
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Title *</Label>
                          <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Brief summary of the issue"
                          />
                        </div>
                        <div>
                          <Label>Description *</Label>
                          <Textarea
                            value={formData.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Full description of the problem"
                            rows={4}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Category *</Label>
                            <Select
                              value={formData.category}
                              onValueChange={(value: string) => setFormData({ ...formData, category: value as Issue['category'] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technical">Technical</SelectItem>
                                <SelectItem value="resource">Resource</SelectItem>
                                <SelectItem value="schedule">Schedule</SelectItem>
                                <SelectItem value="communication">Communication</SelectItem>
                                <SelectItem value="quality">Quality</SelectItem>
                                <SelectItem value="external">External</SelectItem>
                                <SelectItem value="scope">Scope</SelectItem>
                                <SelectItem value="budget">Budget</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Priority *</Label>
                            <Select
                              value={formData.priority}
                              onValueChange={(value: string) => setFormData({ ...formData, priority: value as Issue['priority'] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Impact</Label>
                          <Textarea
                            value={formData.impact}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, impact: e.target.value })}
                            placeholder="Describe how this affects the project"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Target Resolution Date</Label>
                          <Input
                            type="date"
                            value={formData.target_resolution_date}
                            onChange={(e) => setFormData({ ...formData, target_resolution_date: e.target.value })}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateIssue} disabled={!formData.title || !formData.description}>
                            Create Issue
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Project Selector */}
                {projects.length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <Label>Project:</Label>
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                          <SelectTrigger className="w-[300px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map(project => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Statistics Cards */}
                {stats && (
                  <AnimatedGrid cols={4}>
                    <AnimatedGridItem>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Total Issues</p>
                              <p className="text-2xl font-bold">{stats.total_issues}</p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedGridItem>
                    <AnimatedGridItem>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Open Issues</p>
                              <p className="text-2xl font-bold">{stats.open_issues}</p>
                            </div>
                            <TriangleAlert className="h-8 w-8 text-orange-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedGridItem>
                    <AnimatedGridItem>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                              <p className="text-2xl font-bold text-red-500">{stats.critical_issues}</p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedGridItem>
                    <AnimatedGridItem>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                              <p className="text-2xl font-bold text-red-500">{stats.overdue_issues}</p>
                            </div>
                            <Clock className="h-8 w-8 text-red-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedGridItem>
                  </AnimatedGrid>
                )}

                {/* Charts */}
                {(statusData.length > 0 || priorityData.length > 0) && (
                  <div className="grid grid-cols-2 gap-6">
                    {statusData.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Issues by Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {statusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                    {priorityData.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Issues by Priority</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={priorityData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value">
                                {priorityData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle>Filters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <Input
                          placeholder="Search issues..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <Select
                        value={statusFilter.length === 0 ? 'all' : statusFilter[0]}
                        onValueChange={(value: string) => setStatusFilter(value === 'all' ? [] : [value])}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="acknowledged">Acknowledged</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={priorityFilter.length === 0 ? 'all' : priorityFilter[0]}
                        onValueChange={(value: string) => setPriorityFilter(value === 'all' ? [] : [value])}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priorities</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Issues List */}
                <div className="space-y-4">
                  {loading ? (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8">Loading issues...</div>
                      </CardContent>
                    </Card>
                  ) : filteredIssues.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8">
                          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No issues found</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredIssues.map((issue) => {
                      const StatusIcon = STATUS_ICONS[issue.status]
                      return (
                        <Card key={issue.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge className={PRIORITY_COLORS[issue.priority]}>
                                    {issue.priority}
                                  </Badge>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <StatusIcon className="h-3 w-3" />
                                    {issue.status.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline">{issue.category}</Badge>
                                  <h3 className="font-semibold text-lg">{issue.title}</h3>
                                </div>
                                <p className="text-muted-foreground mb-3">{issue.description}</p>
                                {issue.impact && (
                                  <div className="mb-2">
                                    <span className="text-sm font-medium">Impact: </span>
                                    <span className="text-sm text-muted-foreground">{issue.impact}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Raised: {format(new Date(issue.date_raised), 'MMM d, yyyy')}</span>
                                  {issue.target_resolution_date && (
                                    <span>Target: {format(new Date(issue.target_resolution_date), 'MMM d, yyyy')}</span>
                                  )}
                                  {issue.assigned_to_name && (
                                    <span>Assigned: {issue.assigned_to_name}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGetAISuggestions(issue)}
                                >
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  AI Suggestions
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedIssue(issue)
                                    setEditDialogOpen(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteIssue(issue.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>

                {/* Edit Issue Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Issue</DialogTitle>
                    </DialogHeader>
                    {selectedIssue && (
                      <div className="space-y-4">
                        <div>
                          <Label>Status</Label>
                          <Select
                            value={selectedIssue.status}
                            onValueChange={(value: string) => {
                              handleUpdateIssue(selectedIssue.id, { status: value as Issue['status'] })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="acknowledged">Acknowledged</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Resolution</Label>
                          <Textarea
                            value={selectedIssue.resolution || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                              setSelectedIssue({ ...selectedIssue, resolution: e.target.value })
                            }}
                            placeholder="How was this issue resolved?"
                            rows={4}
                          />
                        </div>
                        <div>
                          <Label>Root Cause</Label>
                          <Textarea
                            value={selectedIssue.root_cause || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                              setSelectedIssue({ ...selectedIssue, root_cause: e.target.value })
                            }}
                            placeholder="Root cause analysis"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Workaround</Label>
                          <Textarea
                            value={selectedIssue.workaround || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                              setSelectedIssue({ ...selectedIssue, workaround: e.target.value })
                            }}
                            placeholder="Temporary workaround (if applicable)"
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={() => {
                            handleUpdateIssue(selectedIssue.id, {
                              resolution: selectedIssue.resolution,
                              root_cause: selectedIssue.root_cause,
                              workaround: selectedIssue.workaround,
                            })
                          }}>
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* AI Suggestions Dialog */}
                <Dialog open={suggestionsDialogOpen} onOpenChange={setSuggestionsDialogOpen}>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>AI Resolution Suggestions</DialogTitle>
                      <DialogDescription>
                        AI-powered resolution suggestions for: {selectedIssue?.title}
                      </DialogDescription>
                    </DialogHeader>
                    {loadingSuggestions ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Generating suggestions...</span>
                      </div>
                    ) : aiSuggestions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No suggestions available
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {aiSuggestions.map((suggestion: any, index: number) => (
                          <Card key={index}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                                <Badge>{suggestion.priority}</Badge>
                              </div>
                              <CardDescription>
                                {suggestion.resolution_type} • {suggestion.estimated_duration_days} days • {suggestion.expected_effectiveness}% effective
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="mb-3">{suggestion.description}</p>
                              {suggestion.key_steps && suggestion.key_steps.length > 0 && (
                                <div className="mb-3">
                                  <p className="font-medium mb-2">Key Steps:</p>
                                  <ul className="list-disc list-inside space-y-1 text-sm">
                                    {suggestion.key_steps.map((step: string, i: number) => (
                                      <li key={i}>{step}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {suggestion.success_criteria && (
                                <div className="mb-3">
                                  <p className="font-medium mb-1">Success Criteria:</p>
                                  <p className="text-sm text-muted-foreground">{suggestion.success_criteria}</p>
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (selectedIssue) {
                                    handleUpdateIssue(selectedIssue.id, {
                                      resolution: suggestion.description,
                                      ai_suggested_resolution: suggestion.description,
                                    })
                                    setSuggestionsDialogOpen(false)
                                  }
                                }}
                              >
                                Use This Resolution
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}


