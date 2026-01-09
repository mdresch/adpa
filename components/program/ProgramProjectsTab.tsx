"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProjectSearchDialog, SearchableItem } from '@/components/ui/search-dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import { getApiUrl } from '@/lib/api-url'
import { 
  Plus, 
  Loader2, 
  FolderOpen,
  Calendar,
  DollarSign,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  FileText,
  Shield,
  User,
  Award
} from '@/components/ui/icons-shim'

interface Project {
  id: string
  name: string
  description: string
  status: string
  framework?: string
  priority?: string
  budget?: number
  start_date?: string
  end_date?: string
  owner_name?: string
  program_id?: string
  document_count?: number | string
  document_quality_score?: number | string | null
  documents_under_review?: number | string
  documents_reviewed?: number | string
  last_review_date?: string
  last_review_completed_date?: string
  // Quality Metrics
  avg_completeness?: number | string | null
  avg_structure_score?: number | string | null
  avg_formatting_score?: number | string | null
  avg_content_depth?: number | string | null
  avg_accuracy?: number | string | null
  avg_consistency?: number | string | null
  avg_context_relevance?: number | string | null
  avg_professional_quality?: number | string | null
  // Compliance Metrics
  avg_standards_compliance?: number | string | null
  // Content Metrics
  total_word_count?: number | string
  total_character_count?: number | string
  total_sentence_count?: number | string
  total_paragraph_count?: number | string
  avg_words_per_document?: number | string
  avg_words_per_sentence?: number | string
}

interface ProgramProjectsTabProps {
  programId: string
}

