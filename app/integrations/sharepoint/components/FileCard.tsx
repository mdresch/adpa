"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Presentation,
  FileArchive,
  FileAudio,
  FileVideo,
  File,
  ExternalLink,
  Download,
  ArrowDownToLine,
  Info
} from "lucide-react"
import { toast } from "sonner"

interface SharePointFile {
  id: string
  name: string
  webUrl: string
  size: number
  createdDateTime: string
  lastModifiedDateTime: string
  file?: {
    mimeType: string
  }
  createdBy?: {
    user?: {
      displayName: string
      email: string
    }
  }
  lastModifiedBy?: {
    user?: {
      displayName: string
      email: string
    }
  }
}

interface FileCardProps {
  file: SharePointFile
  onImport?: (fileId: string) => Promise<void>
  integrationId?: string
  driveId?: string
}

export function FileCard({ file, onImport, integrationId, driveId }: FileCardProps) {
  const [importing, setImporting] = useState(false)

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
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (mimeType?: string, fileName?: string) => {
    if (!mimeType && !fileName) return <File className="h-8 w-8 text-blue-500" />
    
    const extension = fileName?.split('.').pop()?.toLowerCase()
    
    if (mimeType?.includes('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
      return <FileImage className="h-8 w-8 text-purple-500" />
    }
    
    if (mimeType?.includes('text/') || ['txt', 'md', 'rtf'].includes(extension || '')) {
      return <FileText className="h-8 w-8 text-blue-500" />
    }
    
    if (mimeType?.includes('spreadsheet') || ['xlsx', 'xls', 'csv'].includes(extension || '')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />
    }
    
    if (mimeType?.includes('presentation') || ['pptx', 'ppt'].includes(extension || '')) {
      return <Presentation className="h-8 w-8 text-orange-500" />
    }
    
    if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'html', 'css', 'php', 'rb'].includes(extension || '')) {
      return <FileCode className="h-8 w-8 text-yellow-500" />
    }
    
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension || '')) {
      return <FileArchive className="h-8 w-8 text-gray-500" />
    }
    
    if (mimeType?.includes('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(extension || '')) {
      return <FileAudio className="h-8 w-8 text-pink-500" />
    }
    
    if (mimeType?.includes('video/') || ['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) {
      return <FileVideo className="h-8 w-8 text-red-500" />
    }
    
    return <File className="h-8 w-8 text-blue-500" />
  }

  const handleImport = async () => {
    if (!onImport) return
    
    try {
      setImporting(true)
      await onImport(file.id)
      toast.success(`Successfully imported ${file.name}`)
    } catch (error) {
      console.error("Failed to import file:", error)
      toast.error(`Failed to import ${file.name}`)
    } finally {
      setImporting(false)
    }
  }

  const handleDownload = async () => {
    if (!integrationId || !driveId) return
    
    try {
      const response = await fetch(`/api/integrations/sharepoint/${integrationId}/drives/${driveId}/items/${file.id}/content`)
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Downloaded ${file.name}`)
    } catch (error) {
      console.error("Download failed:", error)
      toast.error(`Failed to download ${file.name}`)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {getFileIcon(file.file?.mimeType, file.name)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium truncate" title={file.name}>{file.name}</h3>
              <Badge variant="outline" className="ml-2 whitespace-nowrap">
                {formatFileSize(file.size)}
              </Badge>
            </div>
            
            <div className="text-xs text-muted-foreground mt-1">
              <div className="flex items-center justify-between">
                <span>Modified: {formatDate(file.lastModifiedDateTime)}</span>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Info className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        <p>Created: {formatDate(file.createdDateTime)}</p>
                        {file.createdBy?.user && (
                          <p>Created by: {file.createdBy.user.displayName}</p>
                        )}
                        {file.lastModifiedBy?.user && (
                          <p>Modified by: {file.lastModifiedBy.user.displayName}</p>
                        )}
                        <p>MIME Type: {file.file?.mimeType || "Unknown"}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => window.open(file.webUrl, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                View
              </Button>
              
              {onImport && (
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? (
                    <span className="animate-pulse">Importing...</span>
                  ) : (
                    <>
                      <ArrowDownToLine className="h-3 w-3 mr-2" />
                      Import
                    </>
                  )}
                </Button>
              )}
              
              {integrationId && driveId && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleDownload}
                >
                  <Download className="h-3 w-3 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
