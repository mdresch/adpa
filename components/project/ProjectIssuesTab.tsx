"use client"

import React, { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiClient } from "@/lib/api"
import { toast } from '@/lib/notify'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
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

// Helper function to safely extract error message
const getErrorMessage = (error: any, defaultMessage: string): string => {
  if (!error) return defaultMessage
  
  // Check if error.response.data is an object with message/code/details
  const errorData = error.response?.data
  if (errorData) {
    // If it's a string, return it
    if (typeof errorData === 'string') return errorData
    
    // If it's an object, try to extract message
    if (typeof errorData === 'object') {
      if (errorData.message && typeof errorData.message === 'string') {
        return errorData.message
      }
      if (errorData.error && typeof errorData.error === 'string') {
        return errorData.error
      }
      // If object has message/code/details, stringify the message
      if (errorData.message) {
        return String(errorData.message)
      }
    }
  }
  
  // Fallback to error.message or default
  return error.message || defaultMessage
}

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
  ai_confidence?: number
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

interface ProjectIssuesTabProps {
  projectId: string
}

const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
}

const STATUS_COLORS = {
  open: '#6b7280',
  acknowledged: '#3b82f6',
  in_progress: '#eab308',
  blocked: '#ef4444',
  resolved: '#22c55e',
  closed: '#9ca3af',
}

const STATUS_ICONS = {
  open: AlertCircle,
  acknowledged: Clock,
  in_progress: TrendingUp,
  blocked: XCircle,
  resolved: CheckCircle2,
  closed: CheckCircle,
}

export function ProjectIssuesTab({ projectId }: ProjectIssuesTabProps) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [stats, setStats] = useState<IssueStats | null>(null)
  const [loading, setLoading] = useState(true)
  
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

  // Fetch issues
  const fetchIssues = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('project_id', projectId)
      
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
      
      const response = await apiClient.get(`/issues?${params.toString()}`)
      setIssues(response.data || [])
    } catch (error: any) {
      console.error("Failed to fetch issues:", error)
      toast.error(getErrorMessage(error, "Failed to load issues"))
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await apiClient.get(`/issues/stats/${projectId}`)
      setStats(response.data || null)
    } catch (error: any) {
      console.error("Failed to fetch issue stats:", error)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchIssues()
      fetchStats()
    }
  }, [projectId, statusFilter, priorityFilter, categoryFilter, searchQuery])

  // Create issue
  const handleCreateIssue = async () => {
    try {
      // Convert empty strings to null for optional fields
      const payload = {
        ...formData,
        project_id: projectId,
        impact: formData.impact || null,
        assigned_to: formData.assigned_to || null,
        target_resolution_date: formData.target_resolution_date || null,
      }
      await apiClient.post("/issues", payload)
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
      fetchStats()
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Failed to create issue"))
    }
  }

  // Update issue
  const handleUpdateIssue = async () => {
    if (!selectedIssue) return
    
    try {
      // Convert empty strings to null for optional fields
      const payload = {
        ...formData,
        project_id: projectId,
        impact: formData.impact || null,
        assigned_to: formData.assigned_to || null,
        target_resolution_date: formData.target_resolution_date || null,
      }
      await apiClient.put(`/issues/${selectedIssue.id}`, payload)
      toast.success("Issue updated successfully")
      setEditDialogOpen(false)
      setSelectedIssue(null)
      fetchIssues()
      fetchStats()
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Failed to update issue"))
    }
  }

  // Delete issue
  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm("Are you sure you want to delete this issue?")) return
    
    try {
      await apiClient.delete(`/issues/${issueId}`)
      toast.success("Issue deleted successfully")
      fetchIssues()
      fetchStats()
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Failed to delete issue"))
    }
  }

  // Get AI suggestions
  const handleGetSuggestions = async (issueId: string) => {
    try {
      setLoadingSuggestions(true)
      setSuggestionsDialogOpen(true)
      const response = await apiClient.post(`/issues/suggest-resolution`, { issue_id: issueId })
      setAiSuggestions(response.data?.suggestions || [])
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Failed to get AI suggestions"))
      setSuggestionsDialogOpen(false)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = !searchQuery || 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(issue.status)
    const matchesPriority = priorityFilter.length === 0 || priorityFilter.includes(issue.priority)
    const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(issue.category)
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory
  })

  // Chart data
  const statusData = stats ? [
    { name: 'Open', value: stats.open_issues, color: STATUS_COLORS.open },
    { name: 'Acknowledged', value: stats.acknowledged_issues, color: STATUS_COLORS.acknowledged },
    { name: 'In Progress', value: stats.in_progress_issues, color: STATUS_COLORS.in_progress },
    { name: 'Blocked', value: stats.blocked_issues, color: STATUS_COLORS.blocked },
    { name: 'Resolved', value: stats.resolved_issues, color: STATUS_COLORS.resolved },
    { name: 'Closed', value: stats.closed_issues, color: STATUS_COLORS.closed },
  ].filter(item => item.value > 0) : []

  const priorityData = stats ? [
    { name: 'Critical', value: stats.critical_issues, color: PRIORITY_COLORS.critical },
    { name: 'High', value: stats.high_issues, color: PRIORITY_COLORS.high },
    { name: 'Medium', value: stats.medium_issues, color: PRIORITY_COLORS.medium },
    { name: 'Low', value: stats.low_issues, color: PRIORITY_COLORS.low },
  ].filter(item => item.value > 0) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Issues & Blockers</h2>
          <p className="text-muted-foreground mt-1">
            Track current problems, blockers, and impediments for this project
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
                  placeholder="Describe the impact of this issue"
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateIssue} disabled={!formData.title || !formData.description}>
                Create Issue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Issues</p>
                  <p className="text-2xl font-bold">{stats.total_issues}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Open Issues</p>
                  <p className="text-2xl font-bold">{stats.open_issues}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
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
        </div>
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
                      label={({ name, value }) => `${name}: ${value}`}
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
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
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
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No issues found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span>{issue.title}</span>
                          {issue.related_risk_id && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              From Risk
                            </Badge>
                          )}
                        </div>
                        {issue.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {issue.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: PRIORITY_COLORS[issue.priority] + '20',
                          color: PRIORITY_COLORS[issue.priority],
                        }}
                      >
                        {issue.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: STATUS_COLORS[issue.status] + '20',
                          color: STATUS_COLORS[issue.status],
                        }}
                      >
                        {issue.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(issue.date_raised), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {issue.target_resolution_date ? (
                        format(new Date(issue.target_resolution_date), 'MMM dd, yyyy')
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedIssue(issue)
                            setFormData({
                              title: issue.title,
                              description: issue.description,
                              category: issue.category,
                              priority: issue.priority,
                              impact: issue.impact || "",
                              assigned_to: issue.assigned_to || "",
                              target_resolution_date: issue.target_resolution_date || "",
                              tags: issue.tags || [],
                            })
                            setEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGetSuggestions(issue.id)}
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteIssue(issue.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Issue</DialogTitle>
            <DialogDescription>
              Update issue details and status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
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
                <Label>Priority</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateIssue}>
              Update Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={suggestionsDialogOpen} onOpenChange={setSuggestionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Resolution Suggestions</DialogTitle>
            <DialogDescription>
              AI-generated suggestions for resolving this issue
            </DialogDescription>
          </DialogHeader>
          {loadingSuggestions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : aiSuggestions.length > 0 ? (
            <div className="space-y-4">
              {aiSuggestions.map((suggestion, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <p className="text-sm">{suggestion.resolution}</p>
                    {suggestion.confidence && (
                      <Badge className="mt-2">
                        Confidence: {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No suggestions available
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

