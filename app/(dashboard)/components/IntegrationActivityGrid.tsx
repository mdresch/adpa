"use client"

import { useRouter } from "next/navigation"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import { CheckCircle, AlertCircle, Activity } from "@/components/ui/icons-shim"
import type { IntegrationData, ActivityItem } from "../types"

interface IntegrationActivityGridProps {
  integrationData: IntegrationData[]
  activityData: ActivityItem[]
}

export function IntegrationActivityGrid({ integrationData, activityData }: IntegrationActivityGridProps) {
  const router = useRouter()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Integration Health */}
      <AnimatedCard
        delay={0.2}
        className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
      >
        <CardHeader>
          <div className="flex items-center space-x-3">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg"
            >
              <CheckCircle className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <CardTitle>Integration Health</CardTitle>
              <CardDescription>Status of external system integrations</CardDescription>
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
            {integrationData.map((integration, index) => (
              <motion.div
                key={integration.name}
                variants={{
                  initial: { opacity: 0, x: -20 },
                  animate: { opacity: 1, x: 0 },
                }}
                whileHover={{ x: 4 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.5 }}
                  >
                    {integration.status === "connected" ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                  </motion.div>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{integration.name}</span>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">{integration.lastSync}</span>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </AnimatedCard>

      {/* Recent Activity */}
      <AnimatedCard
        delay={0.4}
        className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
      >
        <CardHeader>
          <div className="flex items-center space-x-3">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg"
            >
              <Activity className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system events and operations</CardDescription>
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
            {activityData.map((activity, index) => (
              <motion.div
                key={index}
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                }}
                whileHover={{ x: 4 }}
                onClick={() => router.push("/projects")}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
              >
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.3 }}
                  className={
                    activity.color === "blue"
                      ? "w-3 h-3 bg-blue-500 rounded-full mt-2"
                      : activity.color === "emerald"
                        ? "w-3 h-3 bg-emerald-500 rounded-full mt-2"
                        : activity.color === "green"
                          ? "w-3 h-3 bg-green-500 rounded-full mt-2"
                          : activity.color === "yellow"
                            ? "w-3 h-3 bg-yellow-500 rounded-full mt-2"
                            : activity.color === "red"
                              ? "w-3 h-3 bg-red-500 rounded-full mt-2"
                              : "w-3 h-3 bg-gray-500 rounded-full mt-2"
                  }
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{activity.action}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{activity.details}</p>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">{activity.time}</span>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </AnimatedCard>
    </div>
  )
}

