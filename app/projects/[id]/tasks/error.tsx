"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Tasks page error:', error)
  }, [error])

  return (
    <div className="container mx-auto p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Tasks</AlertTitle>
        <AlertDescription>
          {error.message || 'An unexpected error occurred while loading tasks.'}
        </AlertDescription>
      </Alert>
      <div className="mt-4">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}

