/**
 * Tool Reputation & Metrics Types for ADPA
 * Enables adaptive tool selection and weighted evidence reasoning.
 */

export interface ToolMetrics {
  successCount: number
  failureCount: number
  totalDurationMs: number
  lastUsed: string
  errorRate: number
  avgLatencyMs: number
}

export interface ToolReputation {
  toolName: string
  score: number           // 0.0 to 1.0 (Current reliability)
  confidence: number      // 0.0 to 1.0 (Based on sample size)
  metrics: ToolMetrics
  trends: {
    lastFiveSuccess: boolean[]
    improvement: number   // Negative for degradation
  }
}

export interface ToolUsageRecord {
  toolName: string
  success: boolean
  durationMs: number
  timestamp: string
  error?: string
}
