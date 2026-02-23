"use client"

import { Search, Settings, Sun, Moon, Activity, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"
import { NotificationCenter } from "./notification-center"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import Link from "next/link"

export function Header() {
  const { theme, setTheme } = useTheme()
  const [metrics, setMetrics] = useState<any>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const fetchMetrics = async () => {
      try {
        // Check if user has a token before making request
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) {
          return // Skip fetching if not authenticated
        }

        const response = await apiClient.request('/queue-stats/metrics', {
          method: 'GET',
          suppressNotFoundError: true // Suppress console errors for expected failures
        })
        setMetrics(response)
      } catch (error: any) {
        // Silently fail for auth errors (403/401) - user not logged in or token expired
        if (error?.status === 403 || error?.status === 401) {
          return
        }
        // Log other unexpected errors only in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Header] Failed to fetch metrics:', error.message)
        }
      }
    }

    fetchMetrics()
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative max-w-md group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 transition-colors group-focus-within:text-blue-500" />
          <Input
            placeholder="Search configurations, templates, jobs..."
            className="pl-10 w-80 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 focus:shadow-lg focus:shadow-blue-500/20"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Job Queue Stats */}
        {metrics.totalActive > 0 && (
          <Link href="/jobs">
            <Button
              variant="ghost"
              size="sm"
              className="relative hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
            >
              <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
              <Badge className="ml-2 bg-blue-500 text-white">{metrics.totalActive}</Badge>
              <span className="ml-2 text-xs text-muted-foreground hidden md:inline">active jobs</span>
            </Button>
          </Link>
        )}

        {/* Success Rate Indicator */}
        {metrics.successRate && (
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800">
            {metrics.successRate >= 90 ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <XCircle className="h-3 w-3 text-yellow-500" />
            )}
            <span className="text-xs font-medium">{metrics.successRate}% success</span>
          </div>
        )}

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110"
        >
          {!mounted ? <Moon className="h-4 w-4 text-slate-600" /> : theme === "dark" ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </Button>

        {/* Notifications */}
        <NotificationCenter />

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
