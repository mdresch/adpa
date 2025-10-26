"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { ArrowUpRight, TrendingUp } from "lucide-react"
import type { StatCard } from "../types"

interface QuickStatsGridProps {
  stats: StatCard[]
}

export function QuickStatsGrid({ stats }: QuickStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon
        
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <Card className="glass hover:shadow-lg transition-all duration-300 border-0 overflow-hidden group">
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${stat.bgColor}`}></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stat.trend}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {stat.title}
                  </p>
                  <motion.h3
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    className="text-3xl font-bold text-slate-900 dark:text-slate-100"
                  >
                    {stat.value}
                  </motion.h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {stat.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

