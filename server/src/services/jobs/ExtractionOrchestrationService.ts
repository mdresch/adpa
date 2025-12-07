/**
 * Extraction Orchestration Job Service
 * Handles processing of project data extraction jobs from the queue
 * 
 * Extracted from queueService.ts as part of Phase 2 refactoring
 * to improve code organization and maintainability.
 * 
 * This service orchestrates parent-child job patterns for extracting
 * entities from project documents across multiple PMBOK domains.
 */

import { pool } from '@/database/connection'
import { logger } from '@/utils/logger'
import { io } from '../../server'
import { PMBOK_DOMAINS } from '@/types/pmbok'
import type { PmbokDomain } from '@/types/pmbok'
import type Bull from 'bull'

// ============================================================================
// Constants and Types
// ============================================================================

const ENTITY_TYPES = [
  // Core entities (existing)
  'stakeholders', 'requirements', 'risks', 'milestones', 'constraints',
  'success_criteria', 'best_practices', 'phases', 'resources',
  'technologies', 'quality_standards', 'compliance_security', 'deliverables', 'scope_items', 'activities',
  
  // PMBOK 8 Performance Domain entities
  'team_agreements', 'development_approaches', 'project_iterations', 'work_items',
  'capacity_plans', 'performance_measurements', 'earned_value_metrics', 'opportunities', 'risk_responses',
  'performance_actuals',
  
  // PMBOK 8 Knowledge Area Domain entities (Tier 2)
  // Governance Domain
  'governance_decisions', 'approval_workflows', 'steering_committees', 'change_control_boards', 'policy_compliance',
  // Scope Domain
  'scope_baselines', 'wbs_nodes', 'scope_change_requests', 'requirements_traceability', 'scope_verification',
  // Schedule Domain
  'schedule_baselines', 'schedule_activities', 'critical_path_activities', 'schedule_variances', 'schedule_forecasts',
  // Finance Domain
  'budget_baselines', 'cost_actuals', 'cost_estimates', 'funding_tranches', 'financial_variances', 'procurement_costs',
  // Resources Domain
  'resource_assignments', 'resource_pool', 'capacity_forecasts', 'utilization_records', 'resource_conflicts', 'onboarding_offboarding',
  // Risk Domain
  'risk_assessments', 'risk_response_plans', 'risk_triggers', 'risk_reviews', 'contingency_reserves', 'risk_metrics',
  // Stakeholders Ops Domain
  'engagement_actions', 'communication_logs', 'satisfaction_surveys', 'stakeholder_issues', 'relationship_health'
] as const

type EntityType = typeof ENTITY_TYPES[number]

const DEFAULT_DOMAIN_ORDER: PmbokDomain[] = [...PMBOK_DOMAINS]

const DOMAIN_ENTITY_MAP: Record<PmbokDomain, EntityType[]> = {
  // =========================================================================
  // TIER 1: Performance Domains (PMBOK 8)
  // =========================================================================
  stakeholders: ['stakeholders', 'success_criteria'],
  team: ['resources', 'team_agreements', 'capacity_plans'],
  development_approach: ['development_approaches', 'phases', 'project_iterations', 'activities'],
  planning: ['milestones', 'requirements', 'constraints', 'scope_items', 'phases', 'activities'],
  project_work: ['work_items', 'performance_actuals', 'capacity_plans'],
  delivery: ['deliverables', 'scope_items', 'best_practices'],
  measurement: ['success_criteria', 'performance_measurements', 'earned_value_metrics'],
  uncertainty: ['risks', 'opportunities', 'risk_responses', 'constraints'],
  
  // =========================================================================
  // TIER 2: Knowledge Area Domains (PMBOK 8 Supplementary)
  // =========================================================================
  
  // Governance Domain - Decision-making, approvals, oversight, and governance structures
  governance: [
    'governance_decisions', 
    'approval_workflows', 
    'steering_committees', 
    'change_control_boards', 
    'policy_compliance',
    // ADDED: Entities containing governance data
    'development_approaches',   // Contains governance_approach, review_gates
    'phases',                   // Phase gates are governance checkpoints
    'milestones',               // Key decision/approval points
    'team_agreements'           // Governance of team behavior
  ],
  
  // Scope Domain - Scope definition, WBS, requirements, and deliverables
  scope: [
    'scope_baselines', 
    'wbs_nodes', 
    'scope_change_requests', 
    'requirements_traceability', 
    'scope_verification',
    // ADDED: Core scope entities
    'scope_items',      // Direct scope definition
    'requirements',     // Scope requirements
    'deliverables',     // Scope deliverables
    'phases'            // Deliverables per phase
  ],
  
  // Schedule Domain - Timeline, milestones, activities, and schedule control
  schedule: [
    'schedule_baselines', 
    'schedule_activities', 
    'critical_path_activities', 
    'schedule_variances', 
    'schedule_forecasts',
    // ADDED: Timing entities
    'milestones',           // Schedule milestones
    'activities',           // Schedule activities
    'phases',               // Schedule phases
    'project_iterations'    // Iteration schedule
  ],
  
  // Finance Domain - Budget, costs, funding, and financial control
  finance: [
    'budget_baselines', 
    'cost_actuals', 
    'cost_estimates', 
    'funding_tranches', 
    'financial_variances', 
    'procurement_costs'
    // NOTE: Consider adding 'resources' (cost field) in future
  ],
  
  // Resources Domain - Resource allocation, capacity, and utilization
  resources: [
    'resource_assignments', 
    'resource_pool', 
    'capacity_forecasts', 
    'utilization_records', 
    'resource_conflicts', 
    'onboarding_offboarding',
    // ADDED: Core resource entities
    'resources',        // Core resource data (skills, allocation, availability)
    'team_agreements',  // Team resource agreements
    'capacity_plans'    // Capacity planning
  ],
  
  // Risk Domain - Risk identification, assessment, response, and monitoring
  risk: [
    'risk_assessments', 
    'risk_response_plans', 
    'risk_triggers', 
    'risk_reviews', 
    'contingency_reserves', 
    'risk_metrics',
    // ADDED: Core risk entities
    'risks',            // Core risk entity (probability, impact, mitigation)
    'opportunities',    // Positive risks
    'risk_responses',   // Response actions
    'constraints'       // Risk-related constraints
  ],
  
  // Stakeholders Operations Domain - Engagement, communication, and relationship management
  stakeholders_ops: [
    'engagement_actions', 
    'communication_logs', 
    'satisfaction_surveys', 
    'stakeholder_issues', 
    'relationship_health',
    // ADDED: Core stakeholder entity
    'stakeholders'      // Core stakeholder data (interest, influence, expectations)
  ]
}

