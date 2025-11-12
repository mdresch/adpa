"use client"

import { useState } from "react"
import { 
  FileText, 
  ExternalLink, 
  AlertCircle,
  CheckCircle,
  User,
  Calendar,
  Tag
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Issue {
  id: number
  number: number
  title: string
  state: "open" | "closed"
  body?: string
  html_url: string
  user: {
    login: string
    avatar_url: string
  }
  labels: Array<{
    id: number
    name: string
    color: string
  }>
  assignees: Array<{
    login: string
    avatar_url: string
  }>
  created_at: string
  updated_at: string
  closed_at?: string
}

interface IssueListProps {
  issues: Issue[]
  loading?: boolean
  onViewDetails?: (issue: Issue) => void
  onPickUp?: (issue: Issue) => void
  integrationId?: string
}

export function IssueList({ issues, loading = false, onViewDetails, onPickUp, integrationId }: IssueListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case "open":
        return <AlertCircle className="h-4 w-4 text-green-500" />
      case "closed":
        return <CheckCircle className="h-4 w-4 text-purple-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case "open":
        return "bg-green-100 text-green-800"
      case "closed":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-12 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Issues</h3>
          <p className="text-muted-foreground">
            No issues found in this repository
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {issues.map((issue) => (
        <Card key={issue.id} className="hover:bg-accent/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium">
                    <span className="text-muted-foreground">#{issue.number}</span>{" "}
                    {issue.title}
                  </h4>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {issue.user.login}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(issue.created_at)}
                    </div>
                  </div>

                  {/* Labels */}
                  {issue.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {issue.labels.map((label) => (
                        <Badge
                          key={label.id}
                          variant="outline"
                          className="text-xs"
                          style={{ 
                            backgroundColor: `#${label.color}20`, 
                            borderColor: `#${label.color}`,
                            color: `#${label.color}`
                          }}
                        >
                          <Tag className="h-2 w-2 mr-1" />
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Assignees */}
                  {issue.assignees.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Assigned to:</span>
                      <div className="flex -space-x-2">
                        {issue.assignees.slice(0, 3).map((assignee) => (
                          <Avatar key={assignee.login} className="h-6 w-6 border-2 border-background">
                            <AvatarImage src={assignee.avatar_url} alt={assignee.login} />
                            <AvatarFallback className="text-xs">
                              {assignee.login.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {issue.assignees.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">
                              +{issue.assignees.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Badge className={getStateColor(issue.state)}>
                  <span className="flex items-center gap-1">
                    {getStateIcon(issue.state)}
                    {issue.state}
                  </span>
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(issue.html_url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View
                </Button>
                {onPickUp && integrationId && issue.state === "open" && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onPickUp(issue)}
                  >
                    Pick Up
                  </Button>
                )}
                {onViewDetails && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onViewDetails(issue)}
                  >
                    Details
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
