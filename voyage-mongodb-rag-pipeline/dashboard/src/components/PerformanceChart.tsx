import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { ChartBarIcon } from '@heroicons/react/24/outline'

interface PerformanceChartProps {
  metrics?: any
  isLoading?: boolean
}

export default function PerformanceChart({ metrics, isLoading }: PerformanceChartProps) {
  const [chartData, setChartData] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState('1h')

  useEffect(() => {
    // Generate mock data for demonstration
    const generateData = () => {
      const data = []
      const now = new Date()
      const intervals = timeRange === '1h' ? 12 : timeRange === '24h' ? 24 : 7
      
      for (let i = intervals - 1; i >= 0; i--) {
        const time = new Date(now.getTime() - i * (timeRange === '1h' ? 5 * 60 * 1000 : timeRange === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000))
        data.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          embedding: metrics?.embeddings?.averageEmbeddingTime || Math.random() * 200 + 100,
          search: metrics?.search?.averageLatency || Math.random() * 100 + 50,
          rag: metrics?.rag?.averageResponseTime || Math.random() * 1000 + 800,
          queries: Math.floor(Math.random() * 20 + 5)
        })
      }
      return data
    }

    setChartData(generateData())
  }, [metrics, timeRange])

  if (isLoading) {
    return (
      <div className="metric-card h-96 shimmer">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="metric-card h-96"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <ChartBarIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Performance Analytics</h3>
            <p className="text-sm text-gray-600">Real-time system performance metrics</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {['1h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                timeRange === range
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range === '1h' ? '1H' : range === '24h' ? '24H' : '7D'}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="embeddingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="searchGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="ragGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="time" 
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            labelStyle={{ color: '#374151', fontWeight: 600 }}
          />

          <Area
            type="monotone"
            dataKey="embedding"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#embeddingGradient)"
            name="Embedding (ms)"
          />
          
          <Area
            type="monotone"
            dataKey="search"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#searchGradient)"
            name="Search (ms)"
          />
          
          <Area
            type="monotone"
            dataKey="rag"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#ragGradient)"
            name="RAG (ms)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex justify-center space-x-6 mt-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-xs text-gray-600">Embedding</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-xs text-gray-600">Search</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="text-xs text-gray-600">RAG</span>
        </div>
      </div>
    </motion.div>
  )
}
