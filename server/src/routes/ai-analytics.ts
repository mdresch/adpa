/**
 * AI Analytics API Routes
 * Provides detailed analytics for AI model usage, performance, and trends
 */

import { Router } from 'express'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateQuery, validateParams } from '../middleware/validation'
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
      
      // Get model usage over time - Group by provider_type to consolidate duplicates
      // Use UTC timezone for consistent date grouping
      const usageOverTime = await pool.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') as date,
          COALESCE(ap.provider_type, aul.provider_type) as provider_type,
          COALESCE(MIN(ap.name), INITCAP(COALESCE(ap.provider_type, aul.provider_type))) as provider_name,
          COUNT(*)::int as usage_count,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens
        FROM ai_usage_logs aul
        LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
        WHERE aul.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC'), COALESCE(ap.provider_type, aul.provider_type)
        ORDER BY date, provider_type
      `)
      
      // Transform usage over time data for chart
      const usageDataMap = new Map()
      if (!usageOverTime || !usageOverTime.rows) {
        log.error('Usage over time query returned null or no rows')
        throw new Error('Failed to fetch usage over time data')
      }
      usageOverTime.rows.forEach(row => {
        // TO_CHAR returns date as string in YYYY-MM-DD format (UTC, no timezone conversion)
        const dateStr = typeof row.date === 'string' 
          ? row.date.split('T')[0] // Already a string from TO_CHAR, just remove time if present
          : String(row.date).split('T')[0] // Fallback for edge cases
        
        if (!usageDataMap.has(dateStr)) {
          usageDataMap.set(dateStr, { date: dateStr })
        }
        // Bug 4 Fix: Ensure provider_name is used as key, matching frontend expectations
        // The provider_name comes from COALESCE(MIN(ap.name), INITCAP(...)) in the query
        const providerKey = row.provider_name || String(row.provider_type || 'unknown')
        usageDataMap.get(dateStr)[providerKey] = row.usage_count
      })
      
      const usageOverTimeFormatted = Array.from(usageDataMap.values())
      
      // Get provider statistics - Group by provider_type to consolidate duplicates
      const providerStats = await pool.query(`
        SELECT 
          COALESCE(ap.provider_type, aul.provider_type) as provider_type,
          COALESCE(MIN(ap.name), INITCAP(COALESCE(ap.provider_type, aul.provider_type))) as provider_name,
          COUNT(*)::int as usage_count,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
          COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time,
          (COUNT(*) FILTER (WHERE aul.success = true) * 100.0 / NULLIF(COUNT(*), 0)) as success_rate
        FROM ai_usage_logs aul
        LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
        WHERE aul.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY COALESCE(ap.provider_type, aul.provider_type)
        ORDER BY usage_count DESC
      `)
      
      // Get model-specific statistics - Group by provider_type to consolidate duplicates
      // Filter out obvious test data: exactly 450 tokens, 675ms response, test model names
      const modelStats = await pool.query(`
        SELECT 
          COALESCE(aul.model_name, 'unknown') as model_name,
          COALESCE(ap.provider_type, aul.provider_type) as provider_type,
          COALESCE(MIN(ap.name), INITCAP(COALESCE(ap.provider_type, aul.provider_type))) as provider_name,
          COUNT(*)::int as usage_count,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
          COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time,
          (COUNT(*) FILTER (WHERE aul.success = true) * 100.0 / NULLIF(COUNT(*), 0)) as success_rate
        FROM ai_usage_logs aul
        LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
        WHERE aul.created_at >= NOW() - INTERVAL '${interval}'
          -- Filter out obvious test data: exactly 450 tokens with 675ms response and test model names
          AND NOT (
            aul.total_tokens = 450 
            AND aul.response_time_ms BETWEEN 670 AND 680
            AND (COALESCE(aul.model_name, '') LIKE 'test%' OR COALESCE(aul.model_name, '') = '')
          )
        GROUP BY COALESCE(aul.model_name, 'unknown'), COALESCE(ap.provider_type, aul.provider_type)
        HAVING COUNT(*) > 1 OR SUM(aul.total_tokens) > 1000  -- Filter out single test requests with minimal tokens
        ORDER BY usage_count DESC
      `)
      
      // Get hourly usage patterns
      const hourlyUsage = await pool.query(`
        SELECT 
          EXTRACT(HOUR FROM aul.created_at) as hour,
          COUNT(*)::int as usage_count
        FROM ai_usage_logs aul
        WHERE aul.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY EXTRACT(HOUR FROM aul.created_at)
        ORDER BY hour
      `)
      
      // Get error patterns - Group by provider_type to consolidate duplicates
      const errorPatterns = await pool.query(`
        SELECT 
          COALESCE(ap.provider_type, aul.provider_type) as provider_type,
          COALESCE(MIN(ap.name), INITCAP(COALESCE(ap.provider_type, aul.provider_type))) as provider_name,
          COALESCE(aul.status_code::text, 'error') as error_type,
          COUNT(*)::int as error_count
        FROM ai_usage_logs aul
        LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
        WHERE aul.created_at >= NOW() - INTERVAL '${interval}'
          AND aul.success = false
        GROUP BY COALESCE(ap.provider_type, aul.provider_type), COALESCE(aul.status_code::text, 'error')
        ORDER BY error_count DESC
      `)
      
      // Get token usage efficiency - Group by provider_type to consolidate duplicates
      const tokenEfficiency = await pool.query(`
        SELECT 
          COALESCE(ap.provider_type, aul.provider_type) as provider_type,
          COALESCE(MIN(ap.name), INITCAP(COALESCE(ap.provider_type, aul.provider_type))) as provider_name,
          COALESCE(aul.model_name, 'unknown') as model_name,
          COALESCE(AVG(aul.total_tokens), 0)::numeric as avg_tokens_per_request,
          COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time,
          COUNT(*)::int as request_count
        FROM ai_usage_logs aul
        LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
        WHERE aul.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY COALESCE(ap.provider_type, aul.provider_type), COALESCE(aul.model_name, 'unknown')
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
      
    } catch (error: any) {
      log.error("AI analytics error:", error)
      const errorMessage = error?.message || String(error)
      const isSqlError = errorMessage.includes('column') || errorMessage.includes('ambiguous') || errorMessage.includes('syntax')
      res.status(500).json({ 
        error: "Failed to fetch AI analytics",
        details: isSqlError ? errorMessage : undefined
      })
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
          DATE_TRUNC('day', aul.created_at) as date,
          COUNT(*)::int as usage_count,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
          COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time
        FROM ai_usage_logs aul
        WHERE aul.provider_id::uuid = $1
          AND aul.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', aul.created_at)
        ORDER BY date
      `, [providerId])
      
      // Get model usage for this provider
      const modelUsage = await pool.query(`
        SELECT 
          COALESCE(aul.model_name, 'unknown') as model_name,
          COUNT(*)::int as usage_count,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
          COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time,
          (COUNT(*) FILTER (WHERE aul.success = true) * 100.0 / NULLIF(COUNT(*), 0)) as success_rate
        FROM ai_usage_logs aul
        WHERE aul.provider_id::uuid = $1
          AND aul.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY model_name
        ORDER BY usage_count DESC
      `, [providerId])
      
      // Get error analysis
      const errorAnalysis = await pool.query(`
        SELECT 
          COALESCE(aul.status_code::text, 'error') as error_type,
          COALESCE(aul.error_message, 'Unknown error') as error_message,
          COUNT(*)::int as error_count,
          MAX(aul.created_at) as last_occurrence
        FROM ai_usage_logs aul
        WHERE aul.provider_id::uuid = $1
          AND aul.created_at >= NOW() - INTERVAL '${interval}'
          AND aul.success = false
        GROUP BY error_type, error_message
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
          DATE_TRUNC('day', aul.created_at) as date,
          COUNT(*)::int as daily_requests,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as daily_tokens,
          COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time
        FROM ai_usage_logs aul
        WHERE aul.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', aul.created_at)
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
          EXTRACT(HOUR FROM aul.created_at) as hour,
          COUNT(*)::int as usage_count
        FROM ai_usage_logs aul
        WHERE aul.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY EXTRACT(HOUR FROM aul.created_at)
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

/**
 * GET /api/ai-analytics/models/:providerId/:modelName
 * Get detailed analytics for a specific model of a specific provider
 */
router.get("/models/:providerId/:modelName",
  authenticateToken,
  requirePermission("analytics.system"),
  validateQuery(Joi.object({
    period: Joi.string().valid("7d", "30d", "90d", "1y").default("30d"),
  })),
  async (req, res) => {
    try {
      const { providerId, modelName } = req.params
      const { period = "30d" } = req.query
      
      const intervalMap = {
        "7d": "7 days",
        "30d": "30 days", 
        "90d": "90 days",
        "1y": "1 year",
      }
      const interval = intervalMap[period as keyof typeof intervalMap]
      
      log.info(`Fetching model analytics: ${modelName} for provider ${providerId}`)
      
      // Get provider details
      const providerResult = await pool.query(`
        SELECT * FROM ai_providers WHERE id = $1
      `, [providerId])
      
      if (providerResult.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found" })
      }
      
      const provider = providerResult.rows[0]
      
      // Get model-specific usage over time
      const usageOverTime = await pool.query(`
        SELECT 
          DATE_TRUNC('day', aul.created_at) as date,
          COUNT(*)::int as usage_count,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
          COALESCE(SUM(aul.input_tokens), 0)::numeric as prompt_tokens,
          COALESCE(SUM(aul.output_tokens), 0)::numeric as completion_tokens,
          COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time,
          COUNT(*) FILTER (WHERE aul.success = true)::int as successful_requests,
          COUNT(*) FILTER (WHERE aul.success = false)::int as failed_requests
        FROM ai_usage_logs aul
        WHERE aul.provider_id::uuid = $1
          AND aul.model_name = $2
          AND aul.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', aul.created_at)
        ORDER BY date
      `, [providerId, modelName])
      
      // Get error analysis for this specific model
      const errorAnalysis = await pool.query(`
        SELECT 
          COALESCE(aul.status_code::text, 'error') as error_type,
          COALESCE(aul.error_message, 'Unknown error') as error_message,
          COUNT(*)::int as error_count,
          MAX(aul.created_at) as last_occurrence
        FROM ai_usage_logs aul
        WHERE aul.provider_id::uuid = $1
          AND aul.model_name = $2
          AND aul.created_at >= NOW() - INTERVAL '${interval}'
          AND aul.success = false
        GROUP BY error_type, error_message
        ORDER BY error_count DESC
        LIMIT 10
      `, [providerId, modelName])
      
      // Get prompt analysis (common patterns, lengths)
      const promptAnalysis = await pool.query(`
        SELECT 
          COALESCE(LENGTH(aul.request_payload::text), 0) as prompt_length,
          COUNT(*)::int as count
        FROM ai_usage_logs aul
        WHERE aul.provider_id::uuid = $1
          AND aul.model_name = $2
          AND aul.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY COALESCE(LENGTH(aul.request_payload::text), 0)
        ORDER BY count DESC
        LIMIT 10
      `, [providerId, modelName])
      
      // Calculate summary
      const totalRequests = usageOverTime.rows.reduce((sum, u) => sum + Number(u.usage_count || 0), 0)
      const totalTokens = usageOverTime.rows.reduce((sum, u) => sum + Number(u.total_tokens || 0), 0)
      const totalPromptTokens = usageOverTime.rows.reduce((sum, u) => sum + Number(u.prompt_tokens || 0), 0)
      const totalCompletionTokens = usageOverTime.rows.reduce((sum, u) => sum + Number(u.completion_tokens || 0), 0)
      const successfulRequests = usageOverTime.rows.reduce((sum, u) => sum + Number(u.successful_requests || 0), 0)
      const failedRequests = usageOverTime.rows.reduce((sum, u) => sum + Number(u.failed_requests || 0), 0)
      const avgResponseTime = usageOverTime.rows.length > 0
        ? usageOverTime.rows.reduce((sum, u) => sum + Number(u.avg_response_time || 0), 0) / usageOverTime.rows.length
        : 0
      
      const analytics = {
        success: true,
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.provider_type
        },
        model: {
          name: modelName
        },
        period,
        usageOverTime: usageOverTime.rows,
        errorAnalysis: errorAnalysis.rows,
        promptAnalysis: promptAnalysis.rows,
        summary: {
          totalRequests,
          totalTokens,
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          successfulRequests,
          failedRequests,
          successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
          avgResponseTime,
          avgTokensPerRequest: totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0
        }
      }
      
      log.info(`Model analytics fetched: ${modelName} (${totalRequests} requests)`)
      res.json(analytics)
      
    } catch (error) {
      log.error("Model analytics error:", error)
      res.status(500).json({ error: "Failed to fetch model analytics" })
    }
  }
)

