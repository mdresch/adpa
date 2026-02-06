import { motion } from 'framer-motion'
import { useState } from 'react'
import { 
  ServerIcon, 
  ChartBarIcon,
  ClockIcon,
  DocumentIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface PineconeAnalyticsProps {
  metrics?: any
  isLoading?: boolean
  onRefresh?: () => void
}

export default function PineconeAnalytics({ metrics, isLoading, onRefresh }: PineconeAnalyticsProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null)

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncStatus(null)

    try {
      const response = await fetch('/api/dashboard/pinecone/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        setSyncStatus({
          success: true,
          message: `Synced ${data.results.projects.success} projects, ${data.results.documents.success} documents in ${Math.round(data.results.duration / 1000)}s`
        })
        
        // Refresh metrics after sync
        if (onRefresh) {
          setTimeout(() => onRefresh(), 1000)
        }
      } else {
        setSyncStatus({
          success: false,
          message: data.message || 'Sync failed'
        })
      }
    } catch (error) {
      setSyncStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed'
      })
    } finally {
      setIsSyncing(false)
      
      // Clear status after 5 seconds
      setTimeout(() => setSyncStatus(null), 5000)
    }
  }

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

  // Extract real data from metrics
  const indexStats = metrics?.indexStats || {};
  const vectorDistribution = metrics?.vectorDistribution || {};
  const performance = metrics?.performance || {};
  const usage = metrics?.usage || {};
  const isRealData = metrics?.isRealData !== false;

  const vectorData = [
    { 
      name: 'Projects', 
      value: vectorDistribution.projects || metrics?.totalProjects || 0, 
      color: 'bg-blue-500' 
    },
    { 
      name: 'Documents', 
      value: vectorDistribution.documents || metrics?.totalDocuments || 0, 
      color: 'bg-green-500' 
    },
    { 
      name: 'Entities', 
      value: vectorDistribution.entities || metrics?.totalEntities || 0, 
      color: 'bg-purple-500' 
    }
  ]

  const totalVectors = indexStats.totalVectorCount || vectorData.reduce((sum, item) => sum + item.value, 0)

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
          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isSyncing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-green-50 text-green-700 hover:bg-green-100 active:bg-green-200'
            }`}
            title="Sync database to Pinecone"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>

          {/* Status Badges */}
          {isRealData ? (
            <>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Live Data
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {indexStats.indexState || 'Ready'}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Demo Data
            </span>
          )}
        </div>
      </div>

      {/* Sync Status Message */}
      {syncStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mb-4 p-3 rounded-lg ${
            syncStatus.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {syncStatus.success ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                syncStatus.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {syncStatus.message}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Total Vectors */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">Total Vectors</span>
            <DocumentIcon className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900">{totalVectors.toLocaleString()}</div>
          <div className="text-xs text-green-700 mt-1">
            {indexStats.indexSize || metrics?.indexSize || 0}MB index size
          </div>
          <div className="text-xs text-green-600 mt-1">
            {indexStats.dimensionCount || 1024}D vectors
          </div>
        </div>

        {/* Query Performance */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Avg Query Time</span>
            <ClockIcon className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {performance.averageQueryLatency || metrics?.averageQueryTime || 0}ms
          </div>
          <div className="text-xs text-blue-700 mt-1">
            P95: {performance.p95QueryLatency || 0}ms
          </div>
        </div>

        {/* Semantic Searches */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-800">Semantic Searches</span>
            <ChartBarIcon className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {performance.totalQueries || metrics?.semanticSearchQueries || 0}
          </div>
          <div className="text-xs text-purple-700 mt-1">
            {performance.queriesPerSecond || 0} qps
          </div>
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
          <div className="text-lg font-semibold text-gray-900">
            {performance.queriesPerSecond || 0}
          </div>
          <div className="text-xs text-gray-600">Queries/sec</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {performance.p95QueryLatency || 0}ms
          </div>
          <div className="text-xs text-gray-600">P95 Latency</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {usage.readOperations || 0}
          </div>
          <div className="text-xs text-gray-600">Read Ops</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {usage.writeOperations || 0}
          </div>
          <div className="text-xs text-gray-600">Write Ops</div>
        </div>
      </div>

      {/* Namespace Details */}
      {isRealData && metrics?.namespaceStats && Object.keys(metrics.namespaceStats).length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Namespace Statistics</h4>
          <div className="space-y-2">
            {Object.entries(metrics.namespaceStats).map(([namespace, stats]: [string, any]) => (
              <div key={namespace} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-mono">{namespace}</span>
                <span className="text-gray-900 font-medium">
                  {(stats.recordCount || stats.vectorCount || 0).toLocaleString()} vectors
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storage Utilization */}
      <div className="mt-4 bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-800">Storage Utilization</span>
          <span className="text-sm font-bold text-blue-900">{usage.storageUtilization || 0}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(usage.storageUtilization || 0, 100)}%` }}
            transition={{ duration: 1 }}
            className="bg-blue-600 h-2 rounded-full"
          />
        </div>
        <div className="text-xs text-blue-700 mt-1">
          {totalVectors.toLocaleString()} / 100,000 vectors
        </div>
      </div>

      {/* Data Source Indicator */}
      {!isRealData && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Demo Mode:</strong> Pinecone service is not available. Showing sample data. 
                {metrics?.error && <span className="block mt-1 text-xs">Error: {metrics.error}</span>}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
