import { ToolReputation, ToolUsageRecord } from './ToolReputationTypes'
import { logger } from '../../../utils/logger'

/**
 * Tool Reputation Service
 * Manages tool performance metrics and computes adaptive reputation scores.
 */
export class ToolReputationService {
  private static instance: ToolReputationService
  private reputations: Map<string, ToolReputation> = new Map()
  
  private constructor() {}

  static getInstance(): ToolReputationService {
    if (!ToolReputationService.instance) {
      ToolReputationService.instance = new ToolReputationService()
    }
    return ToolReputationService.instance
  }

  /**
   * Records a single tool usage event and updates reputation.
   */
  async recordUsage(record: ToolUsageRecord): Promise<void> {
    const { toolName, success, durationMs } = record
    let rep = this.reputations.get(toolName)

    if (!rep) {
      rep = {
        toolName,
        score: 0.8, // Initial baseline
        confidence: 0.1,
        metrics: {
          successCount: 0,
          failureCount: 0,
          totalDurationMs: 0,
          lastUsed: new Date().toISOString(),
          errorRate: 0,
          avgLatencyMs: 0
        },
        trends: {
          lastFiveSuccess: [],
          improvement: 0
        }
      }
    }

    // 1. Update Metrics
    rep.metrics.lastUsed = record.timestamp
    if (success) {
      rep.metrics.successCount++
    } else {
      rep.metrics.failureCount++
    }
    rep.metrics.totalDurationMs += durationMs
    
    const totalCalls = rep.metrics.successCount + rep.metrics.failureCount
    rep.metrics.avgLatencyMs = rep.metrics.totalDurationMs / totalCalls
    rep.metrics.errorRate = rep.metrics.failureCount / totalCalls

    // 2. Update Trends (last 5 calls)
    rep.trends.lastFiveSuccess.push(success)
    if (rep.trends.lastFiveSuccess.length > 5) {
      rep.trends.lastFiveSuccess.shift()
    }

    // 3. Compute Adaptive Score (0.0 - 1.0)
    // Simple logic: success rate weighted by total call confidence
    const successRate = rep.metrics.successCount / totalCalls
    const confidence = Math.min(1.0, totalCalls / 50) // High confidence after 50 calls
    
    // Smooth the score based on confidence
    rep.score = (successRate * confidence) + (0.8 * (1 - confidence))
    rep.confidence = confidence

    this.reputations.set(toolName, rep)
    logger.info(`[REPUTATION] Tool ${toolName} updated: Score=${rep.score.toFixed(2)}, Confidence=${rep.confidence.toFixed(2)}`)
  }

  /**
   * Returns current reputation for a tool.
   */
  getReputation(toolName: string): ToolReputation | undefined {
    return this.reputations.get(toolName)
  }

  /**
   * Returns the reputation score (0.0-1.0) or default baseline.
   */
  getScore(toolName: string): number {
    return this.reputations.get(toolName)?.score || 0.8
  }
}

export const globalToolReputationService = ToolReputationService.getInstance()