type DomainCountSummary = {
  // Core entities
  stakeholders: number
  requirements: number
  risks: number
  milestones: number
  constraints: number
  successCriteria: number
  bestPractices: number
  phases: number
  resources: number
  technologies: number
  qualityStandards: number
  complianceSecurity: number
  deliverables: number
  scopeItems: number
  activities: number
  // Performance Domain entities
  teamAgreements: number
  developmentApproaches: number
  projectIterations: number
  workItems: number
  capacityPlans: number
  performanceMeasurements: number
  earnedValueMetrics: number
  opportunities: number
  riskResponses: number
  performanceActuals: number
  // Knowledge Area Domain entities
  governanceDecisions: number
  approvalWorkflows: number
  steeringCommittees: number
  changeControlBoards: number
  policyCompliance: number
  scopeBaselines: number
  wbsNodes: number
  scopeChangeRequests: number
  requirementsTraceability: number
  scopeVerification: number
  scheduleBaselines: number
  scheduleActivities: number
  criticalPathActivities: number
  scheduleVariances: number
  scheduleForecasts: number
  budgetBaselines: number
  costActuals: number
  costEstimates: number
  fundingTranches: number
  financialVariances: number
  procurementCosts: number
  resourceAssignments: number
  resourcePool: number
  capacityForecasts: number
  utilizationRecords: number
  resourceConflicts: number
  onboardingOffboarding: number
  riskAssessments: number
  riskResponsePlans: number
  riskTriggers: number
  riskReviews: number
  contingencyReserves: number
  riskMetrics: number
  engagementActions: number
  communicationLogs: number
  satisfactionSurveys: number
  stakeholderIssues: number
  relationshipHealth: number
}

const ENTITY_COUNT_KEY_MAP: Record<EntityType, keyof DomainCountSummary> = {
  // Core entities
  stakeholders: 'stakeholders',
  requirements: 'requirements',
  risks: 'risks',
  milestones: 'milestones',
  constraints: 'constraints',
  success_criteria: 'successCriteria',
  best_practices: 'bestPractices',
  phases: 'phases',
  resources: 'resources',
  technologies: 'technologies',
  quality_standards: 'qualityStandards',
  compliance_security: 'complianceSecurity',
  deliverables: 'deliverables',
  scope_items: 'scopeItems',
  activities: 'activities',
  // Performance Domain entities
  team_agreements: 'teamAgreements',
  development_approaches: 'developmentApproaches',
  project_iterations: 'projectIterations',
  work_items: 'workItems',
  capacity_plans: 'capacityPlans',
  performance_measurements: 'performanceMeasurements',
  earned_value_metrics: 'earnedValueMetrics',
  opportunities: 'opportunities',
  risk_responses: 'riskResponses',
  performance_actuals: 'performanceActuals',
  // Governance Domain
  governance_decisions: 'governanceDecisions',
  approval_workflows: 'approvalWorkflows',
  steering_committees: 'steeringCommittees',
  change_control_boards: 'changeControlBoards',
  policy_compliance: 'policyCompliance',
  // Scope Domain
  scope_baselines: 'scopeBaselines',
  wbs_nodes: 'wbsNodes',
  scope_change_requests: 'scopeChangeRequests',
  requirements_traceability: 'requirementsTraceability',
  scope_verification: 'scopeVerification',
  // Schedule Domain
  schedule_baselines: 'scheduleBaselines',
  schedule_activities: 'scheduleActivities',
  critical_path_activities: 'criticalPathActivities',
  schedule_variances: 'scheduleVariances',
  schedule_forecasts: 'scheduleForecasts',
  // Finance Domain
  budget_baselines: 'budgetBaselines',
  cost_actuals: 'costActuals',
  cost_estimates: 'costEstimates',
  funding_tranches: 'fundingTranches',
  financial_variances: 'financialVariances',
  procurement_costs: 'procurementCosts',
  // Resources Domain
  resource_assignments: 'resourceAssignments',
  resource_pool: 'resourcePool',
  capacity_forecasts: 'capacityForecasts',
  utilization_records: 'utilizationRecords',
  resource_conflicts: 'resourceConflicts',
  onboarding_offboarding: 'onboardingOffboarding',
  // Risk Domain
  risk_assessments: 'riskAssessments',
  risk_response_plans: 'riskResponsePlans',
  risk_triggers: 'riskTriggers',
  risk_reviews: 'riskReviews',
  contingency_reserves: 'contingencyReserves',
  risk_metrics: 'riskMetrics',
  // Stakeholders Ops Domain
  engagement_actions: 'engagementActions',
  communication_logs: 'communicationLogs',
  satisfaction_surveys: 'satisfactionSurveys',
  stakeholder_issues: 'stakeholderIssues',
  relationship_health: 'relationshipHealth'
}

