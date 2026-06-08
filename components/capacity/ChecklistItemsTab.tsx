"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Loader2, Search, ClipboardList, Clock, User, Calendar,
  AlertCircle, CheckCircle2, XCircle, AlertTriangle
} from '@/components/ui/icons-shim'
import { assertSafePathSegment, fetchRelativeApi } from '@/lib/safe-http-path'
import { toast } from '@/lib/notify'

interface ChecklistItemWithResource {
  itemId: string
  itemName: string
  description?: string
  taskId: string
  taskName: string
  taskNumber: string
  projectId: string
  projectName: string
  userId: string
  userName: string
  roleId?: string
  roleName?: string
  estimatedHours?: number
  actualHours?: number
  isCompleted: boolean
  isBlocked: boolean
  priority: string
  category?: string
  dueDate?: string
  sequenceOrder: number
}

export function ChecklistItemsTab() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ChecklistItemWithResource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [completionFilter, setCompletionFilter] = useState<string>('all')
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
      
      if (projectFilter !== 'all') {
        params.append('project_id', assertSafePathSegment(projectFilter, 'projectId'))
      }
      if (userFilter !== 'all') {
        params.append('user_id', assertSafePathSegment(userFilter, 'userId'))
      }
      if (completionFilter === 'completed') params.append('is_completed', 'true')
      if (completionFilter === 'pending') params.append('is_completed', 'false')
      
      const query = params.toString()
      const path = query
        ? `/api/resource-capacity/checklist?${query}`
        : '/api/resource-capacity/checklist'
      const response = await fetchRelativeApi(path, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (response.ok) {
        const data = await response.json()
        setItems(data.data || [])
      } else {
        toast.error('Failed to load checklist items')
      }
    } catch (error) {
      console.error('[CHECKLIST] Failed to fetch items:', error)
      toast.error('Failed to load checklist items')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetchRelativeApi('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setProjects(data.data || [])
      }
    } catch (error) {
      console.error('[CHECKLIST] Failed to fetch projects:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetchRelativeApi('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        const usersList = Array.isArray(data.users) ? data.users : 
                          Array.isArray(data.data) ? data.data : 
                          Array.isArray(data) ? data : []
        setUsers(usersList)
      }
    } catch (error) {
      console.error('[CHECKLIST] Failed to fetch users:', error)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [projectFilter, userFilter, completionFilter])

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const toggleCompletion = async (itemId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('auth_token')
      const safeItemId = assertSafePathSegment(itemId, 'itemId')
      const response = await fetchRelativeApi(
        `/api/resource-capacity/checklist/${safeItemId}/toggle`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      if (response.ok) {
        await fetchData()
        toast.success(`Item marked as ${currentStatus ? 'pending' : 'completed'}`)
      } else {
        toast.error('Failed to update item')
      }
    } catch (error) {
      console.error('[CHECKLIST] Failed to toggle item:', error)
      toast.error('Failed to update item')
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.userName?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  // Group items by project
  const groupedItems = filteredItems.reduce((acc, item) => {
    const key = item.projectId
    if (!acc[key]) {
      acc[key] = {
        projectId: item.projectId,
        projectName: item.projectName,
        items: []
      }
    }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { projectId: string; projectName: string; items: ChecklistItemWithResource[] }>)

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
            placeholder="Search checklist items, tasks, or resources..."
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
        <Select value={completionFilter} onValueChange={setCompletionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Checklist Items List */}
      {Object.keys(groupedItems).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No checklist items with resource assignments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedItems).map(group => (
            <Card key={group.projectId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  {group.projectName}
                  <Badge variant="outline" className="ml-auto">
                    {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.items.map((item: any) => (
                    <div
                      key={item.itemId}
                      className={`border rounded-lg p-4 hover:bg-accent/50 transition-colors ${
                        item.isCompleted ? 'opacity-75' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={item.isCompleted}
                          onCheckedChange={() => toggleCompletion(item.itemId, item.isCompleted)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-medium ${item.isCompleted ? 'line-through' : ''}`}>
                                  {item.itemName}
                                </span>
                                <Badge className={getPriorityColor(item.priority)}>
                                  {item.priority}
                                </Badge>
                                {item.isBlocked && (
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Blocked
                                  </Badge>
                                )}
                                {item.category && (
                                  <Badge variant="outline">{item.category}</Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <ClipboardList className="h-4 w-4" />
                                  {item.taskNumber}: {item.taskName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  {item.userName} {item.roleName && `(${item.roleName})`}
                                </span>
                                {item.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Due: {new Date(item.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.isCompleted && (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Estimated Hours</span>
                              <div className="font-medium flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {Number(item.estimatedHours || 0).toFixed(1)}h
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Actual Hours</span>
                              <div className="font-medium flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {Number(item.actualHours || 0).toFixed(1)}h
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Variance</span>
                              <div className={`font-medium ${
                                Number(item.actualHours || 0) > Number(item.estimatedHours || 0)
                                  ? 'text-red-600'
                                  : Number(item.actualHours || 0) < Number(item.estimatedHours || 0)
                                  ? 'text-green-600'
                                  : ''
                              }`}>
                                {Math.abs(Number(item.actualHours || 0) - Number(item.estimatedHours || 0)).toFixed(1)}h
                              </div>
                            </div>
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







