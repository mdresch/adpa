"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Loader2,
  FileVideo,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Settings,
  Eye,
  Glasses,
  Smartphone,
  Monitor,
  Clock,
  Users,
  BarChart3
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface GuideGeneratorProps {
  documentId: string
  documentTitle: string
  assetRef?: string
  projectId?: string
  onGuideGenerated?: (guideId: string) => void
}

interface SyncStatus {
  documentId: string
  synced: boolean
  guideId?: string
  guideUrl?: string
  lastSyncedAt?: string
  syncStatus: "synced" | "stale" | "conflict" | "not_synced"
  version?: string
}

interface GuideAnalytics {
  totalCompletions: number
  averageCompletionTime: number
  stepAnalytics: Array<{
    stepNumber: number
    averageTime: number
    errorCount: number
  }>
}

export function GuideGenerator({
  documentId,
  documentTitle,
  assetRef,
  projectId,
  onGuideGenerated
}: GuideGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [analytics, setAnalytics] = useState<GuideAnalytics | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [options, setOptions] = useState({
    includeMedia: true,
    include3DAnchors: true,
    aiEnhancement: false
  })

  const { toast } = useToast()

  // Fetch sync status on mount
  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/dynamics365-guides/status/${documentId}`, {
        credentials: "include"
      })
      
      if (response.ok) {
        const data = await response.json()
        setSyncStatus(data.data)
        
        // Fetch analytics if synced
        if (data.data?.synced && data.data?.guideId) {
          fetchAnalytics(data.data.guideId)
        }
      }
    } catch (error) {
      console.error("Failed to check guide status:", error)
    } finally {
      setIsLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  // Fetch guide analytics
  const fetchAnalytics = async (guideId: string) => {
    try {
      const response = await fetch(`/api/dynamics365-guides/guides/${guideId}/analytics`, {
        credentials: "include"
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    }
  }

  // Generate or update guide
  const generateGuide = async () => {
    setIsGenerating(true)
    
    try {
      const response = await fetch("/api/dynamics365-guides/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          documentId,
          options
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate guide")
      }

      const data = await response.json()

      toast({
        title: data.data.created ? "Guide Created" : "Guide Updated",
        description: `Successfully ${data.data.created ? "created" : "updated"} guide in Dynamics 365`
      })

      // Refresh status
      await checkStatus()

      // Callback
      if (onGuideGenerated) {
        onGuideGenerated(data.data.guideId)
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate guide",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Format time duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
  }

  // Get status badge
  const getStatusBadge = () => {
    if (isLoading) {
      return <Badge variant="outline"><Loader2 className="h-3 w-3 animate-spin mr-1" />Loading</Badge>
    }

    if (!syncStatus || !syncStatus.synced) {
      return <Badge variant="outline">Not synced</Badge>
    }

    switch (syncStatus.syncStatus) {
      case "synced":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Synced
          </Badge>
        )
      case "stale":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Needs Update
          </Badge>
        )
      case "conflict":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Conflict
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Glasses className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Dynamics 365 Guides</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Generate interactive AR instructions from this document
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Document Info */}
        <div className="text-sm space-y-1">
          <p className="font-medium truncate" title={documentTitle}>
            {documentTitle}
          </p>
          {assetRef && (
            <p className="text-muted-foreground text-xs">
              Asset: {assetRef}
            </p>
          )}
        </div>

        {/* Supported Platforms */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Glasses className="h-4 w-4" />
                  <span>HoloLens 2</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Hands-free AR on HoloLens 2</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Smartphone className="h-4 w-4" />
                  <span>Mobile</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>iOS and Android AR</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Monitor className="h-4 w-4" />
                  <span>PC</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>PC authoring and preview</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Separator />

        {/* Analytics (if synced) */}
        {syncStatus?.synced && analytics && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted rounded-lg">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Users className="h-3 w-3" />
                Completions
              </div>
              <p className="font-semibold">{analytics.totalCompletions}</p>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Clock className="h-3 w-3" />
                Avg Time
              </div>
              <p className="font-semibold">{formatDuration(analytics.averageCompletionTime)}</p>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <BarChart3 className="h-3 w-3" />
                Steps
              </div>
              <p className="font-semibold">{analytics.stepAnalytics?.length || 0}</p>
            </div>
          </div>
        )}

        {/* Last Sync Info */}
        {syncStatus?.lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            Last synced: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={generateGuide}
            disabled={isGenerating || isLoading}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : syncStatus?.synced ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Guide
              </>
            ) : (
              <>
                <FileVideo className="mr-2 h-4 w-4" />
                Generate Guide
              </>
            )}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowOptions(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generation options</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {syncStatus?.guideUrl && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <a
                      href={syncStatus.guideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open in Dynamics 365</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Options Dialog */}
        <Dialog open={showOptions} onOpenChange={setShowOptions}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Guide Generation Options</DialogTitle>
              <DialogDescription>
                Configure how the guide is generated from this document
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-media">Include Media</Label>
                  <p className="text-xs text-muted-foreground">
                    Include images and videos in guide steps
                  </p>
                </div>
                <Switch
                  id="include-media"
                  checked={options.includeMedia}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeMedia: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-anchors">3D Anchors</Label>
                  <p className="text-xs text-muted-foreground">
                    Map steps to spatial anchors for AR positioning
                  </p>
                </div>
                <Switch
                  id="include-anchors"
                  checked={options.include3DAnchors}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, include3DAnchors: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ai-enhancement">AI Enhancement</Label>
                  <p className="text-xs text-muted-foreground">
                    Use AI to optimize step instructions (max 100 chars)
                  </p>
                </div>
                <Switch
                  id="ai-enhancement"
                  checked={options.aiEnhancement}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, aiEnhancement: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOptions(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setShowOptions(false)
                generateGuide()
              }}>
                Generate with Options
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default GuideGenerator
