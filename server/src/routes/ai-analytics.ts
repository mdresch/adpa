/**
 * AI Analytics API Routes
 * Provides detailed analytics for AI model usage, performance, and trends
 */

import { Router } from 'express'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateQuery } from '../middleware/validation'
import Joi from 'joi'
import { childLogger } from '../utils/logger'
import { pool } from '../database/connection'

const router = Router()
const log = childLogger({ service: 'ai-analytics' })

/**
 * GET /api/ai-analytics/models
 * Get detailed AI model usage analytics
 */
router.get("/models",
  authenticateToken,
  requirePermission("analytics.system"),
  validateQuery(Joi.object({
    period: Joi.string().valid("7d", "30d", "90d", "1y").default("30d"),
  })),
  async (req, res) => {
    try {
      const { period = "30d" } = req.query
      
      // Convert period to interval
      const intervalMap = {
        "7d": "7 days",
        "30d": "30 days", 
        "90d": "90 days",
        "1y": "1 year",
      }
      const interval = intervalMap[period as keyof typeof intervalMap]
      
      log.info(`Fetching AI model analytics for period: ${String(period)}`)
      
      // Get model usage over time
      const usageOverTime = await pool.query(`
        SELECT 
          DATE_TRUNC('day', al.created_at) as date,
          ap.name as provider_name,
          ap.provider_type,
          COUNT(*) as usage_count,
          SUM(COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)) as total_tokens
        FROM audit_logs al
        JOIN ai_providers ap ON al.resource_id::uuid = ap.id
        WHERE al.action = 'ai_generate' 
          AND al.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', al.created_at), ap.id, ap.name, ap.provider_type
        ORDER BY date, provider_name
      `)
      
      // Transform usage over time data for chart
      const usageDataMap = new Map()
      usageOverTime.rows.forEach(row => {
        const date = row.date.toISOString().split('T')[0]
        if (!usageDataMap.has(date)) {
          usageDataMap.set(date, { date })
        }
        usageDataMap.get(date)[row.provider_name] = row.usage_count
      })
      const usageOverTimeFormatted = Array.from(usageDataMap.values())
      
      // Get provider statistics
      const providerStats = await pool.query(`
        SELECT 
          ap.name as provider_name,
          ap.provider_type,
          COUNT(al.*) as usage_count,
          SUM(COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)) as total_tokens,
          AVG(COALESCE((al.new_values->>'response_time')::int, 0)) as avg_response_time,
          (COUNT(*) FILTER (WHERE al.new_values->>'success' = 'true') * 100.0 / COUNT(*)) as success_rate
        FROM audit_logs al
        JOIN ai_providers ap ON al.resource_id::uuid = ap.id
        WHERE al.action = 'ai_generate' 
          AND al.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY ap.id, ap.name, ap.provider_type
        ORDER BY usage_count DESC
      `)
      
      // Get model-specific statistics
      const modelStats = await pool.query(`
        SELECT 
          COALESCE(al.new_values->>'model', 'unknown') as model_name,
          ap.name as provider_name,
          ap.provider_type,
          COUNT(al.*) as usage_count,
          SUM(COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)) as total_tokens,
          AVG(COALESCE((al.new_values->>'response_time')::int, 0)) as avg_response_time,
          (COUNT(*) FILTER (WHERE al.new_values->>'success' = 'true') * 100.0 / COUNT(*)) as success_rate
        FROM audit_logs al
        JOIN ai_providers ap ON al.resource_id::uuid = ap.id
        WHERE al.action = 'ai_generate' 
          AND al.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY al.new_values->>'model', ap.id, ap.name, ap.provider_type
        ORDER BY usage_count DESC
      `)
      
      // Get hourly usage patterns
      const hourlyUsage = await pool.query(`
        SELECT 
          EXTRACT(HOUR FROM al.created_at) as hour,
          COUNT(*) as usage_count
        FROM audit_logs al
        WHERE al.action = 'ai_generate' 
          AND al.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY EXTRACT(HOUR FROM al.created_at)
        ORDER BY hour
      `)
      
      // Get error patterns
      const errorPatterns = await pool.query(`
        SELECT 
          ap.name as provider_name,
          al.new_values->>'error_type' as error_type,
          COUNT(*) as error_count
        FROM audit_logs al
        JOIN ai_providers ap ON al.resource_id::uuid = ap.id
        WHERE al.action = 'ai_generate' 
          AND al.created_at >= NOW() - INTERVAL '${interval}'
          AND al.new_values->>'success' = 'false'
        GROUP BY ap.name, al.new_values->>'error_type'
        ORDER BY error_count DESC
      `)
      
      // Get token usage efficiency
      const tokenEfficiency = await pool.query(`
        SELECT 
          ap.name as provider_name,
          COALESCE(al.new_values->>'model', 'unknown') as model_name,
          AVG(COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)) as avg_tokens_per_request,
          AVG(COALESCE((al.new_values->>'response_time')::int, 0)) as avg_response_time,
          COUNT(*) as request_count
        FROM audit_logs al
        JOIN ai_providers ap ON al.resource_id::uuid = ap.id
        WHERE al.action = 'ai_generate' 
          AND al.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY ap.name, al.new_values->>'model'
        ORDER BY avg_tokens_per_request DESC
      `)
      
      // Debug: Check for suspicious token counts
      log.info(`📊 Provider stats raw data:`, {
        providers: providerStats.rows.map(p => ({
          name: p.provider_name,
          usage_count: p.usage_count,
          total_tokens: p.total_tokens,
          total_tokens_type: typeof p.total_tokens
        }))
      })
      
      const analytics = {
        success: true,
        period,
        usageOverTime: usageOverTimeFormatted,
        providerStats: providerStats.rows,
        modelStats: modelStats.rows,
        hourlyUsage: hourlyUsage.rows,
        errorPatterns: errorPatterns.rows,
        tokenEfficiency: tokenEfficiency.rows,
        summary: {
          totalRequests: providerStats.rows.reduce((sum, p) => sum + Number(p.usage_count || 0), 0),
          totalTokens: providerStats.rows.reduce((sum, p) => sum + Number(p.total_tokens || 0), 0),
          avgResponseTime: providerStats.rows.length > 0
            ? providerStats.rows.reduce((sum, p) => sum + Number(p.avg_response_time || 0), 0) / providerStats.rows.length
            : 0,
          overallSuccessRate: providerStats.rows.length > 0
            ? providerStats.rows.reduce((sum, p) => sum + Number(p.success_rate || 0), 0) / providerStats.rows.length
            : 0
        }
      }
      
      log.info(`AI analytics fetched successfully for period: ${period}`, {
        summary: analytics.summary
      })
      res.json(analytics)
      
    } catch (error) {
      log.error("AI analytics error:", error)
      res.status(500).json({ error: "Failed to fetch AI analytics" })
    }
  }
)

