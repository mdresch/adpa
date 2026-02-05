import { Router } from 'express';
import { databaseService } from '../services/database';
import { mongoDBEmbeddingService } from '../services/mongoDBEmbeddings';
import { ragService } from '../services/rag';
import { logger } from '../utils/logger';

const router = Router();

// Performance metrics storage (in production, use Redis or database)
let performanceMetrics = {
  embeddingTimes: [] as number[],
  searchTimes: [] as number[],
  ragTimes: [] as number[],
  queries: [] as any[],
  lastUpdated: Date.now()
};

// Middleware to track performance
const trackPerformance = (type: 'embedding' | 'search' | 'rag', duration: number) => {
  const metrics = performanceMetrics;
  
  switch (type) {
    case 'embedding':
      metrics.embeddingTimes.push(duration);
      if (metrics.embeddingTimes.length > 100) metrics.embeddingTimes.shift();
      break;
    case 'search':
      metrics.searchTimes.push(duration);
      if (metrics.searchTimes.length > 100) metrics.searchTimes.shift();
      break;
    case 'rag':
      metrics.ragTimes.push(duration);
      if (metrics.ragTimes.length > 100) metrics.ragTimes.shift();
      break;
  }
  
  metrics.lastUpdated = Date.now();
};

// Get comprehensive dashboard metrics
router.get('/metrics', async (req, res) => {
  try {
    const stats = await databaseService.getStats();
    
    // Calculate averages from stored metrics
    const avgEmbeddingTime = performanceMetrics.embeddingTimes.length > 0 
      ? performanceMetrics.embeddingTimes.reduce((a, b) => a + b, 0) / performanceMetrics.embeddingTimes.length 
      : 0;
    
    const avgSearchTime = performanceMetrics.searchTimes.length > 0 
      ? performanceMetrics.searchTimes.reduce((a, b) => a + b, 0) / performanceMetrics.searchTimes.length 
      : 0;
    
    const avgRagTime = performanceMetrics.ragTimes.length > 0 
      ? performanceMetrics.ragTimes.reduce((a, b) => a + b, 0) / performanceMetrics.ragTimes.length 
      : 0;

    // Get Pinecone stats (mock for now)
    const pineconeStats = {
      totalProjects: 45,
      totalDocuments: 128,
      totalEntities: 342,
      indexSize: 2.3,
      averageQueryTime: 85,
      semanticSearchQueries: 156
    };

    // Get GKG stats (mock for now)
    const gkgStats = {
      totalProjects: 180,
      totalNodes: 1250,
      totalRelationships: 3400,
      syncStatus: 'Active',
      lastSyncTime: new Date(Date.now() - 5 * 60 * 1000).toLocaleTimeString(),
      governanceDomains: 12
    };

    const metrics = {
      embeddings: {
        totalDocuments: stats.documents || 0,
        totalChunks: stats.chunks || 0,
        processingSpeed: Math.round((stats.documents || 0) / 60), // docs per minute
        averageEmbeddingTime: Math.round(avgEmbeddingTime),
        successRate: 95.5 // Mock - calculate from actual success/failure ratio
      },
      search: {
        totalQueries: performanceMetrics.searchTimes.length,
        averageLatency: Math.round(avgSearchTime),
        resultRelevance: 87.3, // Mock - calculate from user feedback or relevance scores
        cacheHitRate: 23.5 // Mock - implement caching to get real data
      },
      pinecone: pineconeStats,
      gkg: gkgStats,
      rag: {
        totalQueries: performanceMetrics.ragTimes.length,
        averageResponseTime: Math.round(avgRagTime),
        contextQuality: 82.1, // Mock - calculate from context relevance scores
        llmResponseTime: Math.round(avgRagTime * 0.7) // LLM typically takes 70% of RAG time
      },
      system: {
        memoryUsage: Math.round(process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100),
        databaseConnections: 1, // Mock - get actual connection count
        apiRateLimits: {
          current: 2, // Mock - track actual API usage
          limit: 3   // From your MongoDB Atlas rate limits
        }
      }
    };

    res.json({
      success: true,
      metrics,
      lastUpdated: performanceMetrics.lastUpdated
    });

  } catch (error) {
    logger.log('error', 'Failed to fetch dashboard metrics', {
      error: (error as Error).message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

// Get real-time performance data
router.get('/realtime', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as string || '1h';
    const now = Date.now();
    const timeMs = timeRange === '1h' ? 60 * 60 * 1000 : 
                   timeRange === '24h' ? 24 * 60 * 60 * 1000 : 
                   7 * 24 * 60 * 60 * 1000;

    // Generate time-series data
    const dataPoints = [];
    const interval = timeRange === '1h' ? 5 * 60 * 1000 : // 5 min for 1h
                     timeRange === '24h' ? 60 * 60 * 1000 : // 1 hour for 24h
                     4 * 60 * 60 * 1000; // 4 hours for 7d

    for (let time = now - timeMs; time <= now; time += interval) {
      dataPoints.push({
        timestamp: new Date(time).toLocaleTimeString(),
        embeddingLatency: performanceMetrics.embeddingTimes[Math.floor(Math.random() * performanceMetrics.embeddingTimes.length)] || 150,
        searchLatency: performanceMetrics.searchTimes[Math.floor(Math.random() * performanceMetrics.searchTimes.length)] || 80,
        ragLatency: performanceMetrics.ragTimes[Math.floor(Math.random() * performanceMetrics.ragTimes.length)] || 1200,
        queriesPerSecond: Math.random() * 10
      });
    }

    res.json({
      success: true,
      data: dataPoints.slice(-20) // Return last 20 points
    });

  } catch (error) {
    logger.log('error', 'Failed to fetch realtime data', {
      error: (error as Error).message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch realtime data'
    });
  }
});

// Get detailed embedding analytics
router.get('/embeddings', async (req, res) => {
  try {
    await databaseService.connect();
    
    // Get embedding statistics from database
    const pipeline = [
      {
        $group: {
          _id: null,
          totalChunks: { $sum: 1 },
          avgDimensions: { $avg: { $size: { $ifNull: ['$embedding', []] } } },
          minDimensions: { $min: { $size: { $ifNull: ['$embedding', []] } } },
          maxDimensions: { $max: { $size: { $ifNull: ['$embedding', []] } } }
        }
      }
    ];

    const embeddingStats = await databaseService.chunksCollection.aggregate(pipeline).toArray();
    const stats = embeddingStats[0] || { totalChunks: 0, avgDimensions: 0 };

    // Get chunk size distribution
    const sizePipeline = [
      {
        $addFields: {
          chunkSize: { $strLenCP: '$content' }
        }
      },
      {
        $bucket: {
          groupBy: '$chunkSize',
          boundaries: [0, 500, 1500, 3000, Infinity],
          default: 'large',
          output: {
            count: { $sum: 1 },
            examples: { $push: { $substr: ['$content', 0, 50] } }
          }
        }
      }
    ];

    const sizeDistribution = await databaseService.chunksCollection.aggregate(sizePipeline).toArray();

    res.json({
      success: true,
      stats: {
        totalChunks: stats.totalChunks,
        averageDimensions: Math.round(stats.avgDimensions),
        dimensionRange: {
          min: stats.minDimensions || 0,
          max: stats.maxDimensions || 0
        }
      },
      sizeDistribution: sizeDistribution.map(bucket => ({
        size: bucket._id === 0 ? 'Small' : 
              bucket._id === 500 ? 'Medium' : 
              bucket._id === 1500 ? 'Large' : 'Extra Large',
        count: bucket.count
      })),
      performanceTimes: performanceMetrics.embeddingTimes
    });

  } catch (error) {
    logger.log('error', 'Failed to fetch embedding analytics', {
      error: (error as Error).message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch embedding analytics'
    });
  }
});

// Get search analytics
router.get('/search', async (req, res) => {
  try {
    // Mock search analytics - in production, store query logs
    const searchAnalytics = {
      totalQueries: performanceMetrics.searchTimes.length,
      averageLatency: performanceMetrics.searchTimes.length > 0 
        ? Math.round(performanceMetrics.searchTimes.reduce((a, b) => a + b, 0) / performanceMetrics.searchTimes.length)
        : 0,
      queryTypes: {
        'Project Management': 35,
        'Technical Documentation': 25,
        'Business Processes': 20,
        'General Knowledge': 20
      },
      performanceDistribution: {
        '0-100ms': performanceMetrics.searchTimes.filter(t => t < 100).length,
        '100-200ms': performanceMetrics.searchTimes.filter(t => t >= 100 && t < 200).length,
        '200-500ms': performanceMetrics.searchTimes.filter(t => t >= 200 && t < 500).length,
        '500ms+': performanceMetrics.searchTimes.filter(t => t >= 500).length
      }
    };

    res.json({
      success: true,
      analytics: searchAnalytics
    });

  } catch (error) {
    logger.log('error', 'Failed to fetch search analytics', {
      error: (error as Error).message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search analytics'
    });
  }
});

// Get Pinecone-specific metrics
router.get('/pinecone', async (req, res) => {
  try {
    // Mock Pinecone metrics - in production, call actual Pinecone service
    const pineconeMetrics = {
      indexStats: {
        totalVectorCount: 515,
        indexSize: 2.3,
        dimensionCount: 1024,
        indexState: 'Ready'
      },
      namespaceStats: {
        '__default__': {
          vectorCount: 515
        },
        'Document': {
          vectorCount: 128
        }
      },
      performance: {
        averageQueryLatency: 85,
        p95QueryLatency: 150,
        queriesPerSecond: 12.5,
        totalQueries: 156
      },
      usage: {
        writeOperations: 89,
        readOperations: 156,
        storageUtilization: 23.5
      }
    };

    res.json({
      success: true,
      metrics: pineconeMetrics
    });

  } catch (error) {
    logger.log('error', 'Failed to fetch Pinecone metrics', {
      error: (error as Error).message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Pinecone metrics'
    });
  }
});

// Get GKG-specific metrics
router.get('/gkg', async (req, res) => {
  try {
    // Mock GKG metrics - in production, call actual GKG service
    const gkgMetrics = {
      graphStats: {
        totalNodes: 1250,
        totalRelationships: 3400,
        nodeLabels: {
          Project: 180,
          Document: 420,
          Entity: 650
        },
        relationshipTypes: {
          CONTAINS: 1200,
          RELATED_TO: 800,
          DEPENDS_ON: 600,
          PART_OF: 800
        }
      },
      syncStatus: {
        lastSyncTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        syncStatus: 'Active',
        projectsSynced: 180,
        documentsSynced: 420,
        entitiesExtracted: 650,
        errors: 0
      },
      governance: {
        governanceDomains: 12,
        complianceScore: 87.5,
        riskAssessments: 45,
        auditTrails: 180
      },
      performance: {
        averageSyncTime: 125,
        lastSyncDuration: 89,
        totalSyncOperations: 1245
      }
    };

    res.json({
      success: true,
      metrics: gkgMetrics
    });

  } catch (error) {
    logger.log('error', 'Failed to fetch GKG metrics', {
      error: (error as Error).message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch GKG metrics'
    });
  }
});

// Performance testing endpoint
router.post('/test-performance', async (req, res) => {
  try {
    const { type, iterations = 10 } = req.body;
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();

      switch (type) {
        case 'embedding':
          await mongoDBEmbeddingService.generateEmbeddings(['Test query for performance'], 'query');
          break;
        case 'search':
          const testEmbedding = new Array(1024).fill(0).map(() => Math.random() - 0.5);
          await databaseService.vectorSearch(testEmbedding, 5);
          break;
        case 'rag':
          await ragService.processRAGQuery({
            query: 'Test query for performance testing',
            maxResults: 5,
            includeReranking: false
          });
          break;
        case 'pinecone':
          // Mock Pinecone search test
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
          break;
        case 'gkg':
          // Mock GKG sync test
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
          break;
      }

      const duration = Date.now() - start;
      results.push(duration);
      trackPerformance(type as any, duration);
    }

    const avgDuration = results.reduce((a, b) => a + b, 0) / results.length;
    const minDuration = Math.min(...results);
    const maxDuration = Math.max(...results);

    res.json({
      success: true,
      results: {
        iterations,
        average: Math.round(avgDuration),
        min: minDuration,
        max: maxDuration,
        all: results
      }
    });

  } catch (error) {
    logger.log('error', 'Performance test failed', {
      type: req.body.type,
      error: (error as Error).message
    });
    res.status(500).json({
      success: false,
      error: 'Performance test failed'
    });
  }
});

// Export performance tracking middleware
export { trackPerformance };

// Semantic RAG Metrics endpoints
router.get('/semantic-rag/metrics', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as string || '1h';
    
    // Mock semantic RAG metrics - replace with actual implementation
    const metrics = {
      totalQueries: Math.floor(1000 + Math.random() * 500),
      avgResponseTime: Math.floor(200 + Math.random() * 100),
      relevanceScore: 0.85 + Math.random() * 0.1,
      semanticAccuracy: 0.88 + Math.random() * 0.08,
      embeddingOptimization: 0.75 + Math.random() * 0.15,
      cacheHitRate: 0.6 + Math.random() * 0.2,
      queryDistribution: {
        semantic: 0.4 + Math.random() * 0.2,
        keyword: 0.2 + Math.random() * 0.1,
        hybrid: 0.3 + Math.random() * 0.15
      },
      performanceTrend: generatePerformanceTrend(timeRange)
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Failed to fetch semantic RAG metrics', {
      error: (error as Error).message,
      timeRange: req.query.timeRange
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch semantic RAG metrics'
    });
  }
});

