"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import { Brain, Zap } from "lucide-react"
import type { ProviderData } from "../types"

interface AIProviderStatusWidgetProps {
  providersData: ProviderData[]
}

export function AIProviderStatusWidget({ providersData }: AIProviderStatusWidgetProps) {
  const router = useRouter()

  return (
    <AnimatedCard className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg"
          >
            <Brain className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <CardTitle className="text-xl">AI Provider Status</CardTitle>
            <CardDescription>Current status and health of configured AI providers</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          initial="initial"
          animate="animate"
          variants={{
            initial: {},
            animate: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="space-y-4"
        >
          {providersData.map((provider, index) => (
            <motion.div
              key={provider.name}
              variants={{
                initial: { opacity: 0, x: -20 },
                animate: { opacity: 1, x: 0 },
              }}
              whileHover={{ scale: 1.02, x: 4 }}
              onClick={() => router.push(`/ai-providers`)}
              className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <motion.div
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                  className={
                    provider.color === "blue"
                      ? "p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20"
                      : provider.color === "emerald"
                      ? "p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20"
                      : provider.color === "yellow"
                      ? "p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20"
                      : provider.color === "red"
                      ? "p-2 rounded-lg bg-red-50 dark:bg-red-900/20"
                      : "p-2 rounded-lg bg-gray-50 dark:bg-gray-900/20"
                  }
                >
                  <Zap
                    className={
                      provider.color === "blue"
                        ? "h-5 w-5 text-blue-500"
                        : provider.color === "emerald"
                        ? "h-5 w-5 text-emerald-500"
                        : provider.color === "yellow"
                        ? "h-5 w-5 text-yellow-500"
                        : provider.color === "red"
                        ? "h-5 w-5 text-red-500"
                        : "h-5 w-5 text-gray-500"
                    }
                  />
                </motion.div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{provider.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {provider.requests} requests today
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {provider.health}% uptime
                  </p>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "6rem" }}
                    transition={{ delay: index * 0.1 + 0.5, duration: 0.8 }}
                  >
                    <Progress value={provider.health} className="w-24 h-2 mt-1" />
                  </motion.div>
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.7, type: "spring" }}
                >
                  <Badge
                    variant={
                      provider.status === "active"
                        ? "default"
                        : provider.status === "standby"
                          ? "secondary"
                          : "outline"
                    }
                    className="animate-pulse"
                  >
                    {provider.status}
                  </Badge>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </AnimatedCard>
  )
}

