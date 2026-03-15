"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap } from "lucide-react"

interface AIProviderStatusProps {
  aiProviders: any[]
  performance?: any
  prefersReducedMotion: boolean
  onProviderClick: () => void
}

export function AIProviderStatus({ aiProviders, performance, prefersReducedMotion, onProviderClick }: AIProviderStatusProps) {
  const providersData = aiProviders.map(provider => {
    const totalRequests = provider.requestCount ?? provider.usage_stats?.total_requests ?? 0
    const reqNum = typeof totalRequests === "number" ? totalRequests : parseInt(String(totalRequests || "0"), 10)
    const successRate = provider.success_rate != null ? Math.round(provider.success_rate) : null
    
    // Default color logic
    const color = provider.is_active ? "emerald" : "slate"
    
    return {
      id: provider.id ?? provider.name,
      name: provider.name,
      status: provider.is_active ? "active" : "inactive",
      health: successRate,
      requests: reqNum,
      color,
    }
  })

  const providerBgClass: Record<string, string> = {
    emerald: "bg-emerald-50 dark:bg-emerald-900/20",
    slate: "bg-slate-50 dark:bg-slate-900/20",
  }
  const providerIconClass: Record<string, string> = {
    emerald: "text-emerald-500",
    slate: "text-slate-500",
  }

  return (
    <Card className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">AI Provider Status</CardTitle>
            <CardDescription>Current status and health of configured AI providers</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div className="space-y-4">
          {providersData.map((provider, index) => (
            <motion.div
              key={provider.id}
              whileHover={{ scale: 1.02, x: 4 }}
              onClick={onProviderClick}
              className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${providerBgClass[provider.color] ?? providerBgClass.slate}`}>
                  <Zap className={`h-5 w-5 ${providerIconClass[provider.color] ?? providerIconClass.slate}`} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{provider.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {provider.requests} total requests
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  {provider.health != null ? (
                    <>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {provider.health}% success
                      </p>
                      <Progress value={provider.health} className="w-24 h-2 mt-1" />
                    </>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500">—</p>
                  )}
                </div>
                <Badge
                  variant={provider.status === "active" ? "default" : "outline"}
                  className={provider.status === "active" ? "animate-pulse" : ""}
                >
                  {provider.status}
                </Badge>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  )
}