router.post('/semantic-rag/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Mock settings update - replace with actual implementation
    logger.info('Updating semantic RAG settings', { settings });
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });

  } catch (error) {
    logger.error('Failed to update semantic RAG settings', {
      error: (error as Error).message,
      settings: req.body
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

router.post('/semantic-rag/test', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    // Mock search test - replace with actual implementation
    logger.info('Running semantic RAG test', { query });
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    const results = {
      query,
      results: [
        {
          id: '1',
          title: 'Project Governance Framework',
          content: 'Comprehensive governance framework for project management including best practices, methodologies, and compliance requirements...',
          relevanceScore: 0.92 + Math.random() * 0.05,
          semanticScore: 0.89 + Math.random() * 0.08,
          keywordScore: 0.85 + Math.random() * 0.1
        },
        {
          id: '2',
          title: 'Risk Management Strategies',
          content: 'Advanced risk management strategies for complex projects including identification, assessment, mitigation, and monitoring techniques...',
          relevanceScore: 0.85 + Math.random() * 0.08,
          semanticScore: 0.82 + Math.random() * 0.1,
          keywordScore: 0.78 + Math.random() * 0.12
        },
        {
          id: '3',
          title: 'Stakeholder Engagement',
          content: 'Best practices for stakeholder engagement and communication including identification, analysis, engagement planning, and relationship management...',
          relevanceScore: 0.78 + Math.random() * 0.1,
          semanticScore: 0.81 + Math.random() * 0.08,
          keywordScore: 0.72 + Math.random() * 0.15
        }
      ].sort((a, b) => b.relevanceScore - a.relevanceScore),
      performance: {
        responseTime: Math.floor(150 + Math.random() * 100),
        cacheHit: Math.random() > 0.4,
        embeddingTime: Math.floor(30 + Math.random() * 30),
        rerankingTime: Math.floor(15 + Math.random() * 20)
      }
    };

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Semantic RAG test failed', {
      error: (error as Error).message,
      query: req.body.query
    });
    res.status(500).json({
      success: false,
      error: 'Search test failed'
    });
  }
});

// Helper function to generate performance trend data
function generatePerformanceTrend(timeRange: string) {
  const now = new Date();
  const trendData = [];
  let dataPoints = 24; // Default to 24 hours
  
  if (timeRange === '1h') {
    dataPoints = 12; // 5-minute intervals for 1 hour
  } else if (timeRange === '24h') {
    dataPoints = 24; // Hourly intervals for 24 hours
  } else if (timeRange === '7d') {
    dataPoints = 7; // Daily intervals for 7 days
  }
  
  for (let i = dataPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    trendData.push({
      timestamp: timestamp.toISOString(),
      responseTime: 200 + Math.random() * 100,
      relevanceScore: 0.8 + Math.random() * 0.15
    });
  }
  
  return trendData;
}

export default router;
