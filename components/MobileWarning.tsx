"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Monitor, Smartphone } from "lucide-react"

/**
 * Mobile Warning Component
 * 
 * Detects mobile devices and shows a friendly message that
 * ADPA is optimized for desktop use.
 * 
 * Usage: Add to app/layout.tsx
 */

interface MobileWarningProps {
  mode?: 'block' | 'warning'  // 'block' = full block, 'warning' = dismissible message
}

export function MobileWarning({ mode = 'warning' }: MobileWarningProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if mobile device (EXCLUDING tablets - they might work fine!)
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      
      // Detect phones specifically (not tablets)
      const isPhone = /android.*mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      
      // Small screen (< 640px = phone size, tablets are usually 768px+)
      const isSmallScreen = window.innerWidth < 640  // Tailwind 'sm' breakpoint
      
      // Only warn for actual phones or very small screens
      // Tablets (iPad, Android tablets) will work fine!
      setIsMobile(isPhone || isSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Don't show if not mobile or if dismissed
  if (!isMobile || (dismissed && mode === 'warning')) {
    return null
  }

  // Full block mode
  if (mode === 'block') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Desktop Required</CardTitle>
                <CardDescription>ADPA is optimized for desktop use</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-900 dark:text-orange-100">
                <p className="font-medium mb-1">Mobile Experience Not Optimized</p>
                <p className="text-orange-700 dark:text-orange-300">
                  ADPA is an enterprise document processing platform designed for desktop use. 
                  For the best experience, please access ADPA from a desktop computer or laptop.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Recommended Devices:</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Desktop or laptop computer</li>
                <li>• Tablet (iPad, Android tablet) - May work</li>
                <li>• Minimum screen width: 640px</li>
                <li>• Modern browser (Chrome, Firefox, Safari, Edge)</li>
              </ul>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Mobile support is planned for a future release. Thank you for your understanding.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Warning mode (dismissible)
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-base">Mobile Device Detected</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="h-6 w-6 p-0 hover:bg-orange-100 dark:hover:bg-orange-900"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-orange-900 dark:text-orange-100">
            ADPA is optimized for desktop use. Small mobile screens may not display all features correctly.
          </p>
          <div className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-300">
            <Monitor className="h-3 w-3" />
            <span>Best experience: Desktop or tablet (min 640px width)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

