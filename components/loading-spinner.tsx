"use client"

import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-600 dark:border-t-blue-400",
          sizeClasses[size],
        )}
      />
    </div>
  )
}

export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 w-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  )
}

export function LoadingPulse({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="h-3 w-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse" />
      <div className="h-2 w-16 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full animate-pulse" />
    </div>
  )
}
