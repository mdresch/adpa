"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp } from "lucide-react"

interface QuickAction {
  icon: any
  label: string
  color: string
  onClick: () => void
  description: string
}

interface QuickActionsProps {
  quickActions: QuickAction[]
}

export function QuickActions({ quickActions }: QuickActionsProps) {
  const safeQuickActions = quickActions ?? [];
  return (
    <Card className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {safeQuickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={action.onClick}
                className={`h-32 flex flex-col justify-center items-center space-y-2 bg-gradient-to-br ${action.color} hover:shadow-lg transition-all duration-300 border-0 w-full`}
              >
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <action.icon className="h-8 w-8 text-white" />
                </motion.div>
                <div className="text-center">
                  <div className="text-white font-semibold text-base">{action.label}</div>
                  <div className="text-white/80 text-xs mt-1">{action.description}</div>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
