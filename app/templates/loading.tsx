import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function TemplatesLoading() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-96" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-10 w-32 rounded-lg" />
                <Skeleton className="h-10 w-36 rounded-lg" />
              </div>
            </div>

            {/* Search and Filter Skeleton */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-10 w-32 rounded-lg" />
              </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="space-y-4">
              <div className="flex space-x-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-24 rounded-lg" />
                ))}
              </div>

              {/* Templates Grid Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass border-0 shadow-lg rounded-xl p-6 space-y-4">
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
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="flex justify-between">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      ))}
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <Skeleton className="h-8 flex-1 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
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
