import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  SparklesIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useSemanticRAGMetrics, useSemanticRAGSettings, useSemanticRAGTest } from '@/hooks/useSemanticRAGMetrics'

export default function SemanticRAGOptimization() {
  const { data: metrics, isLoading, error, refetch } = useSemanticRAGMetrics()
  const { settings, updateSettings, isLoading: settingsLoading } = useSemanticRAGSettings()
  const { runTest, isRunning: testRunning, error: testError } = useSemanticRAGTest()

  const [testQuery, setTestQuery] = useState('')
  const [testResults, setTestResults] = useState<any>(null)

  const handleOptimizationTest = async () => {
    if (!testQuery.trim()) return

    try {
      const results = await runTest(testQuery)
      setTestResults(results)
    } catch (error) {
      console.error('Test failed:', error)
    }
  }

  const handleSettingsUpdate = async (newSettings: any) => {
    try {
      await updateSettings(newSettings)
    } catch (error) {
      console.error('Failed to update settings:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading metrics</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center text-gray-500 py-8">
        No metrics data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.avgResponseTime}ms</p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-green-600">↓ 12% from last hour</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Relevance Score</p>
              <p className="text-2xl font-bold text-gray-900">{(metrics.relevanceScore * 100).toFixed(1)}%</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-green-600">↑ 3% from last hour</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Semantic Accuracy</p>
              <p className="text-2xl font-bold text-gray-900">{(metrics.semanticAccuracy * 100).toFixed(1)}%</p>
            </div>
            <SparklesIcon className="h-8 w-8 text-purple-500" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-green-600">↑ 5% from last hour</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900">{(metrics.cacheHitRate * 100).toFixed(1)}%</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-indigo-500" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-green-600">↑ 8% from last hour</div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Semantic Search</span>
                <span className="text-sm font-medium">{(metrics.queryDistribution.semantic * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${metrics.queryDistribution.semantic * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Keyword Search</span>
                <span className="text-sm font-medium">{(metrics.queryDistribution.keyword * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${metrics.queryDistribution.keyword * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Hybrid Search</span>
                <span className="text-sm font-medium">{(metrics.queryDistribution.hybrid * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${metrics.queryDistribution.hybrid * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Optimization Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimization Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semantic Weight: {(settings.semanticWeight * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.semanticWeight}
                onChange={(e) => handleSettingsUpdate({ semanticWeight: parseFloat(e.target.value), keywordWeight: 1 - parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Top-K Results: {settings.topK}
              </label>
              <input
                type="range"
                min="5"
                max="20"
                step="1"
                value={settings.topK}
                onChange={(e) => handleSettingsUpdate({ topK: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Similarity Threshold: {(settings.similarityThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.05"
                value={settings.similarityThreshold}
                onChange={(e) => handleSettingsUpdate({ similarityThreshold: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.rerankingEnabled}
                  onChange={(e) => handleSettingsUpdate({ rerankingEnabled: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Reranking</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.cacheEnabled}
                  onChange={(e) => handleSettingsUpdate({ cacheEnabled: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Cache</span>
              </label>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search Testing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Testing</h3>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Enter test query..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleOptimizationTest()}
            />
            <button
              onClick={handleOptimizationTest}
              disabled={testRunning || !testQuery.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              <span>{testRunning ? 'Testing...' : 'Test Search'}</span>
            </button>
          </div>

          {testResults && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Search Results</h4>
                  <div className="space-y-3">
                    {testResults.results.map((result: any, index: number) => (
                      <div key={result.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-gray-900">{result.title}</h5>
                          <span className="text-sm text-green-600 font-medium">
                            {(result.relevanceScore * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{result.content}</p>
                        <div className="flex space-x-4 text-xs text-gray-500">
                          <span>Semantic: {(result.semanticScore * 100).toFixed(1)}%</span>
                          <span>Keyword: {(result.keywordScore * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Performance Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Response Time:</span>
                      <span className="text-sm font-medium">{testResults.performance.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cache Hit:</span>
                      <span className={`text-sm font-medium ${testResults.performance.cacheHit ? 'text-green-600' : 'text-red-600'}`}>
                        {testResults.performance.cacheHit ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Embedding Time:</span>
                      <span className="text-sm font-medium">{testResults.performance.embeddingTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Reranking Time:</span>
                      <span className="text-sm font-medium">{testResults.performance.rerankingTime}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
