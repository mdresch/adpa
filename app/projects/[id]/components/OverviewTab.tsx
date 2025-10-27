"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Activity, 
  DollarSign, 
  Users, 
  FileText, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Target 
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { Project } from "@/lib/api"

interface Stakeholder {
  id: string
  engagement_approach: string
  [key: string]: any
}

interface DocumentStats {
  totalDocuments: number
  counts: {
    draft: number
    review: number
    published: number
    archived: number
  }
}

interface OverviewTabProps {
  project: Project
  progress: number
  managerName: string
  documentStats: DocumentStats
  stakeholders: Stakeholder[]
}

export function OverviewTab({ 
  project, 
  progress, 
  managerName, 
  documentStats, 
  stakeholders 
}: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress}%</div>
            <Progress value={progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground">Total allocated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manager</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{managerName || 'Not assigned'}</div>
            <p className="text-xs text-muted-foreground">Project manager</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.team_members?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Generated docs</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Document Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Document Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of document statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Draft', value: documentStats.counts.draft, fill: '#f97316' },
                    { name: 'Review', value: documentStats.counts.review, fill: '#a855f7' },
                    { name: 'Published', value: documentStats.counts.published, fill: '#10b981' },
                    { name: 'Archived', value: documentStats.counts.archived, fill: '#6b7280' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: { name: string; value: number }) => entry.value > 0 ? `${entry.name}: ${entry.value}` : ''}
                  outerRadius={80}
                  dataKey="value"
                >
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Project Health Indicators
            </CardTitle>
            <CardDescription>PMBOK-aligned project performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Documentation Completion Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Documentation Completion</span>
                <div className="text-right">
                  <Badge variant={documentStats.counts.published / Math.max(documentStats.totalDocuments, 1) >= 0.7 ? "default" : "secondary"}>
                    {documentStats.counts.published} / {documentStats.totalDocuments}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((documentStats.counts.published / Math.max(documentStats.totalDocuments, 1)) * 100)}% Complete
                  </p>
                </div>
              </div>
              <Progress value={(documentStats.counts.published / Math.max(documentStats.totalDocuments, 1)) * 100} className="h-2" />
            </div>
            
            {/* Document Quality (Draft vs Published ratio) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Document Quality Index</span>
                <div className="text-right">
                  <Badge variant={documentStats.counts.draft / Math.max(documentStats.totalDocuments, 1) <= 0.3 ? "default" : "secondary"}>
                    {documentStats.counts.draft} Draft
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(((documentStats.counts.published + documentStats.counts.review) / Math.max(documentStats.totalDocuments, 1)) * 100)}% Finalized
                  </p>
                </div>
              </div>
              <Progress value={((documentStats.counts.published + documentStats.counts.review) / Math.max(documentStats.totalDocuments, 1)) * 100} className="h-2" />
            </div>
            
            {/* Stakeholder Engagement */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Stakeholder Engagement</span>
                <div className="text-right">
                  <Badge variant={stakeholders.length >= 5 ? "default" : stakeholders.length >= 3 ? "secondary" : "destructive"}>
                    {stakeholders.length} Identified
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stakeholders.filter(s => s.engagement_approach === 'manage_closely').length} High Priority
                  </p>
                </div>
              </div>
              <Progress value={Math.min(stakeholders.length * 10, 100)} className="h-2" />
            </div>
            
            {/* Project Timeline Health */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Timeline Health</span>
                <div className="text-right">
                  <Badge variant={(() => {
                    if (!project.start_date || !project.end_date) return "secondary"
                    const now = new Date()
                    const start = new Date(project.start_date)
                    const end = new Date(project.end_date)
                    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                    const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                    const timeProgress = (elapsedDays / totalDays) * 100
                    const workProgress = progress
                    
                    if (workProgress >= timeProgress) return "default" // On track or ahead
                    if (workProgress >= timeProgress - 10) return "secondary" // Slightly behind
                    return "destructive" // Significantly behind
                  })()}>
                    {(() => {
                      if (!project.start_date || !project.end_date) return "Not Set"
                      const now = new Date()
                      const start = new Date(project.start_date)
                      const end = new Date(project.end_date)
                      const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                      const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                      const timeProgress = (elapsedDays / totalDays) * 100
                      const workProgress = progress
                      
                      if (workProgress >= timeProgress) return "On Schedule"
                      if (workProgress >= timeProgress - 10) return "At Risk"
                      return "Behind Schedule"
                    })()}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {project.start_date && project.end_date ? (() => {
                      const now = new Date()
                      const end = new Date(project.end_date)
                      const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                      return daysRemaining > 0 ? `${daysRemaining} days left` : `${Math.abs(daysRemaining)} days overdue`
                    })() : 'No timeline set'}
                  </p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Framework</p>
                <p className="text-sm font-semibold">{project.framework || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Priority</p>
                <Badge variant={project.priority === 'high' ? 'destructive' : project.priority === 'medium' ? 'secondary' : 'outline'}>
                  {project.priority?.toUpperCase() || 'MEDIUM'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status?.toUpperCase() || 'ACTIVE'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{new Date(project.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            {project.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <p className="text-sm">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.team_members && project.team_members.length > 0 ? (
              <div className="space-y-2">
                {project.team_members.map((member, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member}</p>
                      <p className="text-xs text-muted-foreground">Team Member</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No team members assigned</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

