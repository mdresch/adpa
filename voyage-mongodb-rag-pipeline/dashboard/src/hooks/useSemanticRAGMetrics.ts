import { useState, useEffect } from 'react'

interface SemanticRAGMetrics {
  totalQueries: number
  avgResponseTime: number
  relevanceScore: number
  semanticAccuracy: number
  embeddingOptimization: number
  cacheHitRate: number
  queryDistribution: {
    semantic: number
    keyword: number
    hybrid: number
  }
  performanceTrend: {
    timestamp: string
    responseTime: number
    relevanceScore: number
  }[]
}

interface SemanticRAGSettings {
  semanticWeight: number
  keywordWeight: number
  rerankingEnabled: boolean
  cacheEnabled: boolean
  embeddingModel: 'voyage-large' | 'voyage-small' | 'text-embedding-ada-002'
  topK: number
  similarityThreshold: number
}

export function useSemanticRAGMetrics(timeRange: string = '1h') {
  const [data, setData] = useState<SemanticRAGMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [timeRange])

  const fetchMetrics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/dashboard/semantic-rag/metrics?timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch metrics')
      }
      
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch semantic RAG metrics')
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = () => fetchMetrics()

  return { data, isLoading, error, refetch }
}

export function useSemanticRAGSettings() {
  const [settings, setSettings] = useState<SemanticRAGSettings>({
    semanticWeight: 0.7,
    keywordWeight: 0.3,
    rerankingEnabled: true,
    cacheEnabled: true,
    embeddingModel: 'voyage-large',
    topK: 10,
    similarityThreshold: 0.75
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateSettings = async (newSettings: Partial<SemanticRAGSettings>) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard/semantic-rag/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update settings')
      }
      
      setSettings(prev => ({ ...prev, ...newSettings }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { settings, updateSettings, isLoading, error }
}

export function useSemanticRAGTest() {
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTest = async (query: string) => {
    if (!query.trim()) return

    try {
      setIsRunning(true)
      setError(null)

      const response = await fetch('/api/dashboard/semantic-rag/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Search test failed')
      }
      
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search test failed')
      throw err
    } finally {
      setIsRunning(false)
    }
  }

  return { runTest, isRunning, error }
}
