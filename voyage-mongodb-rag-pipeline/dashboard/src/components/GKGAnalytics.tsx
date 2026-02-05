import { motion } from 'framer-motion'
import { 
  ShareIcon, 
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface GKGAnalyticsProps {
  metrics?: any
  isLoading?: boolean
}

export default function GKGAnalytics({ metrics, isLoading }: GKGAnalyticsProps) {
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

  const nodeData = [
    { name: 'Projects', value: metrics?.graphStats?.nodeLabels?.Project || 0, color: 'bg-blue-500' },
    { name: 'Documents', value: metrics?.graphStats?.nodeLabels?.Document || 0, color: 'bg-green-500' },
    { name: 'Entities', value: metrics?.graphStats?.nodeLabels?.Entity || 0, color: 'bg-purple-500' }
  ]

  const relationshipData = [
    { name: 'CONTAINS', value: metrics?.graphStats?.relationshipTypes?.CONTAINS || 0, color: 'bg-orange-500' },
    { name: 'RELATED_TO', value: metrics?.graphStats?.relationshipTypes?.RELATED_TO || 0, color: 'bg-pink-500' },
    { name: 'DEPENDS_ON', value: metrics?.graphStats?.relationshipTypes?.DEPENDS_ON || 0, color: 'bg-indigo-500' },
    { name: 'PART_OF', value: metrics?.graphStats?.relationshipTypes?.PART_OF || 0, color: 'bg-teal-500' }
  ]

  const totalNodes = nodeData.reduce((sum, item) => sum + item.value, 0)
  const totalRelationships = relationshipData.reduce((sum, item) => sum + item.value, 0)

  const syncStatus = metrics?.syncStatus?.syncStatus || 'Unknown'
  const isSyncActive = syncStatus === 'Active'
  const hasErrors = (metrics?.syncStatus?.errors || 0) > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <ShareIcon className="h-5 w-5 mr-2 text-purple-600" />
          Knowledge Graph Analytics
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isSyncActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isSyncActive ? (
              <>
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                {syncStatus}
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                {syncStatus}
              </>
            )}
          </span>
          {hasErrors && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {metrics?.syncStatus?.errors} Errors
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Total Nodes */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-800">Total Nodes</span>
            <ShareIcon className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-900">{(metrics?.graphStats?.totalNodes || 0).toLocaleString()}</div>
          <div className="text-xs text-purple-700 mt-1">{totalRelationships.toLocaleString()} relationships</div>
        </div>

        {/* Governance Domains */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Governance Domains</span>
            <ChartBarIcon className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">{metrics?.governance?.governanceDomains || 0}</div>
          <div className="text-xs text-blue-700 mt-1">{metrics?.governance?.complianceScore || 0}% compliance</div>
        </div>

        {/* Sync Performance */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">Avg Sync Time</span>
            <ClockIcon className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900">{metrics?.performance?.averageSyncTime || 0}ms</div>
          <div className="text-xs text-green-700 mt-1">Last sync: {metrics?.syncStatus?.lastSyncTime ? new Date(metrics.syncStatus.lastSyncTime).toLocaleTimeString() : 'Never'}</div>
        </div>
      </div>

      {/* Node Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Node Distribution</h4>
          <div className="space-y-3">
            {nodeData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{item.value.toLocaleString()}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalNodes > 0 ? (item.value / totalNodes) * 100 : 0}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className={`h-2 rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Relationship Types */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Relationship Types</h4>
          <div className="space-y-3">
            {relationshipData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{item.value.toLocaleString()}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalRelationships > 0 ? (item.value / totalRelationships) * 100 : 0}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className={`h-2 rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sync Status Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Sync Status Details</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{metrics?.syncStatus?.projectsSynced || 0}</div>
            <div className="text-xs text-gray-600">Projects Synced</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{metrics?.syncStatus?.documentsSynced || 0}</div>
            <div className="text-xs text-gray-600">Documents Synced</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{metrics?.syncStatus?.entitiesExtracted || 0}</div>
            <div className="text-xs text-gray-600">Entities Extracted</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{metrics?.performance?.totalSyncOperations || 0}</div>
            <div className="text-xs text-gray-600">Total Sync Ops</div>
          </div>
        </div>
      </div>

      {/* Governance Metrics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{metrics?.governance?.riskAssessments || 0}</div>
          <div className="text-xs text-gray-600">Risk Assessments</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{metrics?.governance?.auditTrails || 0}</div>
          <div className="text-xs text-gray-600">Audit Trails</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{metrics?.performance?.lastSyncDuration || 0}ms</div>
          <div className="text-xs text-gray-600">Last Sync Duration</div>
        </div>
      </div>
    </motion.div>
  )
}
