"use client"

import { useState } from "react"
import { 
  GitPullRequest, 
  ExternalLink, 
  Check, 
  X, 
  Clock,
  User,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface PullRequest {
  id: number
  number: number
  title: string
  state: "open" | "closed" | "merged"
  body?: string
  html_url: string
  user: {
    login: string
    avatar_url: string
  }
  created_at: string
  updated_at: string
  closed_at?: string
  merged_at?: string
  head: {
    ref: string
  }
  base: {
    ref: string
  }
}

interface PullRequestListProps {
  pullRequests: PullRequest[]
  loading?: boolean
  onViewDetails?: (pr: PullRequest) => void
}

export function PullRequestList({ pullRequests, loading = false, onViewDetails }: PullRequestListProps) {
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
        return <Clock className="h-4 w-4 text-green-500" />
      case "closed":
        return <X className="h-4 w-4 text-red-500" />
      case "merged":
        return <Check className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case "open":
        return "bg-green-100 text-green-800"
      case "closed":
        return "bg-red-100 text-red-800"
      case "merged":
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
                </div>
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (pullRequests.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <GitPullRequest className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Pull Requests</h3>
          <p className="text-muted-foreground">
            No pull requests found in this repository
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {pullRequests.map((pr) => (
        <Card key={pr.id} className="hover:bg-accent/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitPullRequest className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h4 className="font-medium">
                    <span className="text-muted-foreground">#{pr.number}</span>{" "}
                    {pr.title}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {pr.user.login}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(pr.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <GitPullRequest className="h-3 w-3" />
                      {pr.head.ref} → {pr.base.ref}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStateColor(pr.state)}>
                  <span className="flex items-center gap-1">
                    {getStateIcon(pr.state)}
                    {pr.state}
                  </span>
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(pr.html_url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View
                </Button>
                {onViewDetails && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onViewDetails(pr)}
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