type DomainRunIdMap = Partial<Record<PmbokDomain, string>>

interface ExtractionJobData {
  jobId: string
  projectId: string
  userId?: string
  aiProvider?: string
  aiModel?: string
  documentIds?: string[]
  domains?: unknown
  autoTriggered?: boolean
  sourceDocumentId?: string
  domainRunIds?: DomainRunIdMap
}

interface ProcessJobOptions {
  workerId: string
  updateJobStatus: (jobId: string, status: string, progress: number, workerId?: string, queueName?: string, errorMessage?: string) => Promise<void>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize domains input to valid PmbokDomain array
 */
function normalizeDomains(domainsInput?: unknown): PmbokDomain[] {
  if (!Array.isArray(domainsInput)) {
    return DEFAULT_DOMAIN_ORDER
  }
  const filtered = domainsInput.filter(
    (domain): domain is PmbokDomain =>
      typeof domain === 'string' && (PMBOK_DOMAINS as readonly string[]).includes(domain as PmbokDomain)
  )
  return filtered.length ? filtered : DEFAULT_DOMAIN_ORDER
}

/**
 * Resolve entity types for given domains
 */
function resolveEntityTypesForDomains(domains?: PmbokDomain[]): EntityType[] {
  const domainList = domains && domains.length ? domains : DEFAULT_DOMAIN_ORDER
  const collected = domainList.flatMap((domain) => DOMAIN_ENTITY_MAP[domain] || [])
  const deduped = Array.from(new Set(collected)) as EntityType[]
  if (deduped.length === 0) {
    logger.warn('[EXTRACTION-PARENT] No domain-specific entity map found, falling back to full set.')
    return [...ENTITY_TYPES]
  }
  return deduped
}

/**
 * Register domain extraction runs in database
 */
async function registerDomainRuns(params: {
  jobId: string
  projectId: string
  userId?: string
  aiProvider?: string
  aiModel?: string
  documentIds?: string[]
  domains: PmbokDomain[]
}): Promise<DomainRunIdMap> {
  const {
    jobId,
    projectId,
    userId,
    aiProvider,
    aiModel,
    documentIds,
    domains
  } = params

  const domainRunIds: DomainRunIdMap = {}
  const docIds = documentIds && documentIds.length ? documentIds : null

  for (const domain of domains) {
    const entityTypes = DOMAIN_ENTITY_MAP[domain] || []
    const result = await pool.query(
      `INSERT INTO domain_extraction_runs (
        project_id,
        domain,
        job_id,
        user_id,
        ai_provider,
        ai_model,
        document_ids,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        projectId,
        domain,
        jobId,
        userId || null,
        aiProvider || null,
        aiModel || null,
        docIds,
        JSON.stringify({ entityTypes })
      ]
    )
    domainRunIds[domain] = result.rows[0].id
  }

  return domainRunIds
}

/**
 * Complete domain runs with counts and status
 */
async function completeDomainRuns(params: {
  domainRunIds: DomainRunIdMap
  domainCounts: Record<PmbokDomain, number>
  failedEntityTypes: string[]
}): Promise<void> {
  const { domainRunIds, domainCounts, failedEntityTypes } = params
  if (!domainRunIds) return

  const failedSet = new Set(failedEntityTypes)
  const updates = Object.entries(domainRunIds).map(async ([domainKey, runId]) => {
    if (!runId) return
    const domain = domainKey as PmbokDomain
    const entityTypes = DOMAIN_ENTITY_MAP[domain] || []
    const failedForDomain = entityTypes.filter((entity) => failedSet.has(entity))
    const hasFailures = failedForDomain.length > 0
    const totalEntities = domainCounts[domain] ?? 0
    const totalEntityTypes = entityTypes.length
    const successRate =
      totalEntityTypes === 0 ? 100 : ((totalEntityTypes - failedForDomain.length) / totalEntityTypes) * 100
    const status = hasFailures ? (totalEntities > 0 ? 'partial' : 'failed') : 'completed'

    await pool.query(
      `UPDATE domain_extraction_runs
         SET status = $1,
             completed_at = CURRENT_TIMESTAMP,
             total_entities = $2,
             success_rate = $3,
             metadata = metadata || $4
       WHERE id = $5`,
      [
        status,
        totalEntities,
        successRate,
        JSON.stringify({ failedEntityTypes: failedForDomain }),
        runId
      ]
    )
  })

  await Promise.all(updates)
}

/**
 * Mark domain runs as failed
 */
async function failDomainRuns(domainRunIds?: DomainRunIdMap, reason?: string): Promise<void> {
  if (!domainRunIds) return
  const entries = Object.values(domainRunIds).filter((id): id is string => Boolean(id))
  if (!entries.length) return
  await Promise.all(
    entries.map((runId) =>
      pool.query(
        `UPDATE domain_extraction_runs
           SET status = 'failed',
               completed_at = CURRENT_TIMESTAMP,
               metadata = metadata || $1
         WHERE id = $2`,
        [JSON.stringify({ error: reason || 'Extraction job failed' }), runId]
      )
    )
  )
}

// ============================================================================
// Main Service Class
// ============================================================================

/**
 * Service class for processing extraction orchestration jobs
 */
export class ExtractionOrchestrationService {
  /**
   * Process an extraction orchestration job
   */
  static async processJob(job: Bull.Job, options: ProcessJobOptions): Promise<any> {
    const { jobId, projectId, userId, aiProvider, aiModel, documentIds, domains } = job.data as ExtractionJobData
    const selectedDomains = normalizeDomains(domains)
    const entityTypesForRun = resolveEntityTypesForDomains(selectedDomains)
    const { workerId, updateJobStatus } = options

    try {
      // Check if job is already marked as failed/cancelled in database before processing
      const jobCheck = await pool.query(
        'SELECT status, error_message FROM jobs WHERE id = $1',
        [jobId]
      )
      
      if (jobCheck.rows.length > 0) {
        const dbJob = jobCheck.rows[0]
        // Skip processing if job is already failed, cancelled, or has an error message
        if (dbJob.status === 'failed' || dbJob.status === 'cancelled' || dbJob.error_message) {
          logger.warn(`[EXTRACTION-PARENT] ⚠️ Skipping job ${jobId} - already ${dbJob.status} with error: ${dbJob.error_message?.substring(0, 50)}`)
          // Update database to ensure it's marked as failed
          await pool.query(
            `UPDATE jobs 
             SET status = 'failed',
                 completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
             WHERE id = $1 AND status != 'failed'`,
            [jobId]
          )
          // Remove from queue
          await job.remove()
          return
        }
      } else {
        // Job not found in database - this shouldn't happen, but skip it
        logger.warn(`[EXTRACTION-PARENT] ⚠️ Job ${jobId} not found in database - skipping`)
        await job.remove()
        return
      }

      logger.info(`[EXTRACTION-PARENT] 🚀 Starting orchestration: ${jobId}`, { 
        projectId, 
        userId,
        documentIds,
        domains: selectedDomains,
        autoTriggered: (job.data as ExtractionJobData).autoTriggered || false,
        sourceDocumentId: (job.data as ExtractionJobData).sourceDocumentId
      })
      
      // Mark job as processing and set started_at/processing_started_at for stall detection
      await updateJobStatus(jobId, "processing", 10, workerId, "project-data-extraction")

      const domainRunIds = await registerDomainRuns({
        jobId,
        projectId,
        userId,
        aiProvider,
        aiModel,
        documentIds,
        domains: selectedDomains
      })

      // ensure job data reflects selected domains for downstream processing
      ;(job.data as ExtractionJobData).domains = selectedDomains
      ;(job.data as ExtractionJobData).domainRunIds = domainRunIds
      
      // Dynamically import extractionQueue to avoid circular dependency
      const { extractionQueue } = await import('../queueService')
      
      // Create child jobs for each entity type (resilient, independent extraction)
      const childJobPromises = entityTypesForRun.map((entityType, index) => {
        return extractionQueue.add(`extract-entity-${entityType}`, {
          parentJobId: jobId,
          projectId,
          userId,
          aiProvider,
          aiModel,
          documentIds,
          entityType,
          entityIndex: index,
          totalEntities: entityTypesForRun.length
        }, {
          attempts: 3, // Retry each entity extraction up to 3 times
          backoff: {
            type: 'exponential',
            delay: 5000 // Start with 5s delay
          }
        })
      })
      
      // Wait for all child jobs to be created
      const childJobs = await Promise.all(childJobPromises)
      
      logger.info(`[EXTRACTION-PARENT] Created ${childJobs.length} child extraction jobs`, { jobId })
      
      await updateJobStatus(jobId, "processing", 10, workerId)
      
      // Store child job IDs in parent job data
      await pool.query(
        `UPDATE jobs SET data = data || $1 WHERE id = $2`,
        [
          JSON.stringify({
            childJobIds: childJobs.map(j => j.id),
            domains: selectedDomains,
            domainRunIds
          }),
          jobId
        ]
      )
      
      // Monitor child job completion with Promise-based guard to prevent race conditions
      let completedCount = 0
      let checkPromise: Promise<void> | null = null // Promise-based guard (better than boolean)
      let checkInterval: NodeJS.Timeout | null = null
      
      const performCheck = async (): Promise<void> => {
        try {
          const states = await Promise.all(
            childJobs.map(j => j.getState())
          )
          
          const completed = states.filter(s => s === 'completed').length
          const failed = states.filter(s => s === 'failed').length
          
          if (completed + failed === childJobs.length) {
            // Clear interval before finalizing
            if (checkInterval) {
              clearInterval(checkInterval)
              checkInterval = null
            }
            
            // Get details about failed jobs for better error reporting
            const failedJobs: Array<{ entityType: string; error: string }> = []
            if (failed > 0) {
              for (let i = 0; i < childJobs.length; i++) {
                if (states[i] === 'failed') {
                  try {
                    const job = childJobs[i]
                    const entityType = (job.data as any)?.entityType || 'unknown'
                    
                    // Try to get error from job's failedReason or returnvalue
                    let errorMessage = 'Unknown error'
                    try {
                      // Bull stores error in failedReason property
                      if ((job as any).failedReason) {
                        errorMessage = (job as any).failedReason
                      } else {
                        // Try to get from returnvalue (if error was returned)
                        const returnValue = job.returnvalue ?? null
                        if (returnValue?.error) {
                          errorMessage = returnValue.error
                        } else if (returnValue?.message) {
                          errorMessage = returnValue.message
                        }
                      }
                    } catch (err) {
                      // If we can't get error details, use generic message
                      errorMessage = 'Failed after retries'
                    }
                    
                    failedJobs.push({ entityType, error: errorMessage })
                    logger.error(`[EXTRACTION-PARENT] Failed entity type: ${entityType}`, {
                      jobId: job.id,
                      error: errorMessage,
                      parentJobId: jobId,
                      jobData: job.data
                    })
                  } catch (err: any) {
                    logger.error(`[EXTRACTION-PARENT] Could not get failed job details: ${err?.message || err}`, {
                      jobId: childJobs[i].id,
                      error: err
                    })
                    // Still add to failed list with generic error
                    const entityType = (childJobs[i].data as any)?.entityType || 'unknown'
                    failedJobs.push({ entityType, error: `Could not retrieve error: ${err?.message || 'Unknown'}` })
                  }
                }
              }
              
              // Log all failed entity types
              const failedTypes = failedJobs.map(f => f.entityType).join(', ')
              logger.warn(`[EXTRACTION-PARENT] ${failed} entity extraction(s) failed: ${failedTypes}`, {
                failedJobs,
                completed,
                total: childJobs.length
              })
              
              // Allow partial success if at least 50% succeeded
              const successRate = completed / childJobs.length
              if (successRate >= 0.5) {
                logger.info(`[EXTRACTION-PARENT] Allowing partial success: ${completed}/${childJobs.length} succeeded (${(successRate * 100).toFixed(1)}%)`)
                // Finalize with partial results
                await this.finalizeExtractionJob(jobId, projectId, failedJobs, workerId, updateJobStatus, domainRunIds)
              } else {
                // Too many failures - fail the entire job
                const errorMessage = `${failed} entity extraction(s) failed: ${failedTypes}. Errors: ${failedJobs.map(f => `${f.entityType}: ${f.error}`).join('; ')}`
                throw new Error(errorMessage)
              }
            } else {
              // All succeeded - finalize parent job
              await this.finalizeExtractionJob(jobId, projectId, undefined, workerId, updateJobStatus, domainRunIds)
            }
          } else {
            // Update progress based on completed child jobs
            const progress = 10 + Math.floor((completed / childJobs.length) * 85)
            await updateJobStatus(jobId, "processing", progress, workerId)
            completedCount = completed
          }
        } catch (error: any) {
          // IMPORTANT: Never throw from the interval callback.
          // Throwing here would create an unhandled rejection and leave the
          // parent extraction job stuck in "processing" forever.
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }

          const errorMessage = error?.message || 'Unknown extraction monitoring error'
          logger.error(`[EXTRACTION-PARENT] Monitoring loop failed for job ${jobId}: ${errorMessage}`, {
            projectId,
            stack: error?.stack
          })

          try {
            // Mark the parent job as failed in our jobs table
            await updateJobStatus(jobId, "failed", undefined, workerId, "project-data-extraction")
            await pool.query(
              `UPDATE jobs 
               SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP 
               WHERE id = $2`,
              [errorMessage, jobId]
            )

            // Mark associated domain runs as failed so analytics stay consistent
            await failDomainRuns((job.data as ExtractionJobData).domainRunIds || domainRunIds, errorMessage)
          } catch (updateError: any) {
            logger.error(
              `[EXTRACTION-PARENT] Failed to record monitoring failure for job ${jobId}: ${updateError?.message || updateError}`,
              { projectId }
            )
          }
        } finally {
          checkPromise = null // Release guard
        }
      }
      
      // Start monitoring interval with Promise-based guard
      checkInterval = setInterval(async () => {
        // Check if job was cancelled before processing
        try {
          const statusCheck = await pool.query(
            'SELECT status FROM jobs WHERE id = $1',
            [jobId]
          )
          if (statusCheck.rows.length > 0 && statusCheck.rows[0].status === 'cancelled') {
            logger.info(`[EXTRACTION-PARENT] Job ${jobId} was cancelled - stopping monitoring`)
            if (checkInterval) {
              clearInterval(checkInterval)
              checkInterval = null
            }
            return
          }
        } catch (err) {
          logger.warn(`[EXTRACTION-PARENT] Failed to check job status for cancellation: ${err}`)
        }
        
        // Skip if previous check is still running
        if (checkPromise) {
          logger.debug(`[EXTRACTION-PARENT] Skipping check - previous check still running for job ${jobId}`)
          return
        }
        
        // Start new check and store promise
        checkPromise = performCheck()
        
        // Handle promise rejection (shouldn't happen due to try-catch, but safety first)
        checkPromise.catch((err) => {
          logger.error(`[EXTRACTION-PARENT] Unhandled error in check promise for job ${jobId}:`, err)
          checkPromise = null
        })
      }, 3000) // Check every 3 seconds
      
      // Store interval reference in a global map for cleanup on cancellation
      // Note: In production, consider using Redis or a shared store for multi-process scenarios
      if (!(global as any).extractionIntervals) {
        (global as any).extractionIntervals = new Map<string, NodeJS.Timeout>()
      }
      ;(global as any).extractionIntervals.set(jobId, checkInterval)
      
    } catch (error: any) {
      logger.error(`[EXTRACTION-PARENT] Failed: ${jobId} ${error.message}`, { stack: error.stack })
      
      // Clear monitoring interval if it exists (prevent memory leak)
      if ((global as any).extractionIntervals) {
        const interval = (global as any).extractionIntervals.get(jobId)
        if (interval) {
          clearInterval(interval)
          ;(global as any).extractionIntervals.delete(jobId)
          logger.info(`Cleared monitoring interval for failed job: ${jobId}`)
        }
      }
      
      await updateJobStatus(jobId, "failed", undefined, workerId, "project-data-extraction")
      await pool.query(
        `UPDATE jobs SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [error.message, jobId]
      )
      await failDomainRuns((job.data as ExtractionJobData).domainRunIds, error.message)
      throw error
    }
  }

