/**
 * Microsoft Clarity Analytics Utilities
 * Centralized tracking functions for the ADPA application
 */

import { trackClarityEvent, identifyClarityUser, setClarityTag, trackClarityPageView } from '@/components/analytics/ClarityProvider'

// Document-related tracking
export const trackDocumentUpload = (status: 'success' | 'failed' | 'started', documentType?: string) => {
  trackClarityEvent('document_upload', status)
  if (documentType) {
    setClarityTag('document_type', documentType)
  }
}

export const trackDocumentProcessing = (stage: 'parsing' | 'extraction' | 'analysis' | 'completed', duration?: number) => {
  trackClarityEvent('document_processing', stage)
  if (duration) {
    setClarityTag('processing_duration_ms', duration.toString())
  }
}

export const trackDocumentExport = (format: 'pdf' | 'docx' | 'html' | 'json', success: boolean) => {
  trackClarityEvent('document_export', `${format}_${success ? 'success' : 'failed'}`)
}

// Entity-related tracking
export const trackEntityExtraction = (entityType: string, count: number) => {
  trackClarityEvent('entity_extraction', entityType)
  setClarityTag('entity_count', count.toString())
}

export const trackEntityHighlighting = (action: 'viewed' | 'scrolled' | 'clicked') => {
  trackClarityEvent('entity_highlighting', action)
}

export const trackEntityNavigation = (from: string, to: string) => {
  setClarityTag('entity_navigation_from', from)
  setClarityTag('entity_navigation_to', to)
  trackClarityEvent('entity_navigation', 'used')
}

// Template-related tracking
export const trackTemplateSelection = (templateName: string, category: string) => {
  setClarityTag('template_name', templateName)
  setClarityTag('template_category', category)
  trackClarityEvent('template_selection', templateName)
}

export const trackTemplateGeneration = (templateName: string, status: 'success' | 'failed', tokenCount?: number) => {
  trackClarityEvent('template_generation', `${templateName}_${status}`)
  if (tokenCount) {
    setClarityTag('generation_tokens', tokenCount.toString())
  }
}

// AI-related tracking
export const trackAIProviderUsage = (provider: string, model: string, tokens: number) => {
  setClarityTag('ai_provider', provider)
  setClarityTag('ai_model', model)
  setClarityTag('ai_tokens_used', tokens.toString())
  trackClarityEvent('ai_usage', provider)
}

export const trackAIResponse = (provider: string, responseTime: number, success: boolean) => {
  setClarityTag('ai_response_time_ms', responseTime.toString())
  trackClarityEvent('ai_response', `${provider}_${success ? 'success' : 'failed'}`)
}

// User interaction tracking
export const trackUserSession = (userId: string, sessionId: string, userType?: string) => {
  identifyClarityUser(userId, {
    session_id: sessionId,
    user_type: userType || 'unknown'
  })
}

export const trackPageEngagement = (page: string, timeSpent: number, interactions: number) => {
  setClarityTag('page_time_spent_seconds', timeSpent.toString())
  setClarityTag('page_interactions', interactions.toString())
  trackClarityPageView(page)
}

// Search tracking
export const trackSearch = (query: string, resultCount: number, searchType?: string) => {
  setClarityTag('search_query_length', query.length.toString())
  setClarityTag('search_result_count', resultCount.toString())
  if (searchType) {
    setClarityTag('search_type', searchType)
  }
  trackClarityEvent('search_performed', `${searchType || 'general'}_search`)
}

// Filter usage tracking
export const trackFilterUsage = (filterType: string, filterValue: string, resultCount?: number) => {
  setClarityTag('filter_type', filterType)
  setClarityTag('filter_value', filterValue)
  if (resultCount !== undefined) {
    setClarityTag('filter_result_count', resultCount.toString())
  }
  trackClarityEvent('filter_applied', `${filterType}_${filterValue}`)
}

// Document sharing tracking
export const trackDocumentShare = (documentId: string, shareType: string, recipientCount?: number) => {
  setClarityTag('share_type', shareType)
  setClarityTag('document_shared', 'true')
  if (recipientCount) {
    setClarityTag('share_recipient_count', recipientCount.toString())
  }
  trackClarityEvent('document_shared', shareType)
}

// Collaboration tracking
export const trackCollaboration = (action: string, documentId: string, collaboratorCount?: number) => {
  setClarityTag('collaboration_action', action)
  setClarityTag('document_collaborated', 'true')
  if (collaboratorCount) {
    setClarityTag('collaborator_count', collaboratorCount.toString())
  }
  trackClarityEvent('collaboration', `${action}_${documentId}`)
}

// Comment tracking
export const trackComment = (action: string, documentId: string, commentLength?: number) => {
  setClarityTag('comment_action', action)
  setClarityTag('document_commented', 'true')
  if (commentLength) {
    setClarityTag('comment_length', commentLength.toString())
  }
  trackClarityEvent('comment', `${action}_${documentId}`)
}

// Feature usage tracking
export const trackFeatureUsage = (featureName: string, action: string, metadata?: Record<string, string>) => {
  setClarityTag('feature_name', featureName)
  setClarityTag('feature_action', action)
  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      setClarityTag(`feature_${key}`, value)
    })
  }
  trackClarityEvent('feature_usage', `${featureName}_${action}`)
}

// Quality audit tracking
export const trackQualityAudit = (documentId: string, score: number | null, grade: string | null) => {
  setClarityTag('audit_score', score?.toString() || 'not_audited')
  setClarityTag('audit_grade', grade || 'not_audited')
  trackClarityEvent('quality_audit', score ? 'performed' : 'not_performed')
}

// Error tracking
export const trackError = (errorType: string, context: string, fatal: boolean = false) => {
  setClarityTag('error_type', errorType)
  setClarityTag('error_context', context)
  setClarityTag('error_fatal', fatal.toString())
  trackClarityEvent('error', errorType)
}

// Performance tracking
export const trackPerformance = (metric: string, value: number, unit: string = 'ms') => {
  setClarityTag(`perf_${metric}`, `${value}${unit}`)
  trackClarityEvent('performance', metric)
}

// Integration tracking
export const trackIntegration = (integrationName: string, action: string, success: boolean) => {
  setClarityTag('integration_name', integrationName)
  setClarityTag('integration_action', action)
  setClarityTag('integration_success', success.toString())
  trackClarityEvent('integration', `${integrationName}_${action}`)
}

// Custom event tracking for specific ADPA features
export const trackADPAEvent = (eventName: string, value?: string | number, metadata?: Record<string, string>) => {
  if (metadata) {
    Object.entries(metadata).forEach(([key, val]) => {
      setClarityTag(`adpa_${key}`, val)
    })
  }
  trackClarityEvent(`adpa_${eventName}`, value?.toString())
}

// Batch tracking for multiple events
export const trackBatchEvents = (events: Array<{ name: string; value?: string | number }>) => {
  events.forEach(event => {
    trackClarityEvent(event.name, event.value)
  })
}

// Utility function to check if Clarity is available
export const isClarityAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).clarity
}

// Debug function to log current Clarity state
export const debugClarityState = () => {
  if (isClarityAvailable()) {
    console.log('🔍 Microsoft Clarity Debug Info:')
    console.log('Available: ✅')
    console.log('Queue Length:', (window as any).clarity.q?.length || 0)
    console.log('Project ID: uhyjwbsgsg')
  } else {
    console.log('🔍 Microsoft Clarity Debug Info:')
    console.log('Available: ❌')
    console.log('Reason: Client-side not available or not initialized')
  }
}
