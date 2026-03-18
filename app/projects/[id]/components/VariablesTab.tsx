"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Copy, Database, Lightbulb } from "lucide-react"
import { toast } from '@/lib/notify'
import { Project, ExtendedProject, Document, Stakeholder } from "@/lib/api"

interface VariablesTabProps {
  project: ExtendedProject | null
  documents: Document[]
  stakeholders: Stakeholder[]
}

export function VariablesTab({ project, documents, stakeholders }: VariablesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Project Variables & Metadata
        </CardTitle>
        <CardDescription>
          Key project attributes and configuration variables that can be used in document generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Project Name</p>
                  <p className="text-sm font-semibold">{project?.name || 'N/A'}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(project?.name || '').then(() => {
                      toast.success('Copied to clipboard')
                    })
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{project?.description || 'No description'}</p>
                </div>
                {project?.description && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(project?.description || '').then(() => {
                      toast.success('Copied to clipboard')
                    })
                  }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Project ID</p>
                  <p className="text-sm font-mono text-xs">{project?.id || 'N/A'}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(project?.id || '').then(() => {
                      toast.success('Copied to clipboard')
                    })
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Project Attributes */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Project Attributes</h3>
            
            <div className="space-y-3">
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Framework</p>
                  <Badge variant="outline">{project?.framework || 'N/A'}</Badge>
                </div>
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                  <Badge>{project?.status || 'N/A'}</Badge>
                </div>
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Priority</p>
                  <Badge variant={
                    project?.priority === 'high' ? 'destructive' : 
                    project?.priority === 'medium' ? 'default' : 
                    'secondary'
                  }>
                    {project?.priority || 'N/A'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Owner</p>
                  <p className="text-sm">{project?.owner_name || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline & Budget */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Timeline & Budget</h3>
            
            <div className="space-y-3">
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Start Date</p>
                  <p className="text-sm">
                    {project?.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">End Date</p>
                  <p className="text-sm">
                    {project?.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Budget</p>
                  <p className="text-sm font-semibold">
                    {project?.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Duration</p>
                  <p className="text-sm">
                    {project?.start_date && project?.end_date
                      ? `${Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))} days`
                      : 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Team & Timestamps */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Team & Tracking</h3>
            
            <div className="space-y-3">
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Team Members</p>
                  <p className="text-sm">
                    {project?.team_members && project.team_members.length > 0 
                      ? `${project.team_members.length} members`
                      : 'No team members'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Created</p>
                  <p className="text-sm">
                    {project?.created_at ? new Date(project.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Last Updated</p>
                  <p className="text-sm">
                    {project?.updated_at ? new Date(project.updated_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Documents</p>
                  <p className="text-sm font-semibold">{documents.length} documents</p>
                </div>
              </div>
              
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Stakeholders</p>
                  <p className="text-sm font-semibold">{stakeholders.length} stakeholders</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Variables from Settings & Metadata */}
        {project?.settings && Object.keys(project.settings).length > 0 && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Custom Settings
                </CardTitle>
                <CardDescription>
                  Project-specific configuration settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {project.settings && Object.entries(project.settings).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1">{key}</p>
                        <p className="text-sm font-mono text-xs">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(typeof value === 'object' ? JSON.stringify(value) : String(value)).then(() => {
                            toast.success('Copied to clipboard')
                          })
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {project?.metadata && Object.keys(project.metadata).length > 0 && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Custom Metadata
                </CardTitle>
                <CardDescription>
                  Additional project metadata and custom fields
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {project.metadata && Object.entries(project.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1">{key}</p>
                        <p className="text-sm font-mono text-xs">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(typeof value === 'object' ? JSON.stringify(value) : String(value)).then(() => {
                            toast.success('Copied to clipboard')
                          })
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Variable Usage Guide */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Using Project Variables in Document Generation
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                These variables are automatically available when generating documents for this project. You can reference them using template placeholders:
              </p>
              <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200 font-mono bg-blue-100 dark:bg-blue-900 p-3 rounded">
                <p className="font-semibold mb-1">Standard Variables:</p>
                <p>{"{{project_name}}"} → {project?.name}</p>
                <p>{"{{project_framework}}"} → {project?.framework}</p>
                <p>{"{{project_status}}"} → {project?.status}</p>
                <p>{"{{project_priority}}"} → {project?.priority}</p>
                <p>{"{{project_budget}}"} → {project?.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}</p>
                <p>{"{{project_owner}}"} → {project?.owner_name || 'N/A'}</p>
                <p>{"{{start_date}}"} → {project?.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}</p>
                <p>{"{{end_date}}"} → {project?.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}</p>
                <p>{"{{document_count}}"} → {documents.length}</p>
                <p>{"{{stakeholder_count}}"} → {stakeholders.length}</p>
                
                {project?.team_members && project.team_members.length > 0 && (
                  <>
                    <p className="font-semibold mt-2 mb-1">Team Variables:</p>
                    <p>{"{{team_size}}"} → {project.team_members.length}</p>
                  </>
                )}
                
                {project?.settings && Object.keys(project.settings).length > 0 && (
                  <>
                    <p className="font-semibold mt-2 mb-1">Custom Settings:</p>
                    {Object.keys(project.settings).map(key => (
                      <p key={key}>{"{{settings." + key + "}}"} → {String(project.settings![key])}</p>
                    ))}
                  </>
                )}
                
                {project?.metadata && Object.keys(project.metadata).length > 0 && (
                  <>
                    <p className="font-semibold mt-2 mb-1">Custom Metadata:</p>
                    {Object.keys(project.metadata).map(key => (
                      <p key={key}>{"{{metadata." + key + "}}"} → {String(project.metadata![key])}</p>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

