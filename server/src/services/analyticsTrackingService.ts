/**
 * Analytics Tracking Service
 * 
 * Provides functions to track various events and metrics in the database
 * for analytics and reporting purposes.
 */

import { pool } from '../database/connection';

// Helper to execute queries
const query = async (text: string, params?: any[]) => {
  return pool.query(text, params);
};

interface AIUsageLog {
  providerId?: string;
  modelId?: string;
  providerType: string;
  modelName: string;
  requestType: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  responseTimeMs: number;
  success: boolean;
  errorMessage?: string;
  statusCode?: number;
  userId?: string;
  projectId?: string;
  documentId?: string;
  estimatedCost?: number;
  requestPayload?: any;
  responseMetadata?: any;
}

interface APIRequestLog {
  method: string;
  path: string;
  endpoint?: string;
  responseTimeMs: number;
  statusCode: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
  errorMessage?: string;
}

interface UserActivityLog {
  userId: string;
  sessionId?: string;
  activityType: string;
  activityCategory: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  metadata?: any;
}

interface DocumentAnalytics {
  documentId: string;
  projectId: string;
  action: 'view' | 'edit' | 'export_pdf' | 'export_docx';
  userId?: string;
  readTimeSeconds?: number;
}

interface SystemMetric {
  metricName: string;
  metricCategory: string;
  value: number;
  unit?: string;
  thresholdWarning?: number;
  thresholdCritical?: number;
  status?: 'normal' | 'warning' | 'critical';
  tags?: any;
}

interface JobExecutionLog {
  jobId: string;
  jobType: string;
  queueName: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  priority?: number;
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
  retryCount?: number;
  userId?: string;
  projectId?: string;
  jobData?: any;
  resultData?: any;
}

interface SearchAnalyticsLog {
  userId?: string;
  query: string;
  searchMode: 'semantic' | 'keyword' | 'hybrid';
  types?: string[];
  frameworks?: string[];
  authors?: string[];
  tags?: string[];
  hasDateFilter?: boolean;
  totalResults: number;
  resultsReturned: number;
  hasResults: boolean;
  responseTimeMs: number;
  cacheHit?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

interface SearchResultClickLog {
  searchId: string;
  resultId: string;
  resultType: 'project' | 'document' | 'template' | 'user';
  resultTitle?: string;
  resultPosition: number;
  relevanceScore?: number;
  userId?: string;
  actionType?: 'view' | 'download' | 'share';
}

interface SearchSuggestionClickLog {
  userId?: string;
  suggestionText: string;
  suggestionType: 'autocomplete' | 'popular' | 'recent';
  queryBefore?: string;
  queryAfter?: string;
}

export class AnalyticsTrackingService {
  /**
   * Track AI API usage
   */
  static async trackAIUsage(data: AIUsageLog): Promise<void> {
    try {
      await query(
        `INSERT INTO ai_usage_logs (
          provider_id, model_id, provider_type, model_name, request_type,
          input_tokens, output_tokens, total_tokens, response_time_ms,
          success, error_message, status_code, user_id, project_id, document_id,
          estimated_cost, request_payload, response_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          data.providerId || null,
          data.modelId || null,
          data.providerType,
          data.modelName,
          data.requestType,
          data.inputTokens,
          data.outputTokens,
          data.totalTokens,
          data.responseTimeMs,
          data.success,
          data.errorMessage || null,
          data.statusCode || null,
          data.userId || null,
          data.projectId || null,
          data.documentId || null,
          data.estimatedCost || 0,
          data.requestPayload ? JSON.stringify(data.requestPayload) : null,
          data.responseMetadata ? JSON.stringify(data.responseMetadata) : null,
        ]
      );
    } catch (error) {
      console.error('Failed to track AI usage:', error);
      // Don't throw - tracking failures shouldn't break the main flow
    }
  }

  /**
   * Track API request
   */
  static async trackAPIRequest(data: APIRequestLog): Promise<void> {
    try {
      // Normalize endpoint by replacing IDs with :id placeholder
      const normalizedEndpoint = data.endpoint || this.normalizeEndpoint(data.path);

      await query(
        `INSERT INTO api_request_logs (
          method, path, endpoint, response_time_ms, status_code,
          user_id, ip_address, user_agent, request_size, response_size, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          data.method,
          data.path,
          normalizedEndpoint,
          data.responseTimeMs,
          data.statusCode,
          data.userId || null,
          data.ipAddress || null,
          data.userAgent || null,
          data.requestSize || 0,
          data.responseSize || 0,
          data.errorMessage || null,
        ]
      );
    } catch (error) {
      console.error('Failed to track API request:', error);
    }
  }