  /**
   * Finalize parent job after all child jobs complete
   * @param failedJobs Optional array of failed entity types for partial success scenarios
   */
  private static async finalizeExtractionJob(
    jobId: string,
    projectId: string,
    failedJobs: Array<{ entityType: string; error: string }> | undefined,
    workerId: string,
    updateJobStatus: ProcessJobOptions['updateJobStatus'],
    domainRunIds: DomainRunIdMap
  ): Promise<void> {
    try {
      logger.info(`[EXTRACTION-PARENT] Finalizing job ${jobId}`)
      
      await updateJobStatus(jobId, "processing", 95, workerId, "project-data-extraction")
      
      // Query actual counts from database (child jobs already saved)
      // Includes all entity types including PMBOK 8 Performance and Knowledge Area Domain entities
      // Helper to safely query count (returns 0 if table doesn't exist)
      const safeCount = async (table: string): Promise<number> => {
        try {
          const result = await pool.query(`SELECT COUNT(*) as count FROM ${table} WHERE project_id = $1`, [projectId])
          return parseInt(result.rows[0].count)
        } catch {
          // Table might not exist yet (e.g., for new Knowledge Area tables)
          return 0
        }
      }
      
      // Core entities (indices 0-14)
      const countQueries = await Promise.all([
        safeCount('stakeholders'),
        safeCount('requirements'),
        safeCount('risks'),
        safeCount('milestones'),
        safeCount('constraints'),
        safeCount('success_criteria'),
        safeCount('best_practices'),
        safeCount('phases'),
        safeCount('resources'),
        safeCount('technologies'),
        safeCount('quality_standards'),
        safeCount('compliance_security'),
        safeCount('deliverables'),
        safeCount('scope_items'),
        safeCount('activities'),
        // Performance Domain entities (indices 15-24)
        safeCount('team_agreements'),
        safeCount('development_approaches'),
        safeCount('project_iterations'),
        safeCount('work_items'),
        safeCount('capacity_plans'),
        safeCount('performance_measurements'),
        safeCount('earned_value_metrics'),
        safeCount('opportunities'),
        safeCount('risk_responses'),
        safeCount('performance_actuals'),
        // Knowledge Area Domain entities (indices 25-62)
        // Governance (5)
        safeCount('governance_decisions'),
        safeCount('approval_workflows'),
        safeCount('steering_committees'),
        safeCount('change_control_boards'),
        safeCount('policy_compliance'),
        // Scope (5)
        safeCount('scope_baselines'),
        safeCount('wbs_nodes'),
        safeCount('scope_change_requests'),
        safeCount('requirements_traceability'),
        safeCount('scope_verification'),
        // Schedule (5)
        safeCount('schedule_baselines'),
        safeCount('schedule_activities'),
        safeCount('critical_path_activities'),
        safeCount('schedule_variances'),
        safeCount('schedule_forecasts'),
        // Finance (6)
        safeCount('budget_baselines'),
        safeCount('cost_actuals'),
        safeCount('cost_estimates'),
        safeCount('funding_tranches'),
        safeCount('financial_variances'),
        safeCount('procurement_costs'),
        // Resources (6)
        safeCount('resource_assignments'),
        safeCount('resource_pool'),
        safeCount('capacity_forecasts'),
        safeCount('utilization_records'),
        safeCount('resource_conflicts'),
        safeCount('onboarding_offboarding'),
        // Risk (6)
        safeCount('risk_assessments'),
        safeCount('risk_response_plans'),
        safeCount('risk_triggers'),
        safeCount('risk_reviews'),
        safeCount('contingency_reserves'),
        safeCount('risk_metrics'),
        // Stakeholders Ops (5)
        safeCount('engagement_actions'),
        safeCount('communication_logs'),
        safeCount('satisfaction_surveys'),
        safeCount('stakeholder_issues'),
        safeCount('relationship_health')
      ])
      
      const counts: DomainCountSummary = {
        // Core entities
        stakeholders: countQueries[0],
        requirements: countQueries[1],
        risks: countQueries[2],
        milestones: countQueries[3],
        constraints: countQueries[4],
        successCriteria: countQueries[5],
        bestPractices: countQueries[6],
        phases: countQueries[7],
        resources: countQueries[8],
        technologies: countQueries[9],
        qualityStandards: countQueries[10],
        complianceSecurity: countQueries[11],
        deliverables: countQueries[12],
        scopeItems: countQueries[13],
        activities: countQueries[14],
        // Performance Domain entities
        teamAgreements: countQueries[15],
        developmentApproaches: countQueries[16],
        projectIterations: countQueries[17],
        workItems: countQueries[18],
        capacityPlans: countQueries[19],
        performanceMeasurements: countQueries[20],
        earnedValueMetrics: countQueries[21],
        opportunities: countQueries[22],
        riskResponses: countQueries[23],
        performanceActuals: countQueries[24],
        // Knowledge Area Domain entities
        // Governance
        governanceDecisions: countQueries[25],
        approvalWorkflows: countQueries[26],
        steeringCommittees: countQueries[27],
        changeControlBoards: countQueries[28],
        policyCompliance: countQueries[29],
        // Scope
        scopeBaselines: countQueries[30],
        wbsNodes: countQueries[31],
        scopeChangeRequests: countQueries[32],
        requirementsTraceability: countQueries[33],
        scopeVerification: countQueries[34],
        // Schedule
        scheduleBaselines: countQueries[35],
        scheduleActivities: countQueries[36],
        criticalPathActivities: countQueries[37],
        scheduleVariances: countQueries[38],
        scheduleForecasts: countQueries[39],
        // Finance
        budgetBaselines: countQueries[40],
        costActuals: countQueries[41],
        costEstimates: countQueries[42],
        fundingTranches: countQueries[43],
        financialVariances: countQueries[44],
        procurementCosts: countQueries[45],
        // Resources
        resourceAssignments: countQueries[46],
        resourcePool: countQueries[47],
        capacityForecasts: countQueries[48],
        utilizationRecords: countQueries[49],
        resourceConflicts: countQueries[50],
        onboardingOffboarding: countQueries[51],
        // Risk
        riskAssessments: countQueries[52],
        riskResponsePlans: countQueries[53],
        riskTriggers: countQueries[54],
        riskReviews: countQueries[55],
        contingencyReserves: countQueries[56],
        riskMetrics: countQueries[57],
        // Stakeholders Ops
        engagementActions: countQueries[58],
        communicationLogs: countQueries[59],
        satisfactionSurveys: countQueries[60],
        stakeholderIssues: countQueries[61],
        relationshipHealth: countQueries[62]
      }
      
      const entityCountLookup = Object.entries(ENTITY_COUNT_KEY_MAP).reduce(
        (acc, [entityType, key]) => {
          acc[entityType as EntityType] = counts[key]
          return acc
        },
        {} as Record<EntityType, number>
      )

      const jobData = await pool.query(`SELECT created_by, data FROM jobs WHERE id = $1`, [jobId])
      const jobRow = jobData.rows[0] || {}
      const jobDataJson = (jobRow.data as Record<string, any>) || {}
      const selectedDomains = normalizeDomains(jobDataJson.domains)

      const domainCounts = selectedDomains.reduce((acc, domain) => {
        const keys = DOMAIN_ENTITY_MAP[domain] || []
        acc[domain] = keys.reduce((sum, entityKey) => sum + (entityCountLookup[entityKey] || 0), 0)
        return acc
      }, {} as Record<PmbokDomain, number>)

      const failedEntityTypes = failedJobs?.map(f => f.entityType) || []

      await completeDomainRuns({
        domainRunIds,
        domainCounts,
        failedEntityTypes
      })

      const totalEntities = Object.values(counts).reduce((sum, count) => sum + count, 0)
      
      logger.info(`[EXTRACTION-PARENT] Total entities extracted: ${totalEntities}`)
      
      // After we know project-level entity tables are populated, rebuild
      // per-document entity_counts and inferred_*_domain, then refresh
      // template_entity_profile using the helper views.
      try {
        const { default: DocumentPurposeService } = await import('../documentPurposeService')
        const { default: TemplateAnalyticsService } = await import('../templateAnalyticsService')

        logger.info(`[EXTRACTION-PARENT] Rebuilding document purposes for project ${projectId}`)
        await DocumentPurposeService.rebuildForProject(projectId)

        logger.info('[EXTRACTION-PARENT] Updating template entity profiles from aggregated_template_entity_view')
        await TemplateAnalyticsService.updateTemplateEntityProfile()
      } catch (hookError: any) {
        logger.error(
          `[EXTRACTION-PARENT] Failed to update document purposes / template profiles for project ${projectId}: ${hookError?.message || hookError}`
        )
      }
      
      const userId = jobRow?.created_by
      
      // Prepare result with optional failed entity info
      const result: any = {
        totalEntities,
        entityCounts: counts,
        success: true
      }
      
      if (failedJobs && failedJobs.length > 0) {
        result.partialSuccess = true
        result.failedEntityTypes = failedJobs.map(f => f.entityType)
        result.failedCount = failedJobs.length
        result.warnings = failedJobs.map(f => `${f.entityType}: ${f.error}`)
        logger.warn(`[EXTRACTION-PARENT] Partial success: ${failedJobs.length} entity types failed`, {
          failedTypes: result.failedEntityTypes
        })
      }
      
      // After counts are refreshed, rebuild per-document purpose and template profiles.
      // This runs best-effort; failures here should not break the main extraction job.
      try {
        const { default: DocumentPurposeService } = await import('../documentPurposeService')
        const { default: TemplateAnalyticsService } = await import('../templateAnalyticsService')
        
        await DocumentPurposeService.rebuildForProject(projectId)

        // Recompute template_entity_profile rows only for templates used in this project
        const templatesRes = await pool.query(
          `SELECT DISTINCT template_id
           FROM documents
           WHERE project_id = $1 AND template_id IS NOT NULL`,
          [projectId]
        )

        const templateIds = templatesRes.rows.map((row) => row.template_id as string)
        if (templateIds.length > 0) {
          for (const templateId of templateIds) {
            await TemplateAnalyticsService.updateTemplateEntityProfile(templateId)
          }
        }
      } catch (analyticsError: any) {
        logger.error('[EXTRACTION-PARENT] Failed to rebuild document/template purpose analytics', {
          jobId,
          projectId,
          error: analyticsError.message
        })
      }

      // Update job to completed (status is VARCHAR(20), so we use 'completed' and store warnings in result)
      // Note: Status column is VARCHAR(20), so we can't use 'completed_with_warnings' (25 chars)
      // Instead, we store the partial success info in the result JSON
      await pool.query(
        `UPDATE jobs 
         SET status = 'completed', result = $1, progress = 100, completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(result), jobId]
      )
      
      // Emit success notification (or warning if partial success)
      if (userId) {
        const message = failedJobs && failedJobs.length > 0
          ? `Extracted ${totalEntities} entities (${failedJobs.length} entity types failed: ${failedJobs.map(f => f.entityType).join(', ')})`
          : `Successfully extracted ${totalEntities} entities from project documents`
        
        // Emit job completion event (status is always 'completed', warnings are in the event data)
        io.emit("job:completed", {
          jobId,
          userId,
          status: "completed",
          message,
          projectId,
          totalEntities,
          partialSuccess: failedJobs && failedJobs.length > 0,
          warnings: failedJobs && failedJobs.length > 0 ? failedJobs : undefined
        })
      }
      
      // Emit project:entities-extracted event
      io.to(`project:${projectId}`).emit("project:entities-extracted", {
        projectId,
        totalEntities,
        entityCounts: counts
      })
      
      logger.info(`[EXTRACTION-PARENT] Extraction completed: ${jobId}`, { 
        projectId, 
        totalEntities 
      })
      
    } catch (error: any) {
      logger.error(`[EXTRACTION-PARENT] Failed to finalize: ${jobId} ${error.message}`)
      
      // Update job with error
      await pool.query(
        `UPDATE jobs 
         SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [error.message || "Unknown error", jobId]
      )
      throw error
    }
  }
}

