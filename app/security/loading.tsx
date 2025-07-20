import { Skeleton, SkeletonCard, SkeletonStats, SkeletonChart, SkeletonTable } from "@/components/ui/skeleton"

export default function SecurityLoading() {
  return (
    <div className="p-8 space-y-8">
      {/* Page Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Security Metrics Skeleton */}
      <SkeletonStats count={4} />

      {/* Main Content Skeleton */}
      <SkeletonCard className="min-h-[600px]">
        <div className="space-y-6">
          {/* Tabs Skeleton */}
          <div className="flex space-x-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>

          {/* Content Area Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>

          {/* Table Skeleton */}
          <SkeletonTable rows={5} columns={6} />
        </div>
      </SkeletonCard>
    </div>
  )
}
