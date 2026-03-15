"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { CheckCircle, AlertCircle } from "lucide-react"

interface IntegrationHealthProps {
  integrations: any[]
  prefersReducedMotion: boolean
}

export function IntegrationHealth({ integrations, prefersReducedMotion }: IntegrationHealthProps) {
  return (
    <Card className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Integration Health</CardTitle>
            <CardDescription>Status of external system integrations</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {integrations.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No integrations configured</p>
          ) : (
            integrations.map((integration, index) => (
              <motion.div
                key={integration.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: 4 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1] }}
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.5 }}
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
