import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

interface MetricsResponse {
  embeddings: {
    totalDocuments: number
    totalChunks: number
    processingSpeed: number
    averageEmbeddingTime: number
    successRate: number
  }
  search: {
    totalQueries: number
    averageLatency: number
    resultRelevance: number
    cacheHitRate: number
  }
  pinecone: {
    totalProjects: number
    totalDocuments: number
    totalEntities: number
    indexSize: number
    averageQueryTime: number
    semanticSearchQueries: number
  }
  gkg: {
    totalProjects: number
    totalNodes: number
    totalRelationships: number
    syncStatus: string
    lastSyncTime: string
    governanceDomains: number
  }
  rag: {
    totalQueries: number
    averageResponseTime: number
    contextQuality: number
    llmResponseTime: number
  }
  system: {
    memoryUsage: number
    databaseConnections: number
    apiRateLimits: {
      current: number
      limit: number
    }
  }
}

export function useMetrics(timeRange: string = '1h') {
  return useQuery({
    queryKey: ['metrics', timeRange],
    queryFn: async (): Promise<MetricsResponse> => {
      const { data } = await axios.get(`/api/dashboard/metrics?timeRange=${timeRange}`)
      return data.metrics
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  })
}

export function usePerformanceTest() {
  return useQuery({
    queryKey: ['performance-test'],
    queryFn: async () => {
      const { data } = await axios.post('/api/dashboard/test-performance', {
        type: 'comprehensive',
        iterations: 10
      })
      return data
    },
    enabled: false, // Manual trigger only
  })
}

export function useSearchResults(query: string, options: any = {}) {
  return useQuery({
    queryKey: ['search', query, options],
    queryFn: async () => {
      const { data } = await axios.post('/api/search', {
        query,
        maxResults: options.maxResults || 10,
        includeReranking: options.includeReranking || false,
        filters: options.filters
      })
      return data
    },
    enabled: !!query,
    staleTime: 30000, // Cache search results for 30 seconds
  })
}

export function usePineconeMetrics() {
  return useQuery({
    queryKey: ['pinecone-metrics'],
    queryFn: async () => {
      const { data } = await axios.get('/api/dashboard/pinecone')
      return data.metrics
    },
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 10000,
  })
}

export function useGKGMetrics() {
  return useQuery({
    queryKey: ['gkg-metrics'],
    queryFn: async () => {
      const { data } = await axios.get('/api/dashboard/gkg')
      return data.metrics
    },
    refetchInterval: 20000, // Refetch every 20 seconds
    staleTime: 15000,
  })
}

export function useDocumentUpload() {
  const uploadDocuments = async (files: File[]) => {
    const formData = new FormData()
    files.forEach(file => formData.append('documents', file))

    const response = await axios.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        )
        // You can emit progress events here if needed
      },
    })

    return response.data
  }

  return { uploadDocuments }
}
