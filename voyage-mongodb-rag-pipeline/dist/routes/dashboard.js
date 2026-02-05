"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackPerformance = void 0;
const express_1 = require("express");
const database_1 = require("../services/database");
const mongoDBEmbeddings_1 = require("../services/mongoDBEmbeddings");
const rag_1 = require("../services/rag");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Performance metrics storage (in production, use Redis or database)
let performanceMetrics = {
    embeddingTimes: [],
    searchTimes: [],
    ragTimes: [],
    queries: [],
    lastUpdated: Date.now()
};
// Middleware to track performance
const trackPerformance = (type, duration) => {
    const metrics = performanceMetrics;
    switch (type) {
        case 'embedding':
            metrics.embeddingTimes.push(duration);
            if (metrics.embeddingTimes.length > 100)
                metrics.embeddingTimes.shift();
            break;
        case 'search':
            metrics.searchTimes.push(duration);
            if (metrics.searchTimes.length > 100)
                metrics.searchTimes.shift();
            break;
        case 'rag':
            metrics.ragTimes.push(duration);
            if (metrics.ragTimes.length > 100)
                metrics.ragTimes.shift();
            break;
    }
    metrics.lastUpdated = Date.now();
};
exports.trackPerformance = trackPerformance;
// Get comprehensive dashboard metrics
router.get('/metrics', async (req, res) => {
    try {
        const stats = await database_1.databaseService.getStats();
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
                    limit: 3 // From your MongoDB Atlas rate limits
                }
            }
        };
        res.json({
            success: true,
            metrics,
            lastUpdated: performanceMetrics.lastUpdated
        });
    }
    catch (error) {
        logger_1.logger.log('error', 'Failed to fetch dashboard metrics', {
            error: error.message
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
        const timeRange = req.query.timeRange || '1h';
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
    }
    catch (error) {
        logger_1.logger.log('error', 'Failed to fetch realtime data', {
            error: error.message
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
        await database_1.databaseService.connect();
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
        const embeddingStats = await database_1.databaseService.chunksCollection.aggregate(pipeline).toArray();
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
        const sizeDistribution = await database_1.databaseService.chunksCollection.aggregate(sizePipeline).toArray();
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
    }
    catch (error) {
        logger_1.logger.log('error', 'Failed to fetch embedding analytics', {
            error: error.message
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
    }
    catch (error) {
        logger_1.logger.log('error', 'Failed to fetch search analytics', {
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch search analytics'
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
                    await mongoDBEmbeddings_1.mongoDBEmbeddingService.generateEmbeddings(['Test query for performance'], 'query');
                    break;
                case 'search':
                    const testEmbedding = new Array(1024).fill(0).map(() => Math.random() - 0.5);
                    await database_1.databaseService.vectorSearch(testEmbedding, 5);
                    break;
                case 'rag':
                    await rag_1.ragService.processRAGQuery({
                        query: 'Test query for performance testing',
                        maxResults: 5,
                        includeReranking: false
                    });
                    break;
            }
            const duration = Date.now() - start;
            results.push(duration);
            trackPerformance(type, duration);
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
    }
    catch (error) {
        logger_1.logger.log('error', 'Performance test failed', {
            type: req.body.type,
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Performance test failed'
        });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map