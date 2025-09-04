"use client"

import { useState, useEffect } from "react"
import { 
  Sync, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Calendar,
  FileText,
  GitBranch
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

interface SyncStatusProps {
  integrationId: string
  lastSync?: string
  syncStatus?: "success" | "error" | "pending" | "running"
  onSync?: () => void
  syncProgress?: number
  syncMessage?: string
  syncStats?: {
    templatesFound: number
    templatesSynced: number
    documentsCreated: number
    errors: number
  }
}

export function SyncStatus({ 
  integrationId,
  lastSync, 
  syncStatus = "pending", 
  onSync,
  syncProgress = 0,
  syncMessage,
  syncStats
}: SyncStatusProps) {
  const [isRunning, setIsRunning] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "running":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "running":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "success":
        return "Last sync completed successfully"
      case "error":
        return "Last sync failed with errors"
      case "running":
        return "Sync in progress..."
      case "pending":
        return "No sync performed yet"
      default:
        return "Unknown status"
    }
  }

  const handleSync = () => {
    setIsRunning(true)
    onSync?.()
    // Reset running state after a delay (this would normally be handled by the parent component)
    setTimeout(() => setIsRunning(false), 3000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sync className="h-5 w-5" />
            Sync Status
          </div>
          <Button
            onClick={handleSync}
            disabled={isRunning || syncStatus === "running"}
            size="sm"
            variant="outline"
          >
            {isRunning || syncStatus === "running" ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Sync className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(syncStatus)}
            <span className="font-medium">
              {getStatusMessage(syncStatus)}
            </span>
          </div>
          <Badge className={getStatusColor(syncStatus)}>
            {syncStatus}
          </Badge>
        </div>

        {/* Last Sync Time */}
        {lastSync && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Last synced: {formatDate(lastSync)}</span>
          </div>
        )}

        {/* Sync Progress */}
        {(syncStatus === "running" || isRunning) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="w-full" />
            {syncMessage && (
              <p className="text-sm text-muted-foreground">{syncMessage}</p>
            )}
          </div>
        )}

        {/* Sync Statistics */}
        {syncStats && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Last Sync Results</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>Templates Found</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {syncStats.templatesFound}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Successfully Synced</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {syncStats.templatesSynced}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <GitBranch className="h-4 w-4 text-purple-500" />
                    <span>Documents Created</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {syncStats.documentsCreated}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>Errors</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {syncStats.errors}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Error Message */}
        {syncStatus === "error" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-800">Sync Failed</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              {syncMessage || "An error occurred during synchronization. Please check your configuration and try again."}
            </p>
          </div>
        )}

        {/* Success Message */}
        {syncStatus === "success" && syncStats && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-800">Sync Completed</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Successfully synced {syncStats.templatesSynced} templates and created {syncStats.documentsCreated} documents.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
