import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'upload' | 'search' | 'error' | 'success'
  title: string
  description: string
  timestamp: Date
  status: 'success' | 'warning' | 'error'
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => {
    // Simulate initial activities
    const initialActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'upload',
        title: 'Document Upload Completed',
        description: 'project-charter.pdf processed and embedded successfully',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        status: 'success'
      },
      {
        id: '2',
        type: 'search',
        title: 'Search Query Executed',
        description: 'Found 8 relevant results for "risk management strategies"',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        status: 'success'
      },
      {
        id: '3',
        type: 'error',
        title: 'Embedding Service Warning',
        description: 'Rate limit approaching for VoyageAI API',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        status: 'warning'
      },
      {
        id: '4',
        type: 'success',
        title: 'Performance Test Completed',
        description: 'All benchmarks passed within acceptable ranges',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        status: 'success'
      },
      {
        id: '5',
        type: 'upload',
        title: 'Batch Processing Started',
        description: 'Processing 12 documents from Q4 reports',
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        status: 'success'
      }
    ]

    setActivities(initialActivities)

    // Simulate real-time updates
    const interval = setInterval(() => {
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type: ['upload', 'search', 'success'][Math.floor(Math.random() * 3)] as any,
        title: ['System Check', 'Query Processed', 'Cache Updated'][Math.floor(Math.random() * 3)],
        description: 'Automated system maintenance completed successfully',
        timestamp: new Date(),
        status: 'success'
      }

      setActivities(prev => [newActivity, ...prev].slice(0, 10))
    }, 30000) // Add new activity every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getIcon = (type: string, status: string) => {
    switch (type) {
      case 'upload':
        return DocumentTextIcon
      case 'search':
        return MagnifyingGlassIcon
      case 'error':
      case 'success':
        return status === 'error' ? ExclamationTriangleIcon : CheckCircleIcon
      default:
        return CogIcon
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="metric-card"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg">
            <CogIcon className="h-5 w-5 text-white animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Activity Feed</h3>
            <p className="text-sm text-gray-600">Recent system events and updates</p>
          </div>
        </div>
        
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity, index) => {
          const Icon = getIcon(activity.type, activity.status)
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${
                activity.status === 'success' ? 'bg-green-50' :
                activity.status === 'warning' ? 'bg-yellow-50' : 'bg-red-50'
              }`}>
                <Icon className={`h-4 w-4 ${
                  activity.status === 'success' ? 'text-green-600' :
                  activity.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </p>
                  <span className={`status-indicator ${getStatusColor(activity.status)} text-xs`}>
                    {activity.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-1">{activity.description}</p>
                <p className="text-xs text-gray-400">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          )
        })}
        
        {activities.length === 0 && (
          <div className="text-center py-8">
            <CogIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        )}
      </div>

      {/* Live indicator */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Live updates enabled</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Connected</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
