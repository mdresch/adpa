"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Loader2, Search, Briefcase, Clock, User, Calendar,
  TrendingUp, AlertCircle, CheckCircle2, XCircle
} from '@/components/ui/icons-shim'
import { getApiUrl } from '@/lib/api-url'
import { toast } from 'sonner'

interface TaskWithResource {
  taskId: string
  taskName: string
  taskNumber: string
  projectId: string
  projectName: string
  taskStatus: string
  percentComplete: number
  plannedStartDate: string
  plannedEndDate: string
  estimatedHours: number
  assignmentId: string
  userId: string
  userName: string
  roleName: string
  plannedHours: number
  actualHours: number
  assignmentStatus: string
  scheduledStartDate: string
  scheduledEndDate: string
  allocationPercentage: number
}

export function TasksAndResourceTab() {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<TaskWithResource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])

  useEffect(() => {
    void fetchData()
    void fetchProjects()
    void fetchUsers()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const params = new URLSearchParams()
      
      if (projectFilter !== 'all') params.append('project_id', projectFilter)
      if (userFilter !== 'all') params.append('user_id', userFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const response = await fetch(
        getApiUrl(`/resource-capacity/tasks?${params.toString()}`),
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      if (response.ok) {
        const data = await response.json()
        setTasks(data.data || [])
      } else {
        toast.error('Failed to load tasks')
      }
    } catch (error) {
      console.error('[TASKS] Failed to fetch tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(getApiUrl('/projects'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setProjects(data.data || [])
      }
    } catch (error) {
      console.error('[TASKS] Failed to fetch projects:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(getApiUrl('/users'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        const usersList = Array.isArray(data.users) ? data.users : 
                          Array.isArray(data.data) ? data.data : 
                          Array.isArray(data) ? data : []
        setUsers(usersList)
      }
    } catch (error) {
      console.error('[TASKS] Failed to fetch users:', error)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [projectFilter, statusFilter, userFilter])

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300'
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'on-hold': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === '' || 
      task.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.taskNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  // Group tasks by project
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const key = task.projectId
    if (!acc[key]) {
      acc[key] = {
        projectId: task.projectId,
        projectName: task.projectName,
        tasks: []
      }
    }
    acc[key].tasks.push(task)
    return acc
  }, {} as Record<string, { projectId: string; projectName: string; tasks: TaskWithResource[] }>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks, projects, or resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      {Object.keys(groupedTasks).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tasks with resource assignments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedTasks).map(group => (
            <Card key={group.projectId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {group.projectName}
                  <Badge variant="outline" className="ml-auto">
                    {group.tasks.length} assignment{group.tasks.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {group.tasks.map((task) => (
                    <div
                      key={`${task.taskId}-${task.assignmentId}`}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{task.taskNumber}: {task.taskName}</span>
                            <Badge className={getStatusColor(task.taskStatus)}>
                              {task.taskStatus}
                            </Badge>
                            {task.percentComplete > 0 && (
                              <Badge variant="outline">
                                {task.percentComplete}% Complete
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {task.userName} {task.roleName && `(${task.roleName})`}
                            </span>
                            {task.scheduledStartDate && task.scheduledEndDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(task.scheduledStartDate).toLocaleDateString()} - {new Date(task.scheduledEndDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className={getStatusColor(task.assignmentStatus)}>
                          {task.assignmentStatus}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Planned Hours</span>
                          <div className="font-medium flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {Number(task.plannedHours || 0).toFixed(1)}h
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Actual Hours</span>
                          <div className="font-medium flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {Number(task.actualHours || 0).toFixed(1)}h
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Allocation</span>
                          <div className="font-medium">
                            {Number(task.allocationPercentage || 0).toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Variance</span>
                          <div className={`font-medium flex items-center gap-1 ${
                            Number(task.actualHours || 0) > Number(task.plannedHours || 0)
                              ? 'text-red-600'
                              : Number(task.actualHours || 0) < Number(task.plannedHours || 0)
                              ? 'text-green-600'
                              : ''
                          }`}>
                            {Number(task.actualHours || 0) - Number(task.plannedHours || 0) > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingUp className="h-4 w-4 rotate-180" />
                            )}
                            {Math.abs(Number(task.actualHours || 0) - Number(task.plannedHours || 0)).toFixed(1)}h
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}




