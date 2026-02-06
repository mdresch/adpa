import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Head from 'next/head'
import MetricCards from '@/components/MetricCards'
import PerformanceChart from '@/components/PerformanceChart'
import SystemStatus from '@/components/SystemStatus'
import ActivityFeed from '@/components/ActivityFeed'
import QuickActions from '@/components/QuickActions'
import RealtimeMetrics from '@/components/RealtimeMetrics'
import PineconeAnalytics from '@/components/PineconeAnalytics'
import GKGAnalytics from '@/components/GKGAnalytics'
import SemanticRAGOptimization from '@/components/SemanticRAGOptimization'
import { useMetrics, usePineconeMetrics, useGKGMetrics } from '@/hooks/useMetrics'
import { 
  ChartBarIcon,
  ServerIcon,
  ShareIcon,
  CogIcon,
  DocumentTextIcon,
  BoltIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('1h')
  const [activeTab, setActiveTab] = useState('overview')
  const { data: metrics, isLoading, error, refetch } = useMetrics(timeRange)
  const { data: pineconeMetrics, isLoading: pineconeLoading } = usePineconeMetrics()
  const { data: gkgMetrics, isLoading: gkgLoading } = useGKGMetrics()

  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [refetch])

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'pinecone', name: 'Pinecone', icon: ServerIcon },
    { id: 'gkg', name: 'Knowledge Graph', icon: ShareIcon },
    { id: 'semantic-rag', name: 'Semantic RAG', icon: SparklesIcon },
    { id: 'performance', name: 'Performance', icon: BoltIcon },
    { id: 'system', name: 'System', icon: CogIcon },
    { id: 'documents', name: 'Documents', icon: DocumentTextIcon }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Key Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <MetricCards metrics={metrics} isLoading={isLoading} />
            </motion.div>

            {/* Pinecone & GKG Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <PineconeAnalytics metrics={pineconeMetrics} isLoading={pineconeLoading} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <GKGAnalytics metrics={gkgMetrics} isLoading={gkgLoading} />
              </motion.div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Performance Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <PerformanceChart metrics={metrics} isLoading={isLoading} />
              </motion.div>

              {/* System Status */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <SystemStatus metrics={metrics} isLoading={isLoading} />
              </motion.div>
            </div>
          </div>
        )
      
      case 'pinecone':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PineconeAnalytics metrics={pineconeMetrics} isLoading={pineconeLoading} />
            </motion.div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <PerformanceChart metrics={metrics} isLoading={isLoading} />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <SystemStatus metrics={metrics} isLoading={isLoading} />
              </motion.div>
            </div>
          </div>
        )
      
      case 'gkg':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GKGAnalytics metrics={gkgMetrics} isLoading={gkgLoading} />
            </motion.div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ActivityFeed />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <SystemStatus metrics={metrics} isLoading={isLoading} />
              </motion.div>
            </div>
          </div>
        )
      
      case 'semantic-rag':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <SemanticRAGOptimization />
            </motion.div>
          </div>
        )
      
      case 'performance':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <PerformanceChart metrics={metrics} isLoading={isLoading} />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <RealtimeMetrics />
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <MetricCards metrics={metrics} isLoading={isLoading} />
            </motion.div>
          </div>
        )
      
      case 'system':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SystemStatus metrics={metrics} isLoading={isLoading} />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ActivityFeed />
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <QuickActions />
            </motion.div>
          </div>
        )
      
      case 'documents':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <MetricCards metrics={metrics} isLoading={isLoading} />
            </motion.div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ActivityFeed />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <QuickActions />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <SystemStatus metrics={metrics} isLoading={isLoading} />
              </motion.div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error loading dashboard</h2>
          <p className="text-gray-600">Please check your connection and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>RAG Pipeline Dashboard</title>
        <meta name="description" content="Advanced RAG Pipeline Monitoring Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-morphism border-b border-gray-200 sticky top-0 z-50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg flex items-center justify-center"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </motion.div>
                <div>
                  <h1 className="text-2xl font-bold gradient-text">Enhanced RAG Pipeline Dashboard</h1>
                  <p className="text-sm text-gray-600">Real-time monitoring with Pinecone & Knowledge Graph</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                </select>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                >
                  Refresh
                </motion.button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 sticky top-20 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderTabContent()}
        </main>
      </div>
    </>
  )
}
