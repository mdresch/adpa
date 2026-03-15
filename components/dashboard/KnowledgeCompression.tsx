"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Brain } from "lucide-react"

export function KnowledgeCompression() {
  const compressionAreas = [
    {
      domain: "Project Management",
      primer: "PMBOK 7th Edition",
      icon: "📋",
      topics: "Scope, Schedule, Budget, Risk, Stakeholders",
      color: "from-blue-500 to-blue-600"
    },
    {
      domain: "Business Analysis",
      primer: "BABOK v3",
      icon: "📊",
      topics: "Requirements, Processes, Enterprise Architecture",
      color: "from-blue-600 to-blue-700"
    },
    {
      domain: "Data Management",
      primer: "DMBOK Framework",
      icon: "🗄️",
      topics: "Data Governance, Quality, Architecture, Security",
      color: "from-blue-700 to-blue-800"
    },
    {
      domain: "Strategic Planning",
      primer: "Enterprise Strategy",
      icon: "🎯",
      topics: "Vision, Goals, KPIs, Portfolio Alignment",
      color: "from-blue-800 to-blue-900"
    }
  ]

  return (
    <Card className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg"
          >
            <Brain className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <CardTitle className="text-xl">Smart Topic Centric Knowledge Compression</CardTitle>
            <CardDescription>AI-driven topic extraction and intelligent summarization with domain-specific primers</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            ADPA's intelligent compression engine analyzes documents across multiple knowledge domains,
            extracting key topics and building contextualized summaries primed with domain expertise.
            Each knowledge area maintains its own compression matrix, ensuring critical information is preserved
            while achieving up to 80% token reduction.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {compressionAreas.map((area, index) => (
              <motion.div
                key={area.domain}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="p-4 rounded-lg border border-blue-200 dark:border-blue-700 hover:shadow-md transition-all duration-200"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${area.color} flex items-center justify-center text-2xl mb-3 shadow-lg`}>
                  {area.icon}
                </div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1">
                  {area.domain}
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-2">
                  {area.primer}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {area.topics}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-2 flex items-center">
              <span className="text-lg mr-2">🎓</span>
              Context Building Intelligence
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Our AI analyzes each document through domain-specific lenses, identifying key concepts,
              relationships, and dependencies. The system builds rich contextual summaries that maintain
              semantic accuracy while dramatically reducing token consumption. Each summary is tagged with
              relevance scores, confidence metrics, and cross-domain linkages for optimal reuse.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
