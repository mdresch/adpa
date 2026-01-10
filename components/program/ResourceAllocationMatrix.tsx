"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Edit, Trash2, AlertTriangle } from '@/components/ui/icons-shim'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/api-url'

interface ResourceAllocation {
  id: string
  programId: string
  projectId?: string
  resourceId: string
  resourceName: string
  resourceType: string
  allocatedAmount: number
  allocationPercentage?: number
  allocationStart: string
  allocationEnd?: string
  allocationStatus: string
  hasConflicts?: boolean
  conflictProjects?: string[]
}

interface ResourceAllocationMatrixProps {
  programId: string
}

export function ResourceAllocationMatrix({ programId }: ResourceAllocationMatrixProps) {
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingAllocation, setEditingAllocation] = useState<ResourceAllocation | null>(null)
  const [formData, setFormData] = useState({
    resourceId: '',
    resourceName: '',
    resourceType: 'human',
    projectId: '',
    allocatedAmount: '',
    allocationPercentage: '',
    allocationStart: '',
    allocationEnd: '',
    allocationStatus: 'planned'
  })

  useEffect(() => {
    void fetchAllocations()
  }, [programId])

  const fetchAllocations = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/programs/${programId}/resources/allocations`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setAllocations(data.data || [])
      } else {
        toast.error('Failed to load resource allocations')
      }
    } catch (error) {
      console.error('[RESOURCES] Failed to fetch allocations:', error)
      toast.error('Failed to load resource allocations')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingAllocation(null)
    setFormData({
      resourceId: '',
      resourceName: '',
      resourceType: 'human',
      projectId: '',
      allocatedAmount: '',
      allocationPercentage: '',
      allocationStart: '',
      allocationEnd: '',
      allocationStatus: 'planned'
    })
    setShowDialog(true)
  }

  const handleEdit = (allocation: ResourceAllocation) => {
    setEditingAllocation(allocation)
    setFormData({
      resourceId: allocation.resourceId,
      resourceName: allocation.resourceName,
      resourceType: allocation.resourceType,
      projectId: allocation.projectId || '',
      allocatedAmount: allocation.allocatedAmount.toString(),
      allocationPercentage: allocation.allocationPercentage?.toString() || '',
      allocationStart: allocation.allocationStart.split('T')[0],
      allocationEnd: allocation.allocationEnd?.split('T')[0] || '',
      allocationStatus: allocation.allocationStatus
    })
    setShowDialog(true)
  }

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const payload = {
        resourceId: formData.resourceId,
        resourceName: formData.resourceName,
        resourceType: formData.resourceType,
        projectId: formData.projectId || undefined,
        allocatedAmount: parseFloat(formData.allocatedAmount),
        allocationPercentage: formData.allocationPercentage ? parseFloat(formData.allocationPercentage) : undefined,
        allocationStart: formData.allocationStart,
        allocationEnd: formData.allocationEnd || undefined,
        allocationStatus: formData.allocationStatus
      }

      if (editingAllocation) {
        // Update allocation status
        const response = await fetch(
          getApiUrl(`/programs/${programId}/resources/allocations/${editingAllocation.id}/status`),
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: formData.allocationStatus })
          }
        )

        if (response.ok) {
          toast.success('Allocation updated successfully')
          setShowDialog(false)
          void fetchAllocations()
        } else {
          const error = await response.json()
          toast.error(error.message || 'Failed to update allocation')
        }
      } else {
        // Create new allocation
        const response = await fetch(
          getApiUrl(`/programs/${programId}/resources/allocations`),
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          }
        )

        if (response.ok) {
          toast.success('Resource allocated successfully')
          setShowDialog(false)
          void fetchAllocations()
        } else {
          const error = await response.json()
          toast.error(error.message || 'Failed to allocate resource')
        }
      }
    } catch (error) {
      console.error('[RESOURCES] Failed to save allocation:', error)
      toast.error('Failed to save allocation')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      planned: 'bg-blue-100 text-blue-800 border-blue-300',
      active: 'bg-green-100 text-green-800 border-green-300',
      completed: 'bg-gray-100 text-gray-800 border-gray-300',
      released: 'bg-purple-100 text-purple-800 border-purple-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300'
    }
    return variants[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Resource Allocations</h3>
          <p className="text-sm text-muted-foreground">
            Manage resource assignments to projects within this program
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Allocate Resource
        </Button>
      </div>

      {allocations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No resource allocations yet</p>
            <Button onClick={handleCreate} variant="outline">
              Create First Allocation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allocations.map((allocation) => (
            <Card key={allocation.id} className={allocation.hasConflicts ? 'border-red-300 bg-red-50/50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{allocation.resourceName}</CardTitle>
                      {allocation.hasConflicts && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Conflict
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {allocation.resourceType} • {allocation.allocatedAmount} {allocation.allocationPercentage ? `(${allocation.allocationPercentage}%)` : ''}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadge(allocation.allocationStatus)}>
                      {allocation.allocationStatus}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(allocation)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Start Date</p>
                    <p className="font-medium">
                      {new Date(allocation.allocationStart).toLocaleDateString()}
                    </p>
                  </div>
                  {allocation.allocationEnd && (
                    <div>
                      <p className="text-muted-foreground">End Date</p>
                      <p className="font-medium">
                        {new Date(allocation.allocationEnd).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {allocation.projectId && (
                    <div>
                      <p className="text-muted-foreground">Project</p>
                      <p className="font-medium">Assigned</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAllocation ? 'Edit Allocation' : 'Allocate Resource'}
            </DialogTitle>
            <DialogDescription>
              {editingAllocation 
                ? 'Update the allocation status'
                : 'Assign a resource to a project within this program'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!editingAllocation && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="resourceId">Resource ID *</Label>
                      <Input
                        id="resourceId"
                        value={formData.resourceId}
                        onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
                        placeholder="user-uuid or resource-id"
                      />
                  </div>
                  <div>
                    <Label htmlFor="resourceName">Resource Name *</Label>
                    <Input
                      id="resourceName"
                      value={formData.resourceName}
                        onChange={(e) => setFormData({ ...formData, resourceName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="resourceType">Resource Type *</Label>
                    <Select
                      value={formData.resourceType}
                      onValueChange={(value: string) => setFormData({ ...formData, resourceType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="human">Human</SelectItem>
                        <SelectItem value="financial">Financial</SelectItem>
                        <SelectItem value="technological">Technological</SelectItem>
                        <SelectItem value="physical">Physical</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="projectId">Project ID (Optional)</Label>
                    <Input
                      id="projectId"
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      placeholder="project-uuid"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="allocatedAmount">Allocated Amount *</Label>
                    <Input
                      id="allocatedAmount"
                      type="number"
                      value={formData.allocatedAmount}
                      onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
                      placeholder="1.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="allocationPercentage">Allocation % (Optional)</Label>
                    <Input
                      id="allocationPercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.allocationPercentage}
                      onChange={(e) => setFormData({ ...formData, allocationPercentage: e.target.value })}
                      placeholder="50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="allocationStart">Start Date *</Label>
                    <Input
                      id="allocationStart"
                      type="date"
                      value={formData.allocationStart}
                      onChange={(e) => setFormData({ ...formData, allocationStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="allocationEnd">End Date (Optional)</Label>
                    <Input
                      id="allocationEnd"
                      type="date"
                      value={formData.allocationEnd}
                      onChange={(e) => setFormData({ ...formData, allocationEnd: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="allocationStatus">Status *</Label>
              <Select
                value={formData.allocationStatus}
                onValueChange={(value: string) => setFormData({ ...formData, allocationStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingAllocation ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

