/**
 * Prometheus Metrics Route
 * Phase 5.5: Testing and Performance Monitoring - Prometheus Integration
 * 
 * Exposes /metrics endpoint in Prometheus format
 */

import express from 'express'
import { PrometheusMetrics } from '../utils/prometheusMetrics'
import { getQueueServiceInstance } from '../services/queueService'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * GET /metrics
 * Prometheus metrics endpoint
 * 
 * Returns metrics in Prometheus text format:
 * - Queue job counts (waiting, active, completed, failed, delayed)
 * - Performance metrics (operation durations, percentiles)
 * - Cache statistics (hits, misses, hit rates)
 */
router.get('/metrics', async (req, res) => {
  try {
    // Update queue metrics from all registered queues
    const queueService = await getQueueServiceInstance()
    const allQueues = queueService.getAllQueues()

    // Update metrics for each queue
    const updatePromises = Array.from(allQueues.entries()).map(([queueName, queue]) =>
      PrometheusMetrics.updateQueueMetrics(queueName, queue)
    )
    await Promise.all(updatePromises)

    // Get formatted metrics
    const metrics = PrometheusMetrics.getMetrics()

    // Set Prometheus content type
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    res.status(200).send(metrics)
  } catch (error) {
    logger.error('Error generating Prometheus metrics:', error)
    res.status(500).send('# Error generating metrics\n')
  }
})

export default router
