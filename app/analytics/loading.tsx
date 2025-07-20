import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function AnalyticsLoading() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-blue-900/20 dark:to-purple-900/20">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            <div className="space-y-8">
              {/* Header Skeleton */}
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="space-y-2">
                  <Skeleton className="h-10 w-64" />
                  <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>

              {/* Key Metrics Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="glass border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Main Content Skeleton */}
              <Card className="glass border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex space-x-1">
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="border border-slate-200 dark:border-slate-700">
                        <CardHeader>
                          <Skeleton className="h-6 w-48" />
                          <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-[300px] w-full" />
                        </CardContent>
                      </Card>
                      <Card className="border border-slate-200 dark:border-slate-700">
                        <CardHeader>
                          <Skeleton className="h-6 w-48" />
                          <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-[300px] w-full" />
                        </CardContent>
                      </Card>
                    </div>
                    <Card className="border border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
