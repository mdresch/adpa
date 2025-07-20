import type React from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%] animate-shimmer",
        className,
      )}
      {...props}
    />
  )
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass border-0 shadow-lg rounded-xl p-6 space-y-4", className)} {...props}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  )
}

function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="glass border-0 shadow-lg rounded-xl overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {Array.from({ length: columns - 1 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-16" />
                ))}
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass border-0 shadow-lg rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("glass border-0 shadow-lg rounded-xl p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <div className="space-y-4">
        <div className="h-64 flex items-end justify-between space-x-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="w-full rounded-t-lg" style={{ height: `${Math.random() * 60 + 40}%` }} />
          ))}
        </div>
        <div className="flex justify-between">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>
    </div>
  )
}

function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center space-x-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonStats, SkeletonChart, SkeletonList }
