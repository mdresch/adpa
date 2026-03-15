"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Brain, FileText, Zap, TrendingUp, Users, Sparkles, Activity as ActivityIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function LandingPage() {
  const router = useRouter()

  const features = [
    {
      icon: Brain,
      title: "Compounding Intelligence",
      description: "Each document builds upon previous knowledge, creating an ever-evolving knowledge graph that improves quality over time",
      color: "from-blue-600 to-blue-700"
    },
    {
      icon: FileText,
      title: "Multi-Framework Support",
      description: "PMBOK, BABOK, DMBOK, and custom frameworks for business analysis and project management excellence",
      color: "from-blue-700 to-blue-800"
    },
    {
      icon: "🛡️",
      title: "Enterprise Security",
      description: "SOC 2 Type II compliant with AES-256 encryption, audit trails, and tamper-evident logging",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Zap,
      title: "80% Cost Reduction",
      description: "Intelligent compression and context management reduces AI token costs by up to 80% while maintaining quality",
      color: "from-blue-800 to-blue-900"
    },
    {
      icon: TrendingUp,
      title: "Real-Time Analytics",
      description: "Track document quality, AI usage, compression efficiency, and ROI with comprehensive dashboards",
      color: "from-blue-600 to-blue-800"
    },
    {
      icon: Users,
      title: "Stakeholder Intelligence",
      description: "Automated stakeholder analysis and personalized content generation for targeted communication",
      color: "from-blue-700 to-blue-900"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl"
              >
                <Brain className="h-6 w-6 text-white" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">
                ADPA Framework
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/login")}
                className="text-slate-700 dark:text-slate-300 hover:text-blue-700 font-medium"
              >
                Client Login
              </Button>
              <Button
                onClick={() => router.push("/login")}
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6"
              >
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 bg-clip-text text-transparent">
                Advanced Document
              </span>
              <br />
              <span className="text-slate-800 dark:text-slate-100">
                Processing Analytics
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed mb-6">
              Enterprise-grade document intelligence for project managers, business analysts, and process improvement professionals.
              Leverage compounding AI to transform requirements gathering, stakeholder analysis, and strategic documentation.
            </p>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-medium">
              Trusted by Fortune 500 organizations to deliver strategic frameworks and actionable insights that accelerate decision-making and drive measurable outcomes.
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              size="lg"
              onClick={() => router.push("/login")}
              className="bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-slate-900 text-white px-8 py-4 text-lg shadow-xl"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Request Enterprise Demo
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-blue-700 dark:border-blue-600 text-blue-800 dark:text-blue-400 px-8 py-4 text-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <ActivityIcon className="mr-2 h-5 w-5" />
              View Case Studies
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-700 mb-2">80%</div>
              <div className="text-slate-600 dark:text-slate-300 font-medium">Cost Reduction</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Through intelligent compression</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-800 mb-2">98.5%</div>
              <div className="text-slate-600 dark:text-slate-300 font-medium">Quality Score</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enterprise-grade accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-900 mb-2">50+</div>
              <div className="text-slate-600 dark:text-slate-300 font-medium">Framework Templates</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">PMBOK, BABOK, DMBOK</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-6">
              Enterprise Capabilities That Drive Results
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Strategic frameworks and practical guidance designed for project management, business analysis, and process excellence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group"
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      {typeof feature.icon === 'string' ? (
                        <span className="text-2xl">{feature.icon}</span>
                      ) : (
                        <feature.icon className="h-8 w-8 text-white" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
