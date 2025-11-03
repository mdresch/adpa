/**
 * Template Analysis Job
 * Automated weekly analysis of template quality performance
 * 
 * Schedule: Every Monday at 2:00 AM
 * Purpose: Identify template improvement opportunities
 */

import cron from 'node-cron'
import { templateImprovementService } from '../services/templateImprovementService'
import { logger } from '../utils/logger'

/**
 * Weekly job to analyze all active templates and generate improvement suggestions
 */
export async function runTemplateAnalysisJob(): Promise<void> {
  const startTime = Date.now()
  
  logger.info('[TEMPLATE-ANALYSIS-JOB] ========================================')
  logger.info('[TEMPLATE-ANALYSIS-JOB] Starting weekly template analysis')
  logger.info('[TEMPLATE-ANALYSIS-JOB] ========================================')

  try {
    await templateImprovementService.analyzeAllTemplates()
    
    const duration = Date.now() - startTime
    
    logger.info('[TEMPLATE-ANALYSIS-JOB] ========================================')
    logger.info('[TEMPLATE-ANALYSIS-JOB] Weekly analysis complete', {
      duration: `${duration}ms`,
      durationMinutes: Math.round(duration / 60000)
    })
    logger.info('[TEMPLATE-ANALYSIS-JOB] ========================================')
  } catch (error) {
    logger.error('[TEMPLATE-ANALYSIS-JOB] Weekly analysis failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}

/**
 * Initialize template analysis cron job
 * Runs every Monday at 2:00 AM
 */
export function initializeTemplateAnalysisJob(): void {
  // Schedule: Monday at 2:00 AM
  // Cron format: minute hour day-of-month month day-of-week
  // 0 2 * * 1 = minute 0, hour 2, every day of month, every month, day 1 (Monday)
  
  const schedule = '0 2 * * 1'
  
  cron.schedule(schedule, async () => {
    logger.info('[TEMPLATE-ANALYSIS-JOB] Cron trigger: Starting scheduled template analysis')
    await runTemplateAnalysisJob()
  })
  
  logger.info('[TEMPLATE-ANALYSIS-JOB] Scheduled for: Every Monday at 2:00 AM')
  logger.info('[TEMPLATE-ANALYSIS-JOB] Cron expression: ' + schedule)
}

// Export for manual triggering
export { templateImprovementService }

