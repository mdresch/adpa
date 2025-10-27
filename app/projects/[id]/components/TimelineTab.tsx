"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Clock, 
  Activity, 
  Calendar, 
  CheckCircle, 
  BarChart3, 
  RefreshCw, 
  Target, 
  TrendingUp, 
  FileText 
} from "lucide-react"
import { Project } from "@/lib/api"

interface Document {
  id: string
  title: string
  type: string
  status?: string
  [key: string]: any
}

interface TimelineTabProps {
  project: Project
  documents: Document[]
  progress: number
}

export function TimelineTab({ project, documents, progress }: TimelineTabProps) {
  return (
    <div className="space-y-4">
      {/* Timeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">
                  {project.start_date && project.end_date
                    ? `${Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} mo`
                    : 'N/A'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Days Elapsed</p>
                <p className="text-2xl font-bold">
                  {project.start_date
                    ? Math.ceil((Date.now() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))
                    : 'N/A'}
                </p>
              </div>
              <Activity className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Days Remaining</p>
                <p className="text-2xl font-bold">
                  {project.end_date
                    ? Math.max(0, Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    : 'N/A'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className="mt-1" variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status?.toUpperCase()}
                </Badge>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Phases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Project Phases
          </CardTitle>
          <CardDescription>Key project lifecycle stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { phase: 'Initiation', status: 'completed', progress: 100, color: 'emerald' },
              { phase: 'Planning', status: progress >= 25 ? 'completed' : 'in-progress', progress: Math.min(progress * 4, 100), color: 'blue' },
              { phase: 'Execution', status: progress >= 50 ? 'in-progress' : 'pending', progress: Math.max(0, (progress - 25) * 4), color: 'purple' },
              { phase: 'Monitoring & Control', status: progress >= 75 ? 'in-progress' : 'pending', progress: Math.max(0, (progress - 50) * 2), color: 'orange' },
              { phase: 'Closure', status: progress >= 95 ? 'in-progress' : 'pending', progress: Math.max(0, (progress - 90) * 10), color: 'red' },
            ].map((phaseData, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      phaseData.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/20' :
                      phaseData.status === 'in-progress' ? 'bg-blue-100 dark:bg-blue-900/20' :
                      'bg-gray-100 dark:bg-gray-900/20'
                    }`}>
                      {phaseData.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : phaseData.status === 'in-progress' ? (
                        <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{phaseData.phase}</p>
                      <p className="text-xs text-muted-foreground">
                        {phaseData.status === 'completed' ? 'Completed' : 
                         phaseData.status === 'in-progress' ? 'In Progress' : 
                         'Not Started'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    phaseData.status === 'completed' ? 'default' :
                    phaseData.status === 'in-progress' ? 'secondary' :
                    'outline'
                  }>
                    {Math.round(phaseData.progress)}%
                  </Badge>
                </div>
                <Progress value={phaseData.progress} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Key Milestones
            </CardTitle>
            <CardDescription>Important project checkpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.start_date && (
                <div className="flex items-start gap-4 p-3 rounded-lg border bg-muted/30">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold">Project Kickoff</p>
                      <Badge variant="default">Complete</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(project.start_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-4 p-3 rounded-lg border bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold">Current Phase</p>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">{project.status || 'In Progress'}</p>
                </div>
              </div>

              {documents.filter(d => d.status === 'published').length > 0 && (
                <div className="flex items-start gap-4 p-3 rounded-lg border bg-muted/30">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold">Documentation Milestone</p>
                      <Badge variant="default">Complete</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {documents.filter(d => d.status === 'published').length} document(s) published
                    </p>
                  </div>
                </div>
              )}
              
              {project.end_date && (
                <div className="flex items-start gap-4 p-3 rounded-lg border bg-muted/30">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold">Project Completion</p>
                      <Badge variant="outline">Scheduled</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(project.end_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Project Timeline
            </CardTitle>
            <CardDescription>Visual project timeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline Bar */}
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-white drop-shadow-md">
                    {progress}% Complete
                  </span>
                </div>
              </div>

              {/* Timeline Labels */}
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  {project.start_date 
                    ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : 'Start'}
                </span>
                <span>
                  {project.end_date 
                    ? new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : 'End'}
                </span>
              </div>

              {/* Key Dates */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Project Start</span>
                  <span className="text-sm text-muted-foreground">
                    {project.start_date 
                      ? new Date(project.start_date).toLocaleDateString()
                      : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Today</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Target End</span>
                  <span className="text-sm text-muted-foreground">
                    {project.end_date 
                      ? new Date(project.end_date).toLocaleDateString()
                      : 'Not set'}
                  </span>
                </div>
                
                {project.start_date && project.end_date && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10">
                    <span className="text-sm font-medium">Time Remaining</span>
                    <span className="text-sm font-semibold text-primary">
                      {Math.max(0, Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

