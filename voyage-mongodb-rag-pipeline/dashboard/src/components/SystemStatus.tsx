import { motion } from 'framer-motion'
import { 
  ServerIcon, 
  CpuChipIcon, 
  CircleStackIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ShareIcon
} from '@heroicons/react/24/outline'

interface SystemStatusProps {
  metrics?: any
  isLoading?: boolean
}

export default function SystemStatus({ metrics, isLoading }: SystemStatusProps) {
  const services = [
    {
      name: 'MongoDB Atlas',
      status: 'healthy',
      icon: CircleStackIcon,
      description: 'Document database operational',
      metrics: '99.9% uptime'
    },
    {
      name: 'Pinecone',
      status: 'healthy',
      icon: ServerIcon,
      description: 'Vector search active',
      metrics: '85ms avg query'
    },
    {
      name: 'Neo4j Aura',
      status: 'healthy',
      icon: ShareIcon,
      description: 'Knowledge graph connected',
      metrics: '125ms sync time'
    },
    {
      name: 'Supabase',
      status: 'healthy',
      icon: CheckCircleIcon,
      description: 'Real-time sync active',
      metrics: '5 min ago'
    },
    {
      name: 'VoyageAI',
      status: 'healthy',
      icon: CpuChipIcon,
      description: 'Embedding service active',
      metrics: '150ms avg latency'
    },
    {
      name: 'Mistral AI',
      status: 'warning',
      icon: ExclamationTriangleIcon,
      description: 'Rate limit approaching',
      metrics: '80% capacity'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return CheckCircleIcon
      case 'warning':
        return ExclamationTriangleIcon
      case 'error':
        return XCircleIcon
      default:
        return CheckCircleIcon
    }
  }

  if (isLoading) {
    return (
      <div className="metric-card h-80 shimmer">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="metric-card h-80"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
          <ServerIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          <p className="text-sm text-gray-600">Service health monitoring</p>
        </div>
      </div>

      <div className="space-y-4">
        {services.map((service, index) => {
          const Icon = service.icon
          const StatusIcon = getStatusIcon(service.status)
          
          return (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  service.status === 'healthy' ? 'bg-green-50' :
                  service.status === 'warning' ? 'bg-yellow-50' : 'bg-red-50'
                }`}>
                  <Icon className={`h-4 w-4 ${
                    service.status === 'healthy' ? 'text-green-600' :
                    service.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{service.name}</p>
                  <p className="text-xs text-gray-500">{service.description}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{service.metrics}</span>
                <div className={`status-indicator ${getStatusColor(service.status)} flex items-center space-x-1`}>
                  <StatusIcon className="h-3 w-3" />
                  <span>{service.status}</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* System Resources */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-4">System Resources</h4>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Memory Usage</span>
              <span className="font-medium">{metrics?.system?.memoryUsage || 45}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metrics?.system?.memoryUsage || 45}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Database Connections</span>
              <span className="font-medium">{metrics?.system?.databaseConnections || 3}/10</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(metrics?.system?.databaseConnections || 3) / 10 * 100}%` }}
                transition={{ duration: 1, delay: 0.6 }}
                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