/**
 * GET /api/ai-analytics/providers/:providerId
 * Get detailed analytics for a specific AI provider
 */
router.get("/providers/:providerId",
  authenticateToken,
  requirePermission("analytics.system"),
  validateQuery(Joi.object({
    period: Joi.string().valid("7d", "30d", "90d", "1y").default("30d"),
  })),
  async (req, res) => {
    try {
      const { providerId } = req.params
      const { period = "30d" } = req.query
      
      const intervalMap = {
        "7d": "7 days",
        "30d": "30 days", 
        "90d": "90 days",
        "1y": "1 year",
      }
      const interval = intervalMap[period as keyof typeof intervalMap]
      
      // Get provider details
      const providerResult = await pool.query(`
        SELECT * FROM ai_providers WHERE id = $1
      `, [providerId])
      
      if (providerResult.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found" })
      }
      
      const provider = providerResult.rows[0]
      
      // Get provider-specific usage over time
      const usageOverTime = await pool.query(`
        SELECT 
          DATE_TRUNC('day', al.created_at) as date,
          COUNT(*) as usage_count,
          SUM(COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)) as total_tokens,
          AVG(COALESCE((al.new_values->>'response_time')::int, 0)) as avg_response_time
        FROM audit_logs al
        WHERE al.action = 'ai_generate' 
          AND al.resource_id::uuid = $1
          AND al.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', al.created_at)
        ORDER BY date
      `, [providerId])
      
      // Get model usage for this provider
      const modelUsage = await pool.query(`
        SELECT 
          COALESCE(al.new_values->>'model', 'unknown') as model_name,
          COUNT(*) as usage_count,
          SUM(COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)) as total_tokens,
          AVG(COALESCE((al.new_values->>'response_time')::int, 0)) as avg_response_time,
          (COUNT(*) FILTER (WHERE al.new_values->>'success' = 'true') * 100.0 / COUNT(*)) as success_rate
        FROM audit_logs al
        WHERE al.action = 'ai_generate' 
          AND al.resource_id::uuid = $1
          AND al.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY al.new_values->>'model'
        ORDER BY usage_count DESC
      `, [providerId])
      
      // Get error analysis
      const errorAnalysis = await pool.query(`
        SELECT 
          al.new_values->>'error_type' as error_type,
          al.new_values->>'error_message' as error_message,
          COUNT(*) as error_count,
          MAX(al.created_at) as last_occurrence
        FROM audit_logs al
        WHERE al.action = 'ai_generate' 
          AND al.resource_id::uuid = $1
          AND al.created_at >= NOW() - INTERVAL '${interval}'
          AND al.new_values->>'success' = 'false'
        GROUP BY al.new_values->>'error_type', al.new_values->>'error_message'
        ORDER BY error_count DESC
        LIMIT 10
      `, [providerId])
      
      const analytics = {
        success: true,
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.provider_type,
          is_active: provider.is_active
        },
        period,
        usageOverTime: usageOverTime.rows,
        modelUsage: modelUsage.rows,
        errorAnalysis: errorAnalysis.rows,
        summary: {
          totalRequests: usageOverTime.rows.reduce((sum, u) => sum + Number(u.usage_count || 0), 0),
          totalTokens: usageOverTime.rows.reduce((sum, u) => sum + Number(u.total_tokens || 0), 0),
          avgResponseTime: usageOverTime.rows.length > 0 
            ? usageOverTime.rows.reduce((sum, u) => sum + Number(u.avg_response_time || 0), 0) / usageOverTime.rows.length 
            : 0,
          totalErrors: errorAnalysis.rows.reduce((sum, e) => sum + Number(e.error_count || 0), 0)
        }
      }
      
      log.info(`Provider analytics fetched for: ${provider.name}`)
      res.json(analytics)
      
    } catch (error) {
      log.error("Provider analytics error:", error)
      res.status(500).json({ error: "Failed to fetch provider analytics" })
    }
  }
)

