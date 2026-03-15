"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Activity as ActivityIcon } from "lucide-react"

import { Job } from "@/lib/api"

export function ProcessingPipeline({ jobs = [] }: { jobs?: Job[] }) {
  const pipelineStages = [
    {
      stage: "1. OCR & Ingestion",
      description: "Optical character recognition for scanned documents, PDFs, and images with format normalization",
      icon: "📄",
      color: "from-blue-400 to-blue-500"
    },
    {
      stage: "2. Context Gathering",
      description: "Collects relevant project documents, stakeholder information, and historical context",
      icon: "🔍",
      color: "from-blue-450 to-blue-550"
    },
    {
      stage: "3. Topic Extraction",
      description: "AI-driven topic analysis and domain-specific knowledge categorization across frameworks",
      icon: "🎯",
      color: "from-blue-500 to-blue-600"
    },
    {
      stage: "4. Content Prioritization",
      description: "Ranks content by relevance, importance, and impact using multi-dimensional scoring",
      icon: "📊",
      color: "from-blue-550 to-blue-650"
    },
    {
      stage: "5. Smart Compression",
      description: "Topic-centric compression with domain primers, achieving 80% token reduction",
      icon: "🗜️",
      color: "from-blue-600 to-blue-700"
    },
    {
      stage: "6. Context Injection",
      description: "Injects compressed, domain-aware context into AI prompts for enhanced generation",
      icon: "💉",
      color: "from-blue-650 to-blue-750"
    },
    {
      stage: "7. AI Generation",
      description: "Multi-provider AI generation with framework-specific templates and guardrails",
      icon: "🤖",
      color: "from-blue-700 to-blue-800"
    },
    {
      stage: "8. Quality Scoring",
      description: "Knowledge output matrix scoring: completeness, accuracy, coherence, compliance",
      icon: "⭐",
      color: "from-blue-750 to-blue-850"
    },
    {
      stage: "9. Analytics & Reporting",
      description: "Real-time metrics, cost analysis, quality dashboards, and ROI tracking",
      icon: "📈",
      color: "from-blue-800 to-blue-900"
    },
    {
      stage: "10. Enterprise Integration",
      description: "Seamless export to SharePoint, Confluence, Jira, and enterprise document systems",
      icon: "🔗",
      color: "from-blue-900 to-slate-900"
    }
  ]

  return (
    <Card className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg"
          >
            <ActivityIcon className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <CardTitle className="text-xl">10-Stage Enterprise Document Processing Pipeline</CardTitle>
            <CardDescription>End-to-end intelligent processing from ingestion to enterprise integration</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {pipelineStages.map((stage, index) => (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ y: -2, scale: 1.02 }}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stage.color} flex items-center justify-center text-lg shadow-lg`}>
                  {stage.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1">
                    {stage.stage}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
