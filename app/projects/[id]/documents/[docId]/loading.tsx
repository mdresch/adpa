import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function DocumentEditorLoading() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Document Header Skeleton */}
          <div className="border-b bg-background p-4">
            <div className="flex items-center justify-between mb-4">
              {/* Breadcrumb Skeleton */}
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex items-center space-x-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-24 rounded-lg" />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-8 w-64" />
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-12 rounded-full" />
                  <Skeleton className="h-6 w-32 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-4 w-48" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="border-b px-4">
            <div className="flex space-x-4 h-12">
              <Skeleton className="h-10 w-16 rounded-t-lg" />
              <Skeleton className="h-10 w-20 rounded-t-lg" />
            </div>
          </div>

          {/* Toolbar Skeleton */}
          <div className="border-b bg-muted/30 p-2">
            <div className="flex items-center space-x-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded" />
              ))}
              <Skeleton className="h-8 w-24 rounded" />
            </div>
          </div>

          {/* Editor Content Skeleton */}
          <div className="flex-1 overflow-auto">
            <div className="p-8 max-w-4xl mx-auto space-y-6">
              {/* Title Skeleton */}
              <Skeleton className="h-12 w-3/4" />

              {/* Content Paragraphs Skeleton */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}

              {/* Table Skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-6 w-1/4" />
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div
                          key={j}
                          className="flex-1 p-3 border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                        >
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* List Skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-6 w-1/3" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
