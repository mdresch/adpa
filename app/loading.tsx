import { Skeleton, SkeletonStats, SkeletonChart } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function DashboardLoading() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-8">
            {/* Hero Section Skeleton */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 p-8 animate-pulse">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-10 w-64" />
                </div>
                <Skeleton className="h-6 w-96" />
              </div>
            </div>

            {/* Stats Cards Skeleton */}
            <SkeletonStats items={4} />

            {/* AI Providers Chart Skeleton */}
            <SkeletonChart />

            {/* Two Column Layout Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonChart />
              <SkeletonChart />
            </div>

            {/* Quick Actions Skeleton */}
            <div className="glass border-0 shadow-lg rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