  /**
   * Track user activity
   */
  static async trackUserActivity(data: UserActivityLog): Promise<void> {
    try {
      await query(
        `INSERT INTO user_activity_logs (
          user_id, session_id, activity_type, activity_category,
          entity_type, entity_id, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          data.userId,
          data.sessionId || null,
          data.activityType,
          data.activityCategory,
          data.entityType || null,
          data.entityId || null,
          data.description || null,
          data.metadata ? JSON.stringify(data.metadata) : null,
        ]
      );
    } catch (error) {
      console.error('Failed to track user activity:', error);
    }
  }

  /**
   * Track or update document analytics
   */
  static async trackDocumentAnalytics(data: DocumentAnalytics): Promise<void> {
    try {
      // Get or create document analytics record
      const existing = await query(
        `SELECT * FROM document_analytics WHERE document_id = $1`,
        [data.documentId]
      );

      if (existing.rows.length === 0) {
        // Create new record
        await query(
          `INSERT INTO document_analytics (
            document_id, project_id, view_count, last_viewed_at, last_viewed_by
          ) VALUES ($1, $2, $3, $4, $5)`,
          [data.documentId, data.projectId, 0, null, null]
        );
      }

      // Update based on action
      switch (data.action) {
        case 'view':
          await query(
            `UPDATE document_analytics 
             SET view_count = view_count + 1,
                 last_viewed_at = CURRENT_TIMESTAMP,
                 last_viewed_by = $2,
                 total_read_time_seconds = total_read_time_seconds + $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE document_id = $1`,
            [data.documentId, data.userId || null, data.readTimeSeconds || 0]
          );
          break;

        case 'edit':
          await query(
            `UPDATE document_analytics 
             SET edit_count = edit_count + 1,
                 last_edited_at = CURRENT_TIMESTAMP,
                 last_edited_by = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE document_id = $1`,
            [data.documentId, data.userId || null]
          );
          break;

        case 'export_pdf':
          await query(
            `UPDATE document_analytics 
             SET pdf_exports = pdf_exports + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE document_id = $1`,
            [data.documentId]
          );
          break;

        case 'export_docx':
          await query(
            `UPDATE document_analytics 
             SET docx_exports = docx_exports + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE document_id = $1`,
            [data.documentId]
          );
          break;
      }
    } catch (error) {
      console.error('Failed to track document analytics:', error);
    }
  }

  /**
   * Record system metric
   */
  static async recordSystemMetric(data: SystemMetric): Promise<void> {
    try {
      // Determine status based on thresholds
      let status: 'normal' | 'warning' | 'critical' = data.status || 'normal';
      if (!data.status && data.thresholdCritical && data.value >= data.thresholdCritical) {
        status = 'critical';
      } else if (!data.status && data.thresholdWarning && data.value >= data.thresholdWarning) {
        status = 'warning';
      }

      await query(
        `INSERT INTO system_metrics (
          metric_name, metric_category, value, unit,
          threshold_warning, threshold_critical, status, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          data.metricName,
          data.metricCategory,
          data.value,
          data.unit || null,
          data.thresholdWarning || null,
          data.thresholdCritical || null,
          status,
          data.tags ? JSON.stringify(data.tags) : null,
        ]
      );
    } catch (error) {
      console.error('Failed to record system metric:', error);
    }
  }

