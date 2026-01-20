"use client"

import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import { TrendingUp } from "@/components/ui/icons-shim"
import type { QuickAction } from "../types"

interface QuickActionsPanelProps {
  actions: QuickAction[]
}

export function QuickActionsPanel({ actions }: QuickActionsPanelProps) {
  return (
    <AnimatedCard
      delay={0.6}
      className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
    >
      <CardHeader>
        <div className="flex items-center space-x-3">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg"
          >
            <TrendingUp className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
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
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {actions.map((action) => {
            const IconComponent = action.icon

            return (
              <motion.div
                key={action.label}
                variants={{
                  initial: { opacity: 0, scale: 0.8 },
                  animate: { opacity: 1, scale: 1 },
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={action.onClick}
                  className={`h-32 flex flex-col justify-center items-center space-y-2 bg-gradient-to-br ${action.color} hover:shadow-lg transition-all duration-300 border-0 w-full`}
                >
                  <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </motion.div>
                  <div className="text-center">
                    <div className="text-white font-semibold text-base">{action.label}</div>
                    <div className="text-white/80 text-xs mt-1">{action.description}</div>
                  </div>
                </Button>
              </motion.div>
            )
          })}
        </motion.div>
      </CardContent>
    </AnimatedCard>
  )
}

