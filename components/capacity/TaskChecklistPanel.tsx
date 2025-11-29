"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Loader2, Plus, MoreVertical, Trash2, Clock, User, 
  GripVertical, AlertCircle, CheckCircle2, Calendar
} from '@/components/ui/icons-shim'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/api-url'

interface ChecklistItem {
  id: string
  taskId: string
  itemName: string
  description?: string
  sequenceOrder: number
  assignedUserId?: string
  assignedUserName?: string
  assignedUserDisplayName?: string
  assignedRoleId?: string
  assignedRoleName?: string
  estimatedHours?: number
  actualHours?: number
  isCompleted: boolean
  isBlocked: boolean
  blockedReason?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category?: string
  dueDate?: string
  completedAt?: Date
  completedBy?: string
}

interface TaskChecklistPanelProps {
  taskId: string
  taskName?: string
  users?: { id: string; name: string }[]
  onUpdate?: () => void
}

export function TaskChecklistPanel({ taskId, taskName, users = [], onUpdate }: TaskChecklistPanelProps) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingItem, setEditingItem] = useState<string | null>(null)

  useEffect(() => {
    void fetchItems()
  }, [taskId])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/resource-capacity/tasks/${taskId}/checklist`),
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (response.ok) {
        const data = await response.json()
        setItems(data.data || [])
      }
    } catch (error) {
      console.error('[CHECKLIST] Failed to fetch items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim()) return

    try {
      setAdding(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/resource-capacity/tasks/${taskId}/checklist`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskId,
            itemName: newItemName.trim(),
            sequenceOrder: items.length,
            priority: 'medium'
          })
        }
      )

      if (response.ok) {
        const data = await response.json()
        setItems(prev => [...prev, data.data])
        setNewItemName('')
        onUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to add item')
      }
    } catch (error) {
      toast.error('Failed to add checklist item')
    } finally {
      setAdding(false)
    }
  }

  const handleToggleItem = async (itemId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/resource-capacity/checklist/${itemId}/toggle`),
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, ...data.data } : item
        ))
        onUpdate?.()
      }
    } catch (error) {
      toast.error('Failed to update item')
    }
  }

  const handleUpdateItem = async (itemId: string, updates: Partial<ChecklistItem>) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/resource-capacity/checklist/${itemId}`),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        }
      )

      if (response.ok) {
        const data = await response.json()
        setItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, ...data.data } : item
        ))
        setEditingItem(null)
        onUpdate?.()
      }
    } catch (error) {
      toast.error('Failed to update item')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/resource-capacity/checklist/${itemId}`),
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== itemId))
        toast.success('Item deleted')
        onUpdate?.()
      }
    } catch (error) {
      toast.error('Failed to delete item')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const completedCount = items.filter(i => i.isCompleted).length
  const totalEstimatedHours = items.reduce((sum, i) => sum + (Number(i.estimatedHours) || 0), 0)
  const totalActualHours = items.reduce((sum, i) => sum + (Number(i.actualHours) || 0), 0)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Checklist
            <Badge variant="secondary">
              {completedCount}/{items.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {totalEstimatedHours > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Est: {totalEstimatedHours}h
              </span>
            )}
            {totalActualHours > 0 && (
              <span>Actual: {totalActualHours}h</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Items List */}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No checklist items yet
          </p>
        ) : (
          <div className="space-y-2">
            {items.sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((item) => (
              <div 
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  item.isCompleted ? 'bg-muted/50' : item.isBlocked ? 'bg-red-50 border-red-200' : ''
                }`}
              >
                {/* Drag Handle */}
                <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-grab mt-0.5" />
                
                {/* Checkbox */}
                <Checkbox
                  checked={item.isCompleted}
                  onCheckedChange={() => handleToggleItem(item.id)}
                  disabled={item.isBlocked}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={`text-sm ${item.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {item.itemName}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      )}
                      
                      {/* Meta info */}
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        <Badge className={`${getPriorityColor(item.priority)} text-xs`}>
                          {item.priority}
                        </Badge>
                        
                        {(item.assignedUserName || item.assignedUserDisplayName) && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {item.assignedUserDisplayName || item.assignedUserName}
                          </span>
                        )}
                        
                        {item.estimatedHours && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {item.estimatedHours}h
                          </span>
                        )}
                        
                        {item.dueDate && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        
                        {item.isBlocked && (
                          <span className="flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            Blocked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingItem(item.id)}>
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Select
                            value={item.assignedUserId || 'unassigned'}
                            onValueChange={(value) => handleUpdateItem(item.id, { 
                              assignedUserId: value === 'unassigned' ? undefined : value 
                            })}
                          >
                            <SelectTrigger className="h-8 border-0 shadow-none p-0">
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleUpdateItem(item.id, { isBlocked: !item.isBlocked })}
                        >
                          {item.isBlocked ? 'Unblock' : 'Mark as Blocked'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Inline Edit (when editing) */}
                  {editingItem === item.id && (
                    <div className="mt-3 p-3 bg-muted rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Estimated Hours</label>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            defaultValue={item.estimatedHours || ''}
                            onBlur={(e) => {
                              const value = e.target.value ? Number(e.target.value) : undefined
                              if (value !== item.estimatedHours) {
                                handleUpdateItem(item.id, { estimatedHours: value })
                              }
                            }}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Actual Hours</label>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            defaultValue={item.actualHours || ''}
                            onBlur={(e) => {
                              const value = e.target.value ? Number(e.target.value) : undefined
                              if (value !== item.actualHours) {
                                handleUpdateItem(item.id, { actualHours: value })
                              }
                            }}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Priority</label>
                          <Select
                            defaultValue={item.priority}
                            onValueChange={(value) => handleUpdateItem(item.id, { 
                              priority: value as ChecklistItem['priority'] 
                            })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Due Date</label>
                          <Input
                            type="date"
                            defaultValue={item.dueDate?.split('T')[0] || ''}
                            onBlur={(e) => {
                              if (e.target.value !== item.dueDate?.split('T')[0]) {
                                handleUpdateItem(item.id, { dueDate: e.target.value || undefined })
                              }
                            }}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setEditingItem(null)}
                      >
                        Done
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Item */}
        <div className="flex items-center gap-2 pt-2">
          <Input
            placeholder="Add a checklist item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddItem()
              }
            }}
            disabled={adding}
          />
          <Button onClick={handleAddItem} disabled={adding || !newItemName.trim()}>
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

