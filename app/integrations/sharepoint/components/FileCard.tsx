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
import { toast } from '@/lib/notify'

interface SharePointFile {
  id: string
  name: string
  webUrl: string
  size: number
  createdDateTime: string
  lastModifiedDateTime: string
  mimeType?: string
  file?: {
    mimeType: string
  }
}

interface FileCardProps {
  file: SharePointFile
  onDownload?: (file: SharePointFile) => void
  onPreview?: (file: SharePointFile) => void
}

export function FileCard({ file, onDownload, onPreview }: FileCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  const getFileIcon = () => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    const mimeType = file.mimeType || file.file?.mimeType

    if (mimeType?.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension || '')) {
      return <FileImage className="h-8 w-8 text-blue-500" />
    }
    
    if (mimeType?.includes('spreadsheet') || ['xlsx', 'xls', 'csv'].includes(extension || '')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />
    }
    
    if (mimeType?.includes('document') || ['docx', 'doc', 'pdf', 'txt'].includes(extension || '')) {
      return <FileText className="h-8 w-8 text-blue-600" />
    }
    
    if (mimeType?.includes('presentation') || ['pptx', 'ppt'].includes(extension || '')) {
      return <Presentation className="h-8 w-8 text-orange-500" />
    }
    
    if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'html', 'css', 'php', 'rb'].includes(extension || '')) {
      return <FileCode className="h-8 w-8 text-purple-500" />
    }
    
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return <FileArchive className="h-8 w-8 text-yellow-600" />
    }
    
    if (mimeType?.includes('audio') || ['mp3', 'wav', 'flac', 'aac'].includes(extension || '')) {
      return <FileAudio className="h-8 w-8 text-pink-500" />
    }
    
    if (mimeType?.includes('video') || ['mp4', 'avi', 'mkv', 'mov'].includes(extension || '')) {
      return <FileVideo className="h-8 w-8 text-red-500" />
    }
    
    return <File className="h-8 w-8 text-gray-500" />
  }

  const handleDownload = async () => {
    if (!onDownload) {
      // Fallback: open in new tab
      window.open(file.webUrl, '_blank')
      return
    }

    try {
      setIsLoading(true)
      await onDownload(file)
      toast.success(`Downloaded ${file.name}`)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Download failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreview = () => {
    if (onPreview) {
      onPreview(file)
    } else {
      // Fallback: open in new tab
      window.open(file.webUrl, '_blank')
    }
  }

  const handleOpenInSharePoint = () => {
    window.open(file.webUrl, '_blank')
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getFileIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </h3>
                
                <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>Modified {formatDate(file.lastModifiedDateTime)}</span>
                </div>
                
                {file.mimeType && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-1 ml-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePreview}
                        className="h-8 w-8 p-0"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Preview file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownload}
                        disabled={isLoading}
                        className="h-8 w-8 p-0"
                      >
                        {isLoading ? (
                          <ArrowDownToLine className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleOpenInSharePoint}
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Open in SharePoint</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
