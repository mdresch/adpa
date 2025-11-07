"use client"

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import { Brain } from "lucide-react"

export function CompoundingIntelligenceWidget() {
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
            <CardTitle className="text-xl">Compounding Intelligence Engine</CardTitle>
            <CardDescription>Each document enhances the intelligence of future generations</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700"
          >
            <div className="text-4xl mb-4">🧠</div>
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Context Injection</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Previous high-quality documents automatically inform new generations with relevant context
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800/20 dark:to-blue-700/20 border border-blue-300 dark:border-blue-600"
          >
            <div className="text-4xl mb-4">📊</div>
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Adaptive Compression</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Intelligent compression reduces token usage by up to 80% while preserving critical information
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-700/20 dark:to-blue-600/20 border border-blue-400 dark:border-blue-500"
          >
            <div className="text-4xl mb-4">🔄</div>
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Knowledge Graph</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Documents form interconnected knowledge networks that evolve and improve over time
            </p>
          </motion.div>
        </div>
      </CardContent>
    </AnimatedCard>
  )
}

