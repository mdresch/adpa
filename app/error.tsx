'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error boundary caught:', error)
    }
    // In production, you would log to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }, [error])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An unexpected error occurred while rendering this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-mono text-muted-foreground break-words">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Don't worry - your data is safe. You can try refreshing the page or return to the home page.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            onClick={reset}
            variant="default"
            className="flex-1"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="flex-1"
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
