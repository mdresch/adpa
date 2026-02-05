import { motion } from 'framer-motion'
import { 
  DocumentTextIcon, 
  BoltIcon, 
  CheckCircleIcon, 
  CpuChipIcon,
  ServerIcon,
  ShareIcon
} from '@heroicons/react/24/outline'

interface MetricCardsProps {
  metrics?: any
  isLoading?: boolean
}

export default function MetricCards({ metrics, isLoading }: MetricCardsProps) {
  const cards = [
    {
      title: 'Total Documents',
      value: metrics?.embeddings?.totalDocuments || 0,
      subtitle: `${metrics?.embeddings?.totalChunks || 0} chunks`,
      icon: DocumentTextIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Pinecone Vectors',
      value: (metrics?.pinecone?.totalProjects || 0) + (metrics?.pinecone?.totalDocuments || 0) + (metrics?.pinecone?.totalEntities || 0),
      subtitle: `${metrics?.pinecone?.indexSize || 0}MB index`,
      icon: ServerIcon,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      change: '+18%',
      changeType: 'positive'
    },
    {
      title: 'GKG Nodes',
      value: metrics?.gkg?.totalNodes || 0,
      subtitle: `${metrics?.gkg?.totalRelationships || 0} relationships`,
      icon: ShareIcon,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      change: '+25%',
      changeType: 'positive'
    },
    {
      title: 'Avg Query Time',
      value: `${metrics?.rag?.averageResponseTime || 0}ms`,
      subtitle: 'Last 100 queries',
      icon: BoltIcon,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      change: '-8%',
      changeType: 'positive'
    }
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="metric-card shimmer">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ 
              scale: 1.02, 
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
            className="metric-card group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${card.bgColor} rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`h-6 w-6 ${card.textColor}`} />
              </div>
              <div className="flex items-center space-x-1">
                <span className={`text-xs font-semibold ${
                  card.changeType === 'positive' ? 'text-green-600' : 
                  card.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {card.change}
                </span>
                {card.changeType === 'positive' && (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
              <p className="text-xs text-gray-500">{card.subtitle}</p>
            </div>

            {/* Progress bar for success rate */}
            {card.title === 'Success Rate' && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${card.value}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Progress bar for API rate limit */}
            {card.title === 'API Rate Limit' && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(metrics?.system?.apiRateLimits?.current || 0) / (metrics?.system?.apiRateLimits?.limit || 1) * 100}%` 
                    }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full"
                  />
                </div>
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
