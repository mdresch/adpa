"use client"

/**
 * Prioritization Criteria Management Page
 * Admin interface for managing prioritization criteria
 */

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/lib/notify'
import { apiClient } from '@/lib/api'
import {
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  TriangleAlert
} from 'lucide-react'

interface Criterion {
  id: string
  name: string
  weight: number | string
  description?: string
  scale_min: number
  scale_max: number
  is_inverted: boolean
  sort_order?: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function PrioritizationCriteriaPage() {
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null)
  const [deletingCriterion, setDeletingCriterion] = useState<Criterion | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    weight: 0,
    description: '',
    scale_min: 1,
    scale_max: 5,
    is_inverted: false,
    sort_order: 0,
    is_active: true
  })

  useEffect(() => {
    void fetchCriteria()
  }, [])

  const fetchCriteria = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<{
        success: boolean
        data: Criterion[]
      }>('/prioritization/criteria')

      if (response.success && response.data) {
        const sorted = [...response.data].sort(
          (a, b) => (a.sort_order || 999) - (b.sort_order || 999)
        )
        setCriteria(sorted)
      }
    } catch (error) {
      console.error('Failed to fetch criteria:', error)
      toast.error('Failed to load criteria')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (criterion?: Criterion) => {
    if (criterion) {
      setEditingCriterion(criterion)
      setFormData({
        name: criterion.name,
        weight: criterion.weight,
        description: criterion.description || '',
        scale_min: criterion.scale_min,
        scale_max: criterion.scale_max,
        is_inverted: criterion.is_inverted,
        sort_order: criterion.sort_order || 0,
        is_active: criterion.is_active
      })
    } else {
      setEditingCriterion(null)
      setFormData({
        name: '',
        weight: 0,
        description: '',
        scale_min: 1,
        scale_max: 5,
        is_inverted: false,
        sort_order: criteria.length + 1,
        is_active: true
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingCriterion(null)
    setFormData({
      name: '',
      weight: 0,
      description: '',
      scale_min: 1,
      scale_max: 5,
      is_inverted: false,
      sort_order: 0,
      is_active: true
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      if (editingCriterion) {
        // Update
        await apiClient.put(`/prioritization/criteria/${editingCriterion.id}`, formData)
        toast.success('Criterion updated successfully')
      } else {
        // Create
        await apiClient.post('/prioritization/criteria', formData)
        toast.success('Criterion created successfully')
      }

      handleCloseDialog()
      void fetchCriteria()
    } catch (error: any) {
      console.error('Failed to save criterion:', error)
      toast.error(error.message || 'Failed to save criterion')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCriterion) return

    try {
      await apiClient.delete(`/prioritization/criteria/${deletingCriterion.id}`)
      toast.success('Criterion deleted successfully')
      setDeletingCriterion(null)
      void fetchCriteria()
    } catch (error: any) {
      console.error('Failed to delete criterion:', error)
      toast.error(error.message || 'Failed to delete criterion')
    }
  }

  const handleToggleActive = async (criterion: Criterion) => {
    try {
      await apiClient.put(`/prioritization/criteria/${criterion.id}`, {
        is_active: !criterion.is_active
      })
      toast.success(`Criterion ${!criterion.is_active ? 'activated' : 'deactivated'}`)
      void fetchCriteria()
    } catch (error) {
      console.error('Failed to toggle criterion:', error)
      toast.error('Failed to update criterion')
    }
  }

  const calculateTotalWeight = () => {
    return criteria
      .filter(c => c.is_active)
      .reduce((sum, c) => {
        const w = typeof c.weight === 'number' ? c.weight : Number(c.weight)
        return sum + (Number.isFinite(w) ? w : 0)
      }, 0)
  }

  const totalWeight = calculateTotalWeight()
  const weightWarning = Math.abs(totalWeight - 100) > 0.0001

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <Skeleton className="h-96 w-full" />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Prioritization Criteria</h1>
                <p className="text-muted-foreground">
                  Manage criteria used for project prioritization scoring
                </p>
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Criterion
              </Button>
            </div>

            {/* Weight Warning */}
            {weightWarning && (
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <TriangleAlert className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-900">
                        Total weight is {totalWeight.toFixed(2)}% (should be 100%)
                      </p>
                      <p className="text-sm text-yellow-700">
                        Adjust criterion weights so they sum to exactly 100%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Criteria Table */}
            <Card>
              <CardHeader>
                <CardTitle>Criteria List</CardTitle>
                <CardDescription>
                  {criteria.length} criteria defined ({criteria.filter(c => c.is_active).length} active)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Order</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-center">Weight</TableHead>
                        <TableHead className="text-center">Scale</TableHead>
                        <TableHead className="text-center">Type</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {criteria.map((criterion) => (
                        <TableRow key={criterion.id}>
                          <TableCell className="font-medium">
                            {criterion.sort_order || '-'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{criterion.name}</div>
                              {criterion.description && (
                                <div className="text-sm text-muted-foreground">
                                  {criterion.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{criterion.weight}%</Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {criterion.scale_min}-{criterion.scale_max}
                          </TableCell>
                          <TableCell className="text-center">
                            {criterion.is_inverted && (
                              <Badge variant="secondary">Inverted</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={criterion.is_active}
                              onCheckedChange={() => handleToggleActive(criterion)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(criterion)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingCriterion(criterion)}
                                disabled={criterion.is_active && criteria.filter(c => c.is_active).length <= 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCriterion ? 'Edit Criterion' : 'Create New Criterion'}
                  </DialogTitle>
                  <DialogDescription>
                    Define a criterion for project prioritization scoring
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Strategic Alignment"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weight">Weight (%) *</Label>
                      <Input
                        id="weight"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) =>
                          setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="sort_order">Sort Order</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) =>
                          setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this criterion measures..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="scale_min">Min Score</Label>
                      <Input
                        id="scale_min"
                        type="number"
                        min="1"
                        value={formData.scale_min}
                        onChange={(e) =>
                          setFormData({ ...formData, scale_min: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="scale_max">Max Score</Label>
                      <Input
                        id="scale_max"
                        type="number"
                        min={formData.scale_min}
                        value={formData.scale_max}
                        onChange={(e) =>
                          setFormData({ ...formData, scale_max: parseInt(e.target.value) || 5 })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_inverted"
                      checked={formData.is_inverted}
                      onCheckedChange={(checked: boolean) =>
                        setFormData({ ...formData, is_inverted: checked })
                      }
                    />
                    <Label htmlFor="is_inverted" className="cursor-pointer">
                      Inverted scoring (lower scores are better)
                    </Label>
                  </div>

                  {!editingCriterion && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked: boolean) =>
                          setFormData({ ...formData, is_active: checked })
                        }
                      />
                      <Label htmlFor="is_active" className="cursor-pointer">
                        Active (include in scoring)
                      </Label>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog} disabled={saving}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving || !formData.name || formData.weight <= 0}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : editingCriterion ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingCriterion} onOpenChange={() => setDeletingCriterion(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Criterion?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{deletingCriterion?.name}"? This action cannot be undone.
                    {deletingCriterion && criteria.some(c => c.id === deletingCriterion.id && c.is_active) && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                        This criterion is currently active. Deleting it may affect project rankings.
                      </div>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeletingCriterion(null)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  )
}