  /**
   * Track job execution
   */
  static async trackJobExecution(data: JobExecutionLog): Promise<void> {
    try {
      await query(
        `INSERT INTO job_execution_logs (
          job_id, job_type, queue_name, status, priority,
          queued_at, started_at, completed_at, duration_ms,
          success, error_message, retry_count,
          user_id, project_id, job_data, result_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          data.jobId,
          data.jobType,
          data.queueName,
          data.status,
          data.priority || 0,
          data.queuedAt || null,
          data.startedAt || null,
          data.completedAt || null,
          data.durationMs || null,
          data.success !== undefined ? data.success : null,
          data.errorMessage || null,
          data.retryCount || 0,
          data.userId || null,
          data.projectId || null,
          data.jobData ? JSON.stringify(data.jobData) : null,
          data.resultData ? JSON.stringify(data.resultData) : null,
        ]
      );
    } catch (error) {
      console.error('Failed to track job execution:', error);
    }
  }

  /**
   * Aggregate daily statistics for a specific date
   */
  static async aggregateDailyStats(date?: Date): Promise<void> {
    try {
      const targetDate = date || new Date();
      await query('SELECT aggregate_daily_statistics($1)', [targetDate.toISOString().split('T')[0]]);
    } catch (error) {
      console.error('Failed to aggregate daily stats:', error);
    }
  }

  /**
   * Refresh materialized views
   */
  static async refreshViews(): Promise<void> {
    try {
      await query('SELECT refresh_analytics_views()');
    } catch (error) {
      console.error('Failed to refresh analytics views:', error);
    }
  }

  /**
   * Clean up old logs
   */
  static async cleanupOldLogs(daysToKeep: number = 90): Promise<void> {
    try {
      await query('SELECT cleanup_old_logs($1)', [daysToKeep]);
      console.log(`Cleaned up logs older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Helper: Normalize API endpoint path
   * Replaces UUIDs and numeric IDs with :id placeholder
   */
  private static normalizeEndpoint(path: string): string {
    return path
      // Replace UUIDs with :id
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      // Replace numeric IDs with :id
      .replace(/\/\d+(?=\/|$)/g, '/:id')
      // Clean up multiple consecutive :id
      .replace(/(:id\/)+:id/g, ':id');
  }

  /**
   * Helper: Calculate estimated cost for AI usage
   */
  static calculateAICost(
    providerType: string,
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    // Pricing per 1M tokens (in USD)
    const pricing: Record<string, { input: number; output: number }> = {
      // OpenAI GPT-4
      'gpt-4': { input: 30, output: 60 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-4o': { input: 5, output: 15 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      // OpenAI GPT-3.5
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      // Google Gemini
      'gemini-pro': { input: 0.5, output: 1.5 },
      'gemini-1.5-pro': { input: 1.25, output: 5 },
      'gemini-1.5-flash': { input: 0.075, output: 0.3 },
      'gemini-2.0-flash': { input: 0.075, output: 0.3 },
      // Azure (similar to OpenAI)
      'azure-gpt-4': { input: 30, output: 60 },
      'azure-gpt-35-turbo': { input: 0.5, output: 1.5 },
      // Mistral
      'mistral-large': { input: 4, output: 12 },
      'mistral-medium': { input: 2.7, output: 8.1 },
      'mistral-small': { input: 1, output: 3 },
      // Claude
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-sonnet': { input: 3, output: 15 },
      'claude-3-haiku': { input: 0.25, output: 1.25 },
    };

    // Find matching pricing
    const modelKey = Object.keys(pricing).find(key => modelName.toLowerCase().includes(key));
    const prices = modelKey ? pricing[modelKey] : { input: 0, output: 0 };

    // Calculate cost (pricing is per 1M tokens)
    const inputCost = (inputTokens / 1_000_000) * prices.input;
    const outputCost = (outputTokens / 1_000_000) * prices.output;

    return inputCost + outputCost;
  }

  /**
   * Track search query analytics
   */
  static async trackSearchAnalytics(data: SearchAnalyticsLog): Promise<string | null> {
    try {
      const result = await query(
        `INSERT INTO search_analytics (
          user_id, query, query_length, search_mode, types, frameworks, authors, tags,
          has_date_filter, total_results, results_returned, has_results,
          response_time_ms, cache_hit, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id`,
        [
          data.userId || null,
          data.query,
          data.query.length,
          data.searchMode,
          data.types || null,
          data.frameworks || null,
          data.authors || null,
          data.tags || null,
          data.hasDateFilter || false,
          data.totalResults,
          data.resultsReturned,
          data.hasResults,
          data.responseTimeMs,
          data.cacheHit || false,
          data.ipAddress || null,
          data.userAgent || null
        ]
      );

      return result.rows[0]?.id || null;
    } catch (error: any) {
      console.error('[ANALYTICS] Failed to track search analytics:', error);
      return null;
    }
  }

  /**
   * Track search result click
   */
  static async trackSearchResultClick(data: SearchResultClickLog): Promise<void> {
    try {
      await query(
        `INSERT INTO search_result_clicks (
          search_id, result_id, result_type, result_title, result_position,
          relevance_score, user_id, action_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          data.searchId,
          data.resultId,
          data.resultType,
          data.resultTitle || null,
          data.resultPosition,
          data.relevanceScore || null,
          data.userId || null,
          data.actionType || 'view'
        ]
      );
    } catch (error: any) {
      console.error('[ANALYTICS] Failed to track search result click:', error);
    }
  }

  /**
   * Track search suggestion click
   */
  static async trackSearchSuggestionClick(data: SearchSuggestionClickLog): Promise<void> {
    try {
      await query(
        `INSERT INTO search_suggestion_clicks (
          user_id, suggestion_text, suggestion_type, query_before, query_after
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          data.userId || null,
          data.suggestionText,
          data.suggestionType,
          data.queryBefore || null,
          data.queryAfter || null
        ]
      );
    } catch (error: any) {
      console.error('[ANALYTICS] Failed to track search suggestion click:', error);
    }
  }
}

export default AnalyticsTrackingService;

