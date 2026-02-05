import { motion } from 'framer-motion'
import { 
  ServerIcon, 
  ChartBarIcon,
  ClockIcon,
  DocumentIcon
} from '@heroicons/react/24/outline'

interface PineconeAnalyticsProps {
  metrics?: any
  isLoading?: boolean
}

export default function PineconeAnalytics({ metrics, isLoading }: PineconeAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const vectorData = [
    { name: 'Projects', value: metrics?.totalProjects || 0, color: 'bg-blue-500' },
    { name: 'Documents', value: metrics?.totalDocuments || 0, color: 'bg-green-500' },
    { name: 'Entities', value: metrics?.totalEntities || 0, color: 'bg-purple-500' }
  ]

  const totalVectors = vectorData.reduce((sum, item) => sum + item.value, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <ServerIcon className="h-5 w-5 mr-2 text-green-600" />
          Pinecone Vector Analytics
        </h3>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Total Vectors */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">Total Vectors</span>
            <DocumentIcon className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900">{totalVectors.toLocaleString()}</div>
          <div className="text-xs text-green-700 mt-1">{metrics?.indexSize || 0}MB index size</div>
        </div>

        {/* Query Performance */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Avg Query Time</span>
            <ClockIcon className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">{metrics?.averageQueryTime || 0}ms</div>
          <div className="text-xs text-blue-700 mt-1">Last 100 queries</div>
        </div>

        {/* Semantic Searches */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-800">Semantic Searches</span>
            <ChartBarIcon className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-900">{metrics?.semanticSearchQueries || 0}</div>
          <div className="text-xs text-purple-700 mt-1">Total queries</div>
        </div>
      </div>

      {/* Vector Distribution */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Vector Distribution</h4>
        <div className="space-y-3">
          {vectorData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <span className="text-sm text-gray-700">{item.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{item.value.toLocaleString()}</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${totalVectors > 0 ? (item.value / totalVectors) * 100 : 0}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className={`h-2 rounded-full ${item.color}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{metrics?.performance?.queriesPerSecond || 0}</div>
          <div className="text-xs text-gray-600">Queries/sec</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{metrics?.performance?.p95QueryLatency || 0}ms</div>
          <div className="text-xs text-gray-600">P95 Latency</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{metrics?.usage?.readOperations || 0}</div>
          <div className="text-xs text-gray-600">Read Ops</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{metrics?.usage?.writeOperations || 0}</div>
          <div className="text-xs text-gray-600">Write Ops</div>
        </div>
      </div>
    </motion.div>
  )
}
