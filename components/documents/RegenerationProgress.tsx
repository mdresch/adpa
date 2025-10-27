"use client"

/**
 * Regeneration Progress Component
 * Displays real-time progress for document regeneration jobs
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, ExternalLink } from '@/components/ui/icons-shim'
import { useRouter } from 'next/navigation'

interface RegenerationProgressProps {
  jobId: string | null
  progress: {
    progress: number
    message: string
  } | null
  isRegenerating: boolean
  error: string | null
  result: {
    versionId: string
    versionNumber: string
  } | null
  onClose: () => void
  documentId: string
}

export function RegenerationProgress({
  jobId,
  progress,
  isRegenerating,
  error,
  result,
  onClose,
  documentId
}: RegenerationProgressProps) {
  const router = useRouter()

  // Auto-close after success
  useEffect(() => {
    if (result && !error) {
      const timer = setTimeout(() => {
        onClose()
        // Refresh the page to show new version
        router.refresh()
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [result, error, onClose, router])

  if (!isRegenerating && !result && !error) {
    return null
  }

  return (
    <AnimatePresence>
      {(isRegenerating || result || error) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed bottom-6 right-6 z-50 w-96"
        >
          <Card className="shadow-lg border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {isRegenerating && !error && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {result && !error && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {error && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <CardTitle className="text-lg">
                    {isRegenerating && !error && 'Regenerating Document'}
                    {result && !error && 'Regeneration Complete'}
                    {error && 'Regeneration Failed'}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
              {jobId && (
                <CardDescription className="text-xs font-mono">
                  Job ID: {jobId.substring(0, 8)}...
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progress Bar */}
              {isRegenerating && !error && progress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{progress.message}</span>
                    <Badge variant="outline">{progress.progress}%</Badge>
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                </div>
              )}

              {/* Success Message */}
              {result && !error && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                    <p className="text-sm font-medium text-green-900">
                      Version {result.versionNumber} created successfully!
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      The new version has been added to the version history.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      onClose()
                      router.refresh()
                    }}
                    className="w-full"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View New Version
                  </Button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                    <p className="text-sm font-medium text-red-900">
                      Failed to regenerate document
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {error}
                    </p>
                  </div>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              )}

              {/* Progress Steps */}
              {isRegenerating && !error && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${progress && progress.progress >= 10 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span>Fetching document metadata</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${progress && progress.progress >= 30 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span>Gathering project context</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${progress && progress.progress >= 50 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span>Generating content with AI</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${progress && progress.progress >= 85 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span>Creating new version</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${progress && progress.progress === 100 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span>Finalizing</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

