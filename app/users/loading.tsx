import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function UsersLoading() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-8">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-14 w-14 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-6 w-80" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-12 w-32 rounded-lg" />
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
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

            {/* Tabs Skeleton */}
            <div className="space-y-4">
              <div className="flex space-x-4">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
              </div>

              {/* Search and Filter Skeleton */}
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 flex-1 max-w-md rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
              </div>

              {/* Users List Skeleton */}
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="glass border-0 shadow-lg rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                          </div>
                          <div className="flex items-center space-x-4">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center space-y-1">
                          <Skeleton className="h-6 w-8 mx-auto" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                        <div className="text-center space-y-1">
                          <Skeleton className="h-6 w-8 mx-auto" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <div className="text-center space-y-1">
                          <Skeleton className="h-6 w-8 mx-auto" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
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