/**
 * GET /api/ai-analytics/trends
 * Get AI usage trends and predictions
 */
router.get("/trends",
  authenticateToken,
  requirePermission("analytics.system"),
  validateQuery(Joi.object({
    period: Joi.string().valid("7d", "30d", "90d", "1y").default("30d"),
  })),
  async (req, res) => {
    try {
      const { period = "30d" } = req.query
      
      const intervalMap = {
        "7d": "7 days",
        "30d": "30 days", 
        "90d": "90 days",
        "1y": "1 year",
      }
      const interval = intervalMap[period as keyof typeof intervalMap]
      
      // Get usage trends
      const usageTrends = await pool.query(`
        SELECT 
          DATE_TRUNC('day', al.created_at) as date,
          COUNT(*) as daily_requests,
          SUM(COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)) as daily_tokens,
          AVG(COALESCE((al.new_values->>'response_time')::int, 0)) as avg_response_time
        FROM audit_logs al
        WHERE al.action = 'ai_generate' 
          AND al.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', al.created_at)
        ORDER BY date
      `)
      
      // Calculate growth rates
      const trends = usageTrends.rows
      let requestGrowth = 0
      let tokenGrowth = 0
      
      if (trends.length >= 2) {
        const recent = trends.slice(-7) // Last 7 days
        const previous = trends.slice(-14, -7) // Previous 7 days
        
        if (previous.length > 0) {
          const recentAvg = recent.reduce((sum, t) => sum + t.daily_requests, 0) / recent.length
          const previousAvg = previous.reduce((sum, t) => sum + t.daily_requests, 0) / previous.length
          requestGrowth = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0
          
          const recentTokenAvg = recent.reduce((sum, t) => sum + t.daily_tokens, 0) / recent.length
          const previousTokenAvg = previous.reduce((sum, t) => sum + t.daily_tokens, 0) / previous.length
          tokenGrowth = previousTokenAvg > 0 ? ((recentTokenAvg - previousTokenAvg) / previousTokenAvg) * 100 : 0
        }
      }
      
      // Get peak usage times
      const peakUsage = await pool.query(`
        SELECT 
          EXTRACT(HOUR FROM al.created_at) as hour,
          COUNT(*) as usage_count
        FROM audit_logs al
        WHERE al.action = 'ai_generate' 
          AND al.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY EXTRACT(HOUR FROM al.created_at)
        ORDER BY usage_count DESC
        LIMIT 5
      `)
      
      const trendsData = {
        success: true,
        period,
        usageTrends: trends,
        growthRates: {
          requests: requestGrowth,
          tokens: tokenGrowth
        },
        peakUsageHours: peakUsage.rows,
        insights: {
          busiestHour: peakUsage.rows[0]?.hour || 0,
          totalRequests: trends.reduce((sum, t) => sum + t.daily_requests, 0),
          totalTokens: trends.reduce((sum, t) => sum + t.daily_tokens, 0),
          avgDailyRequests: trends.length > 0 ? trends.reduce((sum, t) => sum + t.daily_requests, 0) / trends.length : 0
        }
      }
      
      log.info(`AI trends fetched for period: ${period}`)
      res.json(trendsData)
      
    } catch (error) {
      log.error("AI trends error:", error)
      res.status(500).json({ error: "Failed to fetch AI trends" })
    }
  }
)

export default router
