"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { HardDrive, ExternalLink, FolderOpen, Calendar, User, Users } from "lucide-react"

interface SharePointDrive {
  id: string
  name: string
  description?: string
  driveType: string
  webUrl: string
  createdDateTime: string
  lastModifiedDateTime: string
  quota?: {
    total: number
    used: number
    remaining: number
    state: string
  }
  owner?: {
    user?: {
      displayName: string
      email: string
    }
    group?: {
      displayName: string
      email: string
    }
  }
}

interface DriveCardProps {
  drive: SharePointDrive
  onSelect?: (driveId: string) => void
  onViewFiles?: (driveId: string) => void
  isSelected?: boolean
}

export function DriveCard({ drive, onSelect, onViewFiles, isSelected }: DriveCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getUsagePercentage = () => {
    if (!drive.quota?.total || !drive.quota?.used) return 0
    return Math.min(100, Math.round((drive.quota.used / drive.quota.total) * 100))
  }

  const getDriveTypeLabel = (driveType: string) => {
    switch (driveType.toLowerCase()) {
      case 'personal':
        return 'Personal'
      case 'business':
        return 'Business'
      case 'documentlibrary':
        return 'Document Library'
      default:
        return driveType
    }
  }

  return (
    <Card className={`hover:shadow-md transition-all cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <HardDrive className="h-8 w-8 text-green-500 mt-1" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold truncate" title={drive.name}>
                  {drive.name}
                </h3>
                <Badge variant="outline" className="ml-2">
                  {getDriveTypeLabel(drive.driveType)}
                </Badge>
              </div>
              
              {drive.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {drive.description}
                </p>
              )}
              
              {drive.quota && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Storage</span>
                    <span className="font-medium">
                      {formatFileSize(drive.quota.used)} / {formatFileSize(drive.quota.total)}
                    </span>
                  </div>
                  <Progress value={getUsagePercentage()} className="h-1.5" />
                </div>
              )}
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Modified: {formatDate(drive.lastModifiedDateTime)}</span>
                </div>
                
                {drive.owner?.user && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Owner: {drive.owner.user.displayName}</span>
                  </div>
                )}
                
                {drive.owner?.group && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>Group: {drive.owner.group.displayName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => window.open(drive.webUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Open Library
            </Button>
            
            {onViewFiles && (
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex-1"
                onClick={() => onViewFiles(drive.id)}
              >
                <FolderOpen className="h-3 w-3 mr-2" />
                View Files
              </Button>
            )}
            
            {onSelect && (
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => onSelect(drive.id)}
                variant={isSelected ? "default" : "outline"}
              >
                {isSelected ? "Selected" : "Select"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
