import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function ProjectDetailLoading() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-6">
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>

            {/* Project Header Skeleton */}
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-5 w-96" />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-10 w-28 rounded-lg" />
                <Skeleton className="h-10 w-36 rounded-lg" />
              </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="space-y-4">
              <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-700">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-24 rounded-t-lg" />
                ))}
              </div>

              {/* Tab Content Skeleton */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-80 rounded-lg" />
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>

                {/* Documents List Skeleton */}
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="glass border-0 shadow-lg rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-5 w-5 rounded" />
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-3 w-80" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