/**
 * GET /api/ai-analytics/daily/:date
 * Get detailed breakdown for a specific date (hourly, by provider, by model, by user)
 */
router.get("/daily/:date",
  authenticateToken,
  requirePermission("analytics.system"),
  validateParams(Joi.object({
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  })),
  async (req, res) => {
    try {
      const { date } = req.params
      // date is in format YYYY-MM-DD - treat it as a UTC calendar date
      // SOLUTION 1: Parse date string to UTC timestamps and use timestamp range queries
      // This eliminates timezone interpretation issues by comparing timestamps directly
      log.info(`Fetching daily breakdown for date: ${date}`)
      
      // CRITICAL FIX: Use the same DATE_TRUNC logic as the main analytics query
      // The main analytics query uses: DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date
      // This groups timestamps by their UTC day, which may differ from strict UTC timestamp ranges
      // We must match this logic exactly to get consistent results
      
      // Parse the date string to UTC timestamps (for logging and comparison)
      const [year, month, day] = date.split('-').map(Number)
      const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      const endUTC = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))
      
      // Log the UTC timestamp range being queried
      log.info(`Date ${date} parsed to UTC timestamp range:`, {
        dateString: date,
        startUTC: startUTC.toISOString(),
        endUTC: endUTC.toISOString(),
        startUTC_epoch: startUTC.getTime(),
        endUTC_epoch: endUTC.getTime()
      })
      
      log.info(`Using DATE_TRUNC logic to match main analytics query for date: ${date}`)
      
      // Debug: Verify what data exists in the UTC timestamp range
      let rangeCheck: any = null
      try {
        rangeCheck = await pool.query(`
          SELECT 
            DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date as date,
            COUNT(*)::int as usage_count,
            COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
            MIN(aul.created_at)::text as min_ts,
            MAX(aul.created_at)::text as max_ts
          FROM ai_usage_logs aul
          WHERE aul.created_at >= $1::timestamptz
            AND aul.created_at < $2::timestamptz
          GROUP BY DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date
          ORDER BY date
        `, [startUTC.toISOString(), endUTC.toISOString()])
        
        if (rangeCheck && rangeCheck.rows && rangeCheck.rows.length > 0) {
          log.info(`Data found in UTC timestamp range [${startUTC.toISOString()}, ${endUTC.toISOString()}):`, 
            JSON.stringify(rangeCheck.rows, null, 2))
          
          // Also check what dates exist in a wider range to see if data is on adjacent days
          const widerRangeCheck = await pool.query(`
            SELECT 
              DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date as date,
              COUNT(*)::int as usage_count,
              COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
              MIN(aul.created_at)::text as min_ts,
              MAX(aul.created_at)::text as max_ts
            FROM ai_usage_logs aul
            WHERE aul.created_at >= (($1::text)::date - INTERVAL '2 days')::timestamptz
              AND aul.created_at < (($1::text)::date + INTERVAL '2 days')::timestamptz
            GROUP BY DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date
            ORDER BY date
          `, [date])
          
          if (widerRangeCheck && widerRangeCheck.rows) {
            log.info(`Dates in wider range (${date} ± 2 days):`, JSON.stringify(widerRangeCheck.rows, null, 2))
            
            // Also check what the main table query would return for these dates (grouped by provider_type like frontend)
            const mainTableForWiderRange = await pool.query(`
              SELECT 
                DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date as date,
                COALESCE(ap.provider_type, aul.provider_type) as provider_type,
                COALESCE(MIN(ap.name), INITCAP(COALESCE(ap.provider_type, aul.provider_type))) as provider_name,
                COUNT(*)::int as usage_count,
                COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens
              FROM ai_usage_logs aul
              LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
              WHERE aul.created_at >= (($1::text)::date - INTERVAL '2 days')::timestamptz
                AND aul.created_at < (($1::text)::date + INTERVAL '2 days')::timestamptz
              GROUP BY DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC'), COALESCE(ap.provider_type, aul.provider_type)
              ORDER BY date, provider_type
            `, [date])
            
            if (mainTableForWiderRange && mainTableForWiderRange.rows) {
              const mainTableByDate = new Map()
              mainTableForWiderRange.rows.forEach((row: any) => {
                const dateStr = String(row.date).split('T')[0]
                if (!mainTableByDate.has(dateStr)) {
                  mainTableByDate.set(dateStr, [])
                }
                mainTableByDate.get(dateStr).push({ provider: row.provider_name, count: row.usage_count })
              })
              
              const mainTableTotals = Array.from(mainTableByDate.entries()).map(([dateStr, providers]: [string, any[]]) => ({
                date: dateStr,
                total: providers.reduce((sum, p) => sum + p.count, 0),
                providers: providers
              }))
              
              log.info(`Main table query for wider range (grouped by provider_type like frontend):`, JSON.stringify(mainTableTotals, null, 2))
            }
          }
        } else {
          log.warn(`No data found in UTC timestamp range [${startUTC.toISOString()}, ${endUTC.toISOString()})`)
          
          // Check wider range if no data found
          const widerRangeCheck = await pool.query(`
            SELECT 
              DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date as date,
              COUNT(*)::int as usage_count,
              COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
              MIN(aul.created_at)::text as min_ts,
              MAX(aul.created_at)::text as max_ts
            FROM ai_usage_logs aul
            WHERE aul.created_at >= (($1::text)::date - INTERVAL '2 days')::timestamptz
              AND aul.created_at < (($1::text)::date + INTERVAL '2 days')::timestamptz
            GROUP BY DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date
            ORDER BY date
          `, [date])
          
          if (widerRangeCheck && widerRangeCheck.rows) {
            log.info(`Dates in wider range (${date} ± 2 days):`, JSON.stringify(widerRangeCheck.rows, null, 2))
          }
        }
      } catch (error: any) {
        log.error(`Error in range check query:`, error.message)
      }
      
      // Also check what the table query would return for this date (for comparison)
      let tableQueryCheck: any = null
      let mainTableQueryCheck: any = null
      try {
        tableQueryCheck = await pool.query(`
          SELECT 
            DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date as date,
            COUNT(*)::int as usage_count,
            COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens
          FROM ai_usage_logs aul
          WHERE DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date = ($1::text)::date
          GROUP BY DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date
        `, [date])
        
        if (tableQueryCheck && tableQueryCheck.rows) {
          const tableQueryCount = tableQueryCheck.rows[0]?.usage_count || 0
          log.info(`Table query result for date ${date} (using date comparison): count=${tableQueryCount}`, 
            JSON.stringify(tableQueryCheck.rows, null, 2))
        }
        
        // Also check what the main table query would return (grouped by provider_type like the actual table)
        mainTableQueryCheck = await pool.query(`
          SELECT 
            DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date as date,
            COALESCE(ap.provider_type, aul.provider_type) as provider_type,
            COALESCE(MIN(ap.name), INITCAP(COALESCE(ap.provider_type, aul.provider_type))) as provider_name,
            COUNT(*)::int as usage_count,
            COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens
          FROM ai_usage_logs aul
          LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
          WHERE DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date = ($1::text)::date
          GROUP BY DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC'), COALESCE(ap.provider_type, aul.provider_type)
          ORDER BY date, provider_type
        `, [date])
        
        if (mainTableQueryCheck && mainTableQueryCheck.rows) {
          const mainTableTotal = mainTableQueryCheck.rows.reduce((sum: number, row: any) => sum + (row.usage_count || 0), 0)
          log.info(`Main table query result for date ${date} (grouped by provider_type like frontend table): total=${mainTableTotal}, providers=${mainTableQueryCheck.rows.length}`, 
            JSON.stringify(mainTableQueryCheck.rows, null, 2))
        }
      } catch (error: any) {
        log.error(`Error in table query check:`, error.message)
      }
      
      // Hourly breakdown - Use DATE_TRUNC logic to match main analytics query
      const hourlyBreakdown = await pool.query(`
        SELECT 
          EXTRACT(HOUR FROM aul.created_at AT TIME ZONE 'UTC')::int as hour,
          COUNT(*)::int as request_count,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
          COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time,
          (COUNT(*) FILTER (WHERE aul.success = true) * 100.0 / NULLIF(COUNT(*), 0)) as success_rate
        FROM ai_usage_logs aul
        WHERE DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date = ($1::text)::date
        GROUP BY EXTRACT(HOUR FROM aul.created_at AT TIME ZONE 'UTC')
        ORDER BY hour
      `, [date])
      
      if (!hourlyBreakdown || !hourlyBreakdown.rows) {
        log.error(`Hourly breakdown query returned null for ${date}`)
        throw new Error('Failed to fetch hourly breakdown')
      }
      
      const totalHourlyRequests = hourlyBreakdown.rows.reduce((sum: number, row: any) => sum + (row.request_count || 0), 0)
      log.info(`Hourly breakdown for ${date} (using DATE_TRUNC logic): ${hourlyBreakdown.rows.length} hours, total requests: ${totalHourlyRequests}`)
      
      // Provider breakdown - Use DATE_TRUNC logic to match main analytics query
      const providerBreakdown = await pool.query(`
        SELECT 
          COALESCE(ap.provider_type, aul.provider_type) as provider_type,
          COALESCE(MIN(ap.name), INITCAP(COALESCE(ap.provider_type, aul.provider_type))) as provider_name,
          COUNT(*)::int as request_count,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
          COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time,
          (COUNT(*) FILTER (WHERE aul.success = true) * 100.0 / NULLIF(COUNT(*), 0)) as success_rate
        FROM ai_usage_logs aul
        LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
        WHERE DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date = ($1::text)::date
        GROUP BY COALESCE(ap.provider_type, aul.provider_type)
        ORDER BY request_count DESC
      `, [date])
      
      if (!providerBreakdown || !providerBreakdown.rows) {
        log.error(`Provider breakdown query returned null for ${date}`)
        throw new Error('Failed to fetch provider breakdown')
      }
      
      const totalProviderRequests = providerBreakdown.rows.reduce((sum: number, row: any) => sum + (row.request_count || 0), 0)
      log.info(`Provider breakdown for ${date} (using DATE_TRUNC logic): ${providerBreakdown.rows.length} providers, total requests: ${totalProviderRequests}`)
      
      // Model breakdown - Use DATE_TRUNC logic to match main analytics query
      const modelBreakdown = await pool.query(`
        SELECT 
          COALESCE(aul.model_name, 'unknown') as model_name,
          COALESCE(ap.provider_type, aul.provider_type) as provider_type,
          COALESCE(MIN(ap.name), INITCAP(COALESCE(ap.provider_type, aul.provider_type))) as provider_name,
          COUNT(*)::int as request_count,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
          COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time
        FROM ai_usage_logs aul
        LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
        WHERE DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date = ($1::text)::date
        GROUP BY COALESCE(aul.model_name, 'unknown'), COALESCE(ap.provider_type, aul.provider_type)
        ORDER BY request_count DESC
        LIMIT 20
      `, [date])
      
      // User breakdown (if user_id is available) - Use DATE_TRUNC logic to match main analytics query
      const userBreakdown = await pool.query(`
        SELECT 
          COALESCE(u.name, u.email, 'Unknown User') as user_name,
          u.id as user_id,
          COUNT(*)::int as request_count,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens
        FROM ai_usage_logs aul
        LEFT JOIN users u ON aul.user_id::uuid = u.id
        WHERE DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date = ($1::text)::date
          AND aul.user_id IS NOT NULL
        GROUP BY u.id, u.name, u.email
        ORDER BY request_count DESC
        LIMIT 20
      `, [date])
      
      // Project breakdown (if project_id is available) - Use DATE_TRUNC logic to match main analytics query
      const projectBreakdown = await pool.query(`
        SELECT 
          COALESCE(p.name, 'Unknown Project') as project_name,
          p.id as project_id,
          COUNT(*)::int as request_count,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens
        FROM ai_usage_logs aul
        LEFT JOIN projects p ON aul.project_id::uuid = p.id
        WHERE DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date = ($1::text)::date
          AND aul.project_id IS NOT NULL
        GROUP BY p.id, p.name
        ORDER BY request_count DESC
        LIMIT 20
      `, [date])
      
      // Summary - Match the table logic by summing provider counts
      // The table shows provider counts per day, so the summary should match that total
      // Use DATE_TRUNC logic to match main analytics query
      const summaryQuery = await pool.query(`
        WITH provider_stats AS (
          SELECT 
            COUNT(*)::int as usage_count,
            COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
            COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time,
            COUNT(*) FILTER (WHERE aul.success = true)::int as successful_requests
          FROM ai_usage_logs aul
          LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
          WHERE DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date = ($1::text)::date
          GROUP BY COALESCE(ap.provider_type, aul.provider_type)
        )
        SELECT 
          SUM(usage_count)::int as total_requests,
          SUM(total_tokens)::numeric as total_tokens,
          SUM(avg_response_time * usage_count)::numeric / NULLIF(SUM(usage_count), 0) as avg_response_time,
          SUM(successful_requests)::int * 100.0 / NULLIF(SUM(usage_count), 0) as success_rate,
          COUNT(*)::int as unique_providers
        FROM provider_stats
      `, [date])
      
      // Get unique users and projects separately (simpler query) - Use DATE_TRUNC logic to match main analytics query
      const uniqueCounts = await pool.query(`
        SELECT 
          COUNT(DISTINCT aul.user_id)::int as unique_users,
          COUNT(DISTINCT aul.project_id)::int as unique_projects
        FROM ai_usage_logs aul
        WHERE DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date = ($1::text)::date
          AND (aul.user_id IS NOT NULL OR aul.project_id IS NOT NULL)
      `, [date])
      
      // Also get direct count for comparison - Use DATE_TRUNC logic to match main analytics query
      const directCount = await pool.query(`
        SELECT 
          COUNT(*)::int as total_requests,
          COALESCE(SUM(aul.total_tokens), 0)::numeric as total_tokens,
          COALESCE(AVG(aul.response_time_ms), 0)::numeric as avg_response_time,
          (COUNT(*) FILTER (WHERE aul.success = true) * 100.0 / NULLIF(COUNT(*), 0)) as success_rate,
          COUNT(DISTINCT aul.user_id)::int as unique_users,
          COUNT(DISTINCT aul.project_id)::int as unique_projects,
          COUNT(DISTINCT COALESCE(ap.provider_type, aul.provider_type))::int as unique_providers
        FROM ai_usage_logs aul
        LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
        WHERE DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date = ($1::text)::date
      `, [date])
      
      if (!summaryQuery || !summaryQuery.rows) {
        log.error(`Summary query returned null for ${date}`)
        throw new Error('Failed to fetch summary')
      }
      
      if (!uniqueCounts || !uniqueCounts.rows) {
        log.error(`Unique counts query returned null for ${date}`)
      }
      
      if (!directCount || !directCount.rows) {
        log.error(`Direct count query returned null for ${date}`)
      }
      
      log.info(`Summary query for ${date} (using DATE_TRUNC logic): provider-summed=${summaryQuery.rows[0]?.total_requests}, direct=${directCount?.rows?.[0]?.total_requests}`)
      
      // Log comparison with table query result if available
      if (tableQueryCheck && tableQueryCheck.rows && tableQueryCheck.rows.length > 0) {
        const tableQueryCount = tableQueryCheck.rows[0]?.usage_count || 0
        const rangeQueryCount = summaryQuery.rows[0]?.total_requests || 0
        log.info(`Comparison for ${date}: Table query (date comparison)=${tableQueryCount}, Range query (timestamp)=${rangeQueryCount}, Match=${tableQueryCount === rangeQueryCount}`)
      }
      
      // Also compare with the main table query (grouped by provider_type like frontend expects)
      // This matches exactly how the frontend table calculates totals (sums all providers per date)
      if (mainTableQueryCheck && mainTableQueryCheck.rows && mainTableQueryCheck.rows.length > 0) {
        const mainTableTotal = mainTableQueryCheck.rows.reduce((sum: number, row: any) => sum + (row.usage_count || 0), 0)
        const rangeQueryCount = summaryQuery.rows[0]?.total_requests || 0
        log.info(`Comparison for ${date}: Main table query (grouped by provider_type, total=${mainTableTotal}), Range query (timestamp)=${rangeQueryCount}, Match=${mainTableTotal === rangeQueryCount}`)
        
        // If they don't match, log the provider breakdown from main table query
        if (mainTableTotal !== rangeQueryCount) {
          log.warn(`⚠️ MISMATCH DETECTED for ${date}: Main table shows ${mainTableTotal} but range query shows ${rangeQueryCount}. Provider breakdown from main table:`, 
            JSON.stringify(mainTableQueryCheck.rows.map((r: any) => ({ provider: r.provider_name, count: r.usage_count })), null, 2))
          
          // Also check what the range query finds when grouped by provider_type
          const rangeQueryByProvider = await pool.query(`
            SELECT 
              COALESCE(ap.provider_type, aul.provider_type) as provider_type,
              COALESCE(MIN(ap.name), INITCAP(COALESCE(ap.provider_type, aul.provider_type))) as provider_name,
              COUNT(*)::int as usage_count
            FROM ai_usage_logs aul
            LEFT JOIN ai_providers ap ON aul.provider_id::uuid = ap.id
            WHERE aul.created_at >= $1::timestamptz
              AND aul.created_at < $2::timestamptz
            GROUP BY COALESCE(ap.provider_type, aul.provider_type)
            ORDER BY usage_count DESC
          `, [startUTC.toISOString(), endUTC.toISOString()])
          
          if (rangeQueryByProvider && rangeQueryByProvider.rows) {
            const rangeTotal = rangeQueryByProvider.rows.reduce((sum: number, row: any) => sum + (row.usage_count || 0), 0)
            log.warn(`Range query grouped by provider_type: total=${rangeTotal}`, 
              JSON.stringify(rangeQueryByProvider.rows.map((r: any) => ({ provider: r.provider_name, count: r.usage_count })), null, 2))
          }
        }
      }
      
      // Use the provider-summed version to match table display
      const summaryData = summaryQuery.rows[0] || null
      const uniqueData = uniqueCounts?.rows?.[0] || null
      const directData = directCount?.rows?.[0] || null
      
      const summary = summaryData ? {
        ...summaryData,
        unique_users: uniqueData?.unique_users || 0,
        unique_projects: uniqueData?.unique_projects || 0
      } : (directData ? {
        ...directData,
        unique_users: uniqueData?.unique_users || 0,
        unique_projects: uniqueData?.unique_projects || 0
      } : {
        total_requests: 0,
        total_tokens: 0,
        avg_response_time: 0,
        success_rate: 0,
        unique_users: 0,
        unique_projects: 0,
        unique_providers: 0
      })
      
      log.info(`Summary for ${date}: Provider-summed=${summaryData?.total_requests || 0}, Direct count=${directData?.total_requests || 0}`)
      
      const breakdown = {
        success: true,
        date,
        summary: summary || {
          total_requests: 0,
          total_tokens: 0,
          avg_response_time: 0,
          success_rate: 0,
          unique_users: 0,
          unique_projects: 0,
          unique_providers: 0
        },
        hourly: hourlyBreakdown.rows,
        byProvider: providerBreakdown.rows,
        byModel: modelBreakdown.rows,
        byUser: userBreakdown.rows,
        byProject: projectBreakdown.rows
      }
      
      log.info(`Daily breakdown fetched for ${date} (UTC range [${startUTC.toISOString()}, ${endUTC.toISOString()})): ${breakdown.summary.total_requests} requests`)
      res.json(breakdown)
      
    } catch (error: any) {
      log.error("Daily breakdown error:", error)
      res.status(500).json({ 
        error: "Failed to fetch daily breakdown",
        details: error?.message 
      })
    }
  }
)

export default router
