import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function AIProvidersLoading() {
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
                <Skeleton className="h-5 w-80" />
              </div>
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>

            {/* Tabs Skeleton */}
            <div className="space-y-4">
              <div className="flex space-x-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-24 rounded-lg" />
                ))}
              </div>

              {/* Providers List Skeleton */}
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass border-0 shadow-lg rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </div>
                          <Skeleton className="h-4 w-48" />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-12 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      ))}
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
