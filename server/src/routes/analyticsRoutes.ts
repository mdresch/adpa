import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/analytics/rag
 * Retrieve RAG analytics summary
 */
router.get('/rag', async (req: Request, res: Response) => {
    try {
        const { timeRange = '24' } = req.query;
        const hours = parseInt(timeRange as string, 10) || 24;

        // Get summary statistics
        const summaryResult = await pool.query(
            'SELECT * FROM get_rag_analytics_summary($1)',
            [hours]
        );

        // Get recent errors
        const errorsResult = await pool.query(`
            SELECT 
                id, operation_type, document_id, error_message, 
                error_type, duration_ms, created_at
            FROM rag_analytics
            WHERE success = false 
                AND created_at >= NOW() - ($1 || ' hours')::INTERVAL
            ORDER BY created_at DESC
            LIMIT 20
        `, [hours]);

        res.json({
            timeRange: `${hours}h`,
            summary: summaryResult.rows,
            recentErrors: errorsResult.rows
        });
    } catch (error: any) {
        logger.error('[Analytics API] Failed to fetch RAG analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

/**
 * GET /api/analytics/rag/errors
 * Retrieve recent RAG errors
 */
router.get('/rag/errors', async (req: Request, res: Response) => {
    try {
        const { limit = '50', timeRange = '168' } = req.query; // Default 7 days
        const hours = parseInt(timeRange as string, 10);
        const rowLimit = parseInt(limit as string, 10);

        const result = await pool.query(`
            SELECT 
                id,
                operation_type,
                document_id,
                error_message,
                error_type,
                duration_ms,
                metadata,
                created_at
            FROM rag_analytics
            WHERE success = false 
                AND created_at >= NOW() - ($1 || ' hours')::INTERVAL
            ORDER BY created_at DESC
            LIMIT $2
        `, [hours, rowLimit]);

        res.json({
            errors: result.rows,
            count: result.rows.length
        });
    } catch (error: any) {
        logger.error('[Analytics API] Failed to fetch RAG errors:', error);
        res.status(500).json({ error: 'Failed to fetch errors' });
    }
});

/**
 * GET /api/analytics/rag/performance
 * Retrieve performance metrics
 */
router.get('/rag/performance', async (req: Request, res: Response) => {
    try {
        const { timeRange = '24' } = req.query;
        const hours = parseInt(timeRange as string, 10) || 24;

        // Get performance statistics
        const perfResult = await pool.query(`
            SELECT 
                operation_type,
                COUNT(*) as total_operations,
                AVG(duration_ms) as avg_latency_ms,
                MIN(duration_ms) as min_latency_ms,
                MAX(duration_ms) as max_latency_ms,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50_latency_ms,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_latency_ms,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_latency_ms,
                COUNT(*) FILTER (WHERE success = true) as success_count,
                COUNT(*) FILTER (WHERE success = false) as failure_count,
                ROUND((COUNT(*) FILTER (WHERE success = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as success_rate
            FROM rag_analytics
            WHERE created_at >= NOW() - ($1 || ' hours')::INTERVAL
            GROUP BY operation_type
        `, [hours]);

        // Calculate throughput (operations per minute)
        const throughputResult = await pool.query(`
            SELECT 
                operation_type,
                ROUND((COUNT(*)::NUMERIC / NULLIF($1::NUMERIC / 60, 0)), 2) as ops_per_minute
            FROM rag_analytics
            WHERE created_at >= NOW() - ($1 || ' hours')::INTERVAL
            GROUP BY operation_type
        `, [hours]);

        const throughputMap = throughputResult.rows.reduce((acc, row) => {
            acc[row.operation_type] = row.ops_per_minute;
            return acc;
        }, {} as Record<string, number>);

        const metrics = perfResult.rows.map(row => ({
            ...row,
            throughput_ops_per_minute: throughputMap[row.operation_type] || 0
        }));

        res.json({
            timeRange: `${hours}h`,
            metrics
        });
    } catch (error: any) {
        logger.error('[Analytics API] Failed to fetch performance metrics:', error);
        res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
});

/**
 * GET /api/analytics/rag/timeseries
 * Retrieve time-series data for charts
 */
router.get('/rag/timeseries', async (req: Request, res: Response) => {
    try {
        const { days = '7', operation = 'ingest' } = req.query;
        const daysBack = parseInt(days as string, 10) || 7;

        if (operation === 'ingest') {
            // Use the specialized function for ingestion
            const result = await pool.query(
                'SELECT * FROM get_hourly_rag_ingestion($1)',
                [daysBack]
            );

            res.json({
                operation: 'ingest',
                granularity: 'hourly',
                days: daysBack,
                data: result.rows
            });
        } else {
            // Generic hourly aggregation for other operations
            const result = await pool.query(`
                SELECT 
                    date_trunc('hour', created_at) as hour_bucket,
                    COUNT(*) FILTER (WHERE success = true) as successful_count,
                    COUNT(*) FILTER (WHERE success = false) as failed_count,
                    AVG(duration_ms) as avg_duration_ms
                FROM rag_analytics
                WHERE operation_type = $1
                    AND created_at >= NOW() - ($2 || ' days')::INTERVAL
                GROUP BY hour_bucket
                ORDER BY hour_bucket DESC
            `, [operation, daysBack]);

            res.json({
                operation,
                granularity: 'hourly',
                days: daysBack,
                data: result.rows
            });
        }
    } catch (error: any) {
        logger.error('[Analytics API] Failed to fetch time-series data:', error);
        res.status(500).json({ error: 'Failed to fetch time-series data' });
    }
});

export default router;