export function ProgramProjectsTab({ programId }: ProgramProjectsTabProps) {
  const router = useRouter()
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [projectSearchOpen, setProjectSearchOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<SearchableItem | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  
  // Create project form state
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    framework: '',
    priority: 'medium',
    start_date: '',
    end_date: '',
    budget: '',
  })

  useEffect(() => {
    void fetchProgramProjects()
    void fetchAllProjects()
  }, [programId])

  const fetchProgramProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch(getApiUrl(`/programs/${programId}/projects`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch program projects')
      }
      
      const data = await response.json()
      setAssignedProjects(data.data || [])
    } catch (error) {
      console.error('Failed to fetch program projects:', error)
      toast.error('Failed to load program projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllProjects = async () => {
    try {
      // Request all projects with high limit (no pagination for dropdown)
      const response = await fetch(getApiUrl(`/projects?limit=1000`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      
      const data = await response.json()
      setAllProjects(data.projects || [])
    } catch (error) {
      console.error('Failed to fetch all projects:', error)
    }
  }

  const handleProjectSelect = (project: SearchableItem) => {
    setSelectedProjectId(project.id)
    setSelectedProject(project)
    setProjectSearchOpen(false)
  }

  const handleAssignProject = async () => {
    if (!selectedProjectId) return
    
    try {
      setAssigning(true)
      
      const response = await fetch(getApiUrl(`/programs/${programId}/add-project`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ projectId: selectedProjectId })
      })
      
      if (!response.ok) {
        throw new Error('Failed to assign project')
      }
      
      toast.success('Project assigned to program successfully')
      setAssignDialogOpen(false)
      setSelectedProjectId('')
      setSelectedProject(null)
      fetchProgramProjects()
      fetchAllProjects() // Refresh to update available projects
      
    } catch (error) {
      console.error('Failed to assign project:', error)
      toast.error('Failed to assign project to program')
    } finally {
      setAssigning(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProject.name || !newProject.framework) {
      toast.error('Please fill in required fields (Name and Framework)')
      return
    }

    // Validate dates if provided
    if (newProject.start_date && newProject.end_date) {
      const startDate = new Date(newProject.start_date)
      const endDate = new Date(newProject.end_date)
      if (endDate <= startDate) {
        toast.error('End date must be after start date')
        return
      }
    }

    // Validate budget if provided
    if (newProject.budget && isNaN(parseFloat(newProject.budget))) {
      toast.error('Please enter a valid budget amount')
      return
    }

    try {
      setCreating(true)
      
      const projectData = {
        name: newProject.name,
        description: newProject.description || undefined,
        framework: newProject.framework,
        priority: newProject.priority,
        start_date: newProject.start_date || undefined,
        end_date: newProject.end_date || undefined,
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
        program_id: programId, // Automatically assign to this program
      }
      
      const createdProject = await apiClient.createProject(projectData)
      
      toast.success('Project created and assigned to program successfully!')
      setCreateDialogOpen(false)
      setNewProject({
        name: '',
        description: '',
        framework: '',
        priority: 'medium',
        start_date: '',
        end_date: '',
        budget: '',
      })
      
      // Refresh projects list
      await fetchProgramProjects()
      await fetchAllProjects()
      
      // Navigate to the newly created project
      if (createdProject?.id) {
        router.push(`/projects/${createdProject.id}`)
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      toast.error('Failed to create project. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleRemoveProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Remove "${projectName}" from this program?`)) return
    
    try {
      setRemoving(projectId)
      
      const response = await fetch(getApiUrl(`/programs/${programId}/remove-project/${projectId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove project')
      }
      
      toast.success('Project removed from program')
      fetchProgramProjects()
      fetchAllProjects()
      
    } catch (error) {
      console.error('Failed to remove project:', error)
      toast.error('Failed to remove project from program')
    } finally {
      setRemoving(null)
    }
  }

  // Get unassigned projects
  const unassignedProjects = allProjects.filter(p => !p.program_id)

  // Get status configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/20', label: 'Completed' }
      case 'active':
        return { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20', label: 'Active' }
      case 'at_risk':
        return { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/20', label: 'At Risk' }
      case 'on_hold':
        return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/20', label: 'On Hold' }
      default:
        return { icon: FolderOpen, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/20', label: status }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Assign Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Program Projects</CardTitle>
              <CardDescription className="mt-1.5">
                {assignedProjects.length} projects assigned to this program
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Project
              </Button>
              <Button onClick={() => setAssignDialogOpen(true)} disabled={unassignedProjects.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Project
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Projects List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3">Loading projects...</span>
        </div>
      ) : assignedProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {assignedProjects.map((project) => {
            const statusConfig = getStatusConfig(project.status)
            const StatusIcon = statusConfig.icon
            
            // Quality score configuration
            const getQualityConfig = (score: number | string | null | undefined) => {
              if (score === null || score === undefined || score === '') {
                return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', value: 0 }
              }
              const numericScore = typeof score === 'string' ? parseFloat(score) : score
              if (isNaN(numericScore)) {
                return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', value: 0 }
              }
              const normalizedScore = Math.min(100, Math.max(0, numericScore))
              if (normalizedScore >= 85) {
                return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20', value: normalizedScore }
              } else if (normalizedScore >= 70) {
                return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20', value: normalizedScore }
              } else if (normalizedScore >= 55) {
                return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20', value: normalizedScore }
              } else {
                return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20', value: normalizedScore }
              }
            }
            
            const qualityConfig = getQualityConfig(project.document_quality_score)
            const docCount = typeof project.document_count === 'string' ? parseInt(project.document_count) : project.document_count || 0
            const underReview = typeof project.documents_under_review === 'string' ? parseInt(project.documents_under_review) : project.documents_under_review || 0
            const reviewed = typeof project.documents_reviewed === 'string' ? parseInt(project.documents_reviewed) : project.documents_reviewed || 0
            
            const getBorderColor = () => {
              if (statusConfig.color.includes('green')) return '#22c55e'
              if (statusConfig.color.includes('blue')) return '#3b82f6'
              if (statusConfig.color.includes('red')) return '#ef4444'
              if (statusConfig.color.includes('yellow')) return '#eab308'
              return '#6b7280'
            }
            
            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow border-l-4" style={{ 
                borderLeftColor: getBorderColor()
              }}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <Link href={`/projects/${project.id}`} className="hover:underline">
                            <h3 className="text-lg font-semibold">{project.name}</h3>
                          </Link>
                          <Badge className={statusConfig.bg}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig.color}`} />
                            {statusConfig.label}
                          </Badge>
                          {project.framework && (
                            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                              <Award className="h-3 w-3 mr-1" />
                              {project.framework}
                            </Badge>
                          )}
                          {project.priority && (
                            <Badge variant="outline" className={
                              project.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
                              project.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                              'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300'
                            }>
                              {project.priority === 'high' ? '🔴 High' : project.priority === 'medium' ? '🟡 Medium' : '🟢 Low'} Priority
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {project.description || 'No description'}
                        </p>
                      </div>
                      
                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProject(project.id, project.name)}
                        disabled={removing === project.id}
                        className="ml-4 shrink-0"
                      >
                        {removing === project.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Quality & Compliance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Document Quality Section */}
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Quality Score
                            <span className="text-xs text-muted-foreground/70 ml-1" title="Overall document quality (completeness, structure, formatting, depth)">
                              (Overall)
                            </span>
                          </span>
                          <span className={`font-semibold ${qualityConfig.color}`}>
                            {qualityConfig.value > 0 ? `${Math.round(qualityConfig.value)}%` : '-'}
                          </span>
                        </div>
                        <Progress value={qualityConfig.value} className="h-2" />
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={`text-xs ${qualityConfig.bg} ${qualityConfig.color} border-0`}>
                            {qualityConfig.label}
                          </Badge>
                          {docCount > 0 && (
                            <span className="text-xs text-muted-foreground">{docCount} doc{docCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        {/* Quality Breakdown */}
                        {project.avg_completeness && (
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t text-xs">
                            <div>
                              <span className="text-muted-foreground">Completeness:</span>
                              <span className="ml-1 font-semibold">
                                {Math.round(typeof project.avg_completeness === 'string' ? parseFloat(project.avg_completeness) : project.avg_completeness || 0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Structure:</span>
                              <span className="ml-1 font-semibold">
                                {Math.round(typeof project.avg_structure_score === 'string' ? parseFloat(project.avg_structure_score) : project.avg_structure_score || 0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Formatting:</span>
                              <span className="ml-1 font-semibold">
                                {Math.round(typeof project.avg_formatting_score === 'string' ? parseFloat(project.avg_formatting_score) : project.avg_formatting_score || 0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Depth:</span>
                              <span className="ml-1 font-semibold">
                                {Math.round(typeof project.avg_content_depth === 'string' ? parseFloat(project.avg_content_depth) : project.avg_content_depth || 0)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Compliance Metrics */}
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            Compliance
                            <span className="text-xs text-muted-foreground/70 ml-1" title="Framework standards adherence (PMBOK/BABOK/DMBOK)">
                              (Standards)
                            </span>
                          </span>
                          {(() => {
                            // ONLY use standardsCompliance - do NOT mix with quality score
                            const compliance = typeof project.avg_standards_compliance === 'string' 
                              ? parseFloat(project.avg_standards_compliance) 
                              : project.avg_standards_compliance || null
                            
                            if (compliance !== null && !isNaN(compliance) && compliance > 0) {
                              return (
                                <span className={`font-semibold ${
                                  compliance >= 85 ? 'text-green-600' :
                                  compliance >= 70 ? 'text-blue-600' :
                                  compliance >= 55 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {Math.round(compliance)}%
                                </span>
                              )
                            }
                            return null
                          })()}
                        </div>
                        {(() => {
                          // ONLY use standardsCompliance - do NOT mix with quality score
                          // Handle both string and number types from database
                          let compliance: number | null = null
                          
                          if (project.avg_standards_compliance !== null && project.avg_standards_compliance !== undefined) {
                            if (typeof project.avg_standards_compliance === 'string') {
                              compliance = parseFloat(project.avg_standards_compliance)
                            } else if (typeof project.avg_standards_compliance === 'number') {
                              compliance = project.avg_standards_compliance
                            }
                          }
                          
                          // Debug logging (remove in production)
                          if (process.env.NODE_ENV === 'development') {
                            console.log('[Compliance Debug]', {
                              projectName: project.name,
                              rawValue: project.avg_standards_compliance,
                              parsedValue: compliance,
                              type: typeof project.avg_standards_compliance
                            })
                          }
                          
                          if (compliance !== null && !isNaN(compliance) && compliance > 0) {
                            return (
                              <>
                                <Progress value={compliance} className="h-2" />
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  {underReview > 0 && (
                                    <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {underReview} under review
                                    </span>
                                  )}
                                  {reviewed > 0 && (
                                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      {reviewed} reviewed
                                    </span>
                                  )}
                                </div>
                              </>
                            )
                          }
                          return (
                            <div className="text-xs text-muted-foreground">
                              No compliance data available
                              <span className="block text-xs text-muted-foreground/70 mt-1">
                                Standards compliance metrics not yet calculated
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Content Metrics */}
                    {(() => {
                      const wordCount = typeof project.total_word_count === 'string' ? parseInt(project.total_word_count) : project.total_word_count || 0
                      const charCount = typeof project.total_character_count === 'string' ? parseInt(project.total_character_count) : project.total_character_count || 0
                      const sentenceCount = typeof project.total_sentence_count === 'string' ? parseInt(project.total_sentence_count) : project.total_sentence_count || 0
                      const paragraphCount = typeof project.total_paragraph_count === 'string' ? parseInt(project.total_paragraph_count) : project.total_paragraph_count || 0
                      return wordCount > 0 || charCount > 0 || sentenceCount > 0 || paragraphCount > 0
                    })() && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Content Metrics</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-blue-700 dark:text-blue-300">Word Count:</span>
                            <span className="ml-1 font-semibold text-blue-900 dark:text-blue-100">
                              {typeof project.total_word_count === 'string' ? parseInt(project.total_word_count).toLocaleString() : project.total_word_count?.toLocaleString() || '0'}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-700 dark:text-blue-300">Characters:</span>
                            <span className="ml-1 font-semibold text-blue-900 dark:text-blue-100">
                              {typeof project.total_character_count === 'string' ? parseInt(project.total_character_count).toLocaleString() : project.total_character_count?.toLocaleString() || '0'}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-700 dark:text-blue-300">Sentences:</span>
                            <span className="ml-1 font-semibold text-blue-900 dark:text-blue-100">
                              {typeof project.total_sentence_count === 'string' ? parseInt(project.total_sentence_count).toLocaleString() : project.total_sentence_count?.toLocaleString() || '0'}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-700 dark:text-blue-300">Paragraphs:</span>
                            <span className="ml-1 font-semibold text-blue-900 dark:text-blue-100">
                              {typeof project.total_paragraph_count === 'string' ? parseInt(project.total_paragraph_count).toLocaleString() : project.total_paragraph_count?.toLocaleString() || '0'}
                            </span>
                          </div>
                          {project.avg_words_per_sentence && (typeof project.avg_words_per_sentence === 'string' ? parseFloat(project.avg_words_per_sentence) : project.avg_words_per_sentence) > 0 && (
                            <div>
                              <span className="text-blue-700 dark:text-blue-300">Avg Words/Sentence:</span>
                              <span className="ml-1 font-semibold text-blue-900 dark:text-blue-100">
                                {((typeof project.avg_words_per_sentence === 'string' ? parseFloat(project.avg_words_per_sentence) : project.avg_words_per_sentence || 0)).toFixed(1)}
                              </span>
                            </div>
                          )}
                          {project.total_word_count && (() => {
                            const wordCount = typeof project.total_word_count === 'string' ? parseInt(project.total_word_count) : project.total_word_count || 0
                            const readingTimeMinutes = Math.round(wordCount / 250)
                            const readingTimeHours = Math.round(readingTimeMinutes / 60 * 10) / 10
                            return (
                              <div>
                                <span className="text-blue-700 dark:text-blue-300">⏱️ Reading Time:</span>
                                <span className="ml-1 font-semibold text-blue-900 dark:text-blue-100">
                                  ~{readingTimeMinutes} min ({readingTimeHours} hours)
                                </span>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {/* Audit Review Status */}
                    {(project.last_review_date || project.last_review_completed_date) && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                        <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1 text-xs">
                          <div className="font-medium text-blue-900 dark:text-blue-100">Last Review</div>
                          <div className="text-blue-700 dark:text-blue-300">
                            {project.last_review_completed_date 
                              ? `Completed: ${new Date(project.last_review_completed_date).toLocaleDateString()}`
                              : project.last_review_date 
                              ? `Scheduled: ${new Date(project.last_review_date).toLocaleDateString()}`
                              : 'No review scheduled'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Project Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                      {project.budget && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">Budget</div>
                            <div className="text-sm font-semibold truncate">
                              ${typeof project.budget === 'number' ? project.budget.toLocaleString() : project.budget}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {project.start_date && project.end_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">Timeline</div>
                            <div className="text-sm font-semibold truncate">
                              {new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {project.owner_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">Owner</div>
                            <div className="text-sm font-semibold truncate">
                              {project.owner_name}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {docCount > 0 && (
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">Documents</div>
                            <div className="text-sm font-semibold">{docCount}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects Assigned</h3>
            <p className="text-muted-foreground mb-4">
              Assign projects to this program to start tracking program-level metrics
            </p>
            <Button onClick={() => setAssignDialogOpen(true)} disabled={unassignedProjects.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Assign First Project
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Assign Project Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Project to Program</DialogTitle>
            <DialogDescription>
              Select a project to assign to this program. Only projects not currently assigned to any program are shown.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Project</Label>
              <Button
                variant="outline"
                onClick={() => setProjectSearchOpen(true)}
                className="w-full justify-between mt-1.5"
              >
                {selectedProject ? (
                  <span>{selectedProject.name}</span>
                ) : (
                  <span className="text-muted-foreground">Search for a project to assign...</span>
                )}
                <Search className="h-4 w-4 ml-2" />
              </Button>
              
              {unassignedProjects.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  No unassigned projects available
                </p>
              )}
            </div>
            
            {selectedProject && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm">Selected Project Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold">{selectedProject.name}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {selectedProject.description || 'No description'}
                    </div>
                    {('budget' in selectedProject) && typeof selectedProject.budget === 'number' && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Budget: ${selectedProject.budget.toLocaleString()}</span>
                      </div>
                    )}
                    {('start_date' in selectedProject) && ('end_date' in selectedProject) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(selectedProject.start_date as string).toLocaleDateString()} - {new Date(selectedProject.end_date as string).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Project Search Dialog */}
          <ProjectSearchDialog
            open={projectSearchOpen}
            onOpenChange={setProjectSearchOpen}
            projects={unassignedProjects.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
              status: p.status,
              type: p.status,
              document_count: p.document_count,
              budget: p.budget,
              start_date: p.start_date,
              end_date: p.end_date
            }))}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleProjectSelect}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button onClick={handleAssignProject} disabled={!selectedProjectId || assigning}>
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project and automatically assign it to this program.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              {/* Name and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-project-name" className="text-sm font-semibold">
                    Project Name *
                  </Label>
                  <Input
                    id="create-project-name"
                    placeholder="Enter project name"
                    value={newProject.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, name: e.target.value })}
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-priority" className="text-sm font-semibold">
                    Priority
                  </Label>
                  <select
                    id="create-priority"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                    value={newProject.priority}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Framework */}
              <div>
                <Label htmlFor="create-framework" className="text-sm font-semibold">
                  Framework *
                </Label>
                <select
                  id="create-framework"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                  value={newProject.framework}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, framework: e.target.value })}
                  required
                >
                  <option value="">Select framework</option>
                  <option value="BABOK v3">BABOK v3</option>
                  <option value="PMBOK 7">PMBOK 7</option>
                  <option value="DMBOK 2.0">DMBOK 2.0</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="create-description" className="text-sm font-semibold">
                  Description
                </Label>
                <Textarea
                  id="create-description"
                  placeholder="Describe the project objectives and scope"
                  className="mt-2"
                  value={newProject.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Timeline and Budget */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="create-start-date" className="text-sm font-semibold">
                    Start Date
                  </Label>
                  <Input
                    id="create-start-date"
                    type="date"
                    className="mt-2"
                    value={newProject.start_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="create-end-date" className="text-sm font-semibold">
                    End Date
                  </Label>
                  <Input
                    id="create-end-date"
                    type="date"
                    className="mt-2"
                    value={newProject.end_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, end_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="create-budget" className="text-sm font-semibold">
                    Budget
                  </Label>
                  <Input
                    id="create-budget"
                    type="number"
                    placeholder="0"
                    className="mt-2"
                    value={newProject.budget}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, budget: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

