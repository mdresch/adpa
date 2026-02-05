import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowPathIcon, 
  PlayIcon, 
  PauseIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function RealtimeMetrics() {
  const [isRunning, setIsRunning] = useState(true)
  const [currentMetrics, setCurrentMetrics] = useState({
    embeddingLatency: 0,
    searchLatency: 0,
    ragLatency: 0,
    queriesPerSecond: 0
  })

  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      // Simulate real-time metrics
      setCurrentMetrics({
        embeddingLatency: Math.random() * 200 + 100,
        searchLatency: Math.random() * 100 + 50,
        ragLatency: Math.random() * 1000 + 800,
        queriesPerSecond: Math.random() * 20 + 5
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  const handleRunTest = async (type: string) => {
    toast.loading(`Running ${type} performance test...`, { id: 'test' })
    
    try {
      const response = await fetch('/api/dashboard/test-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, iterations: 5 })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`${type} test completed successfully!`, { id: 'test' })
      } else {
        throw new Error('Test failed')
      }
    } catch (error) {
      toast.error(`Failed to run ${type} test`, { id: 'test' })
    }
  }

  const metrics = [
    {
      label: 'Embedding Latency',
      value: `${currentMetrics.embeddingLatency.toFixed(0)}ms`,
      color: 'from-blue-500 to-blue-600',
      icon: ChartBarIcon,
      testType: 'embedding'
    },
    {
      label: 'Search Latency',
      value: `${currentMetrics.searchLatency.toFixed(0)}ms`,
      color: 'from-green-500 to-green-600',
      icon: ChartBarIcon,
      testType: 'search'
    },
    {
      label: 'RAG Latency',
      value: `${currentMetrics.ragLatency.toFixed(0)}ms`,
      color: 'from-purple-500 to-purple-600',
      icon: ChartBarIcon,
      testType: 'rag'
    },
    {
      label: 'Queries/Second',
      value: currentMetrics.queriesPerSecond.toFixed(1),
      color: 'from-orange-500 to-orange-600',
      icon: ChartBarIcon,
      testType: 'queries'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="metric-card"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
            <ArrowPathIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Real-time Metrics</h3>
            <p className="text-sm text-gray-600">Live performance monitoring</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`p-2 rounded-lg transition-colors ${
            isRunning 
              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
              : 'bg-green-100 text-green-600 hover:bg-green-200'
          }`}
        >
          {isRunning ? (
            <PauseIcon className="h-5 w-5" />
          ) : (
            <PlayIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className={`p-4 bg-gradient-to-br ${metric.color} rounded-xl text-white`}>
                <div className="flex justify-between items-start mb-2">
                  <Icon className="h-5 w-5 opacity-80" />
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
                <p className="text-xs opacity-90 mb-1">{metric.label}</p>
                <p className="text-xl font-bold">{metric.value}</p>
              </div>
              
              {metric.testType !== 'queries' && (
                <button
                  onClick={() => handleRunTest(metric.testType)}
                  className="absolute -bottom-2 -right-2 p-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                >
                  <PlayIcon className="h-3 w-3 text-gray-600" />
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Live Indicator */}
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        <span>{isRunning ? 'Live monitoring active' : 'Monitoring paused'}</span>
      </div>
    </motion.div>
  )
}
