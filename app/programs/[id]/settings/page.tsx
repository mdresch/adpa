'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ArrowLeft, Save, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { apiClient } from '@/lib/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Program {
  id: string
  name: string
  description?: string
  status: 'green' | 'amber' | 'red'
  owner_id?: string
  owner_name?: string
  budget?: number
  currency_code?: string
  start_date?: string
  end_date?: string
  rag_status?: 'green' | 'amber' | 'red'
  created_at?: string
  updated_at?: string
}

export default function ProgramSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const programId = params?.id as string

  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'green' as 'green' | 'amber' | 'red',
    budget: '',
    currency_code: 'USD',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    if (programId) {
      void fetchProgram()
    }
  }, [programId])

  const fetchProgram = async () => {
    try {
      setLoading(true)
      // Use apiClient.getProgram() which handles the response format correctly
      const programData = await apiClient.getProgram(programId)
      
      if (!programData) {
        console.error('Program data is null or undefined')
        setProgram(null)
        toast.error('Program not found')
        return
      }
      
      setProgram(programData)
      
      // Populate form with existing data
      setFormData({
        name: programData.name || '',
        description: programData.description || '',
        status: programData.status || programData.rag_status || 'green',
        budget: programData.budget?.toString() || '',
        currency_code: programData.currency_code || programData.currency || 'USD',
        start_date: programData.start_date ? programData.start_date.split('T')[0] : '',
        end_date: programData.end_date ? programData.end_date.split('T')[0] : '',
      })
    } catch (error: any) {
      console.error('Failed to fetch program:', error)
      setProgram(null) // Explicitly set to null on error
      
      // Check if it's a 404 error
      if (error?.status === 404 || error?.response?.status === 404) {
        toast.error('Program not found')
      } else {
        toast.error('Failed to load program settings')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Program name is required')
      return
    }

    try {
      setSaving(true)

      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        currency: formData.currency_code, // Backend expects 'currency', not 'currency_code'
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      }

      // Use apiClient.updateProgram() which handles the response format correctly
      await apiClient.updateProgram(programId, updateData)

      toast.success('Program updated successfully')
      router.push(`/programs/${programId}`)
    } catch (error: any) {
      console.error('Failed to update program:', error)
      toast.error(error?.message || 'Failed to update program')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete program')
      }

      toast.success('Program deleted successfully')
      router.push('/programs')
    } catch (error) {
      console.error('Failed to delete program:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete program')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Program Not Found</h2>
              <Button onClick={() => router.push('/programs')}>Back to Programs</Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-8 max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => router.push(`/programs/${programId}`)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Program
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Program Settings</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Manage program details, budget, and configuration
              </p>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Update program name, description, and status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Program Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Program Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter program name"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter program description"
                      rows={4}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status">RAG Status</Label>
                    <Select value={formData.status} onValueChange={(value: 'green' | 'amber' | 'red') => setFormData({ ...formData, status: value })}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="green">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🟢</span>
                            <span>Green - On Track</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="amber">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🟡</span>
                            <span>Amber - At Risk</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="red">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🔴</span>
                            <span>Red - Critical</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Information</CardTitle>
                  <CardDescription>Set budget and financial parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Budget */}
                    <div className="space-y-2">
                      <Label htmlFor="budget">Total Budget</Label>
                      <Input
                        id="budget"
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>

                    {/* Currency */}
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={formData.currency_code} onValueChange={(value) => setFormData({ ...formData, currency_code: value })}>
                        <SelectTrigger id="currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                          <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Display Budget */}
                  {formData.budget && !isNaN(parseFloat(formData.budget)) && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Budget Preview</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formData.currency_code} {parseFloat(formData.budget).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                  <CardDescription>Set program start and end dates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Start Date */}
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        min={formData.start_date}
                      />
                    </div>
                  </div>

                  {/* Duration */}
                  {formData.start_date && formData.end_date && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Program Duration</p>
                      <p className="text-lg font-semibold text-foreground">
                        {Math.ceil(
                          (new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        days
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Program Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Program Information</CardTitle>
                  <CardDescription>Read-only program details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Program ID</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{programId}</code>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Owner</span>
                    <span className="text-sm font-medium">{program.owner_name || 'Unassigned'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm">
                      {program.created_at ? new Date(program.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last Updated</span>
                    <span className="text-sm">
                      {program.updated_at ? new Date(program.updated_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={deleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Program
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the program "<strong>{program.name}</strong>" and remove all
                          associations with projects. Projects themselves will not be deleted.
                          <br />
                          <br />
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {deleting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete Program'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/programs/${programId}`)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Validation Warning */}
              {formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date) && (
                <Card className="border-yellow-300 bg-yellow-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        End date cannot be before start date
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

