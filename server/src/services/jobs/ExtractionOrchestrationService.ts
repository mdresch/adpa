/**
 * Extraction Orchestration Job Service
 * Handles processing of project data extraction jobs from the queue
 * 
 * Extracted from queueService.ts as part of Phase 2 refactoring
 * to improve code organization and maintainability.
 * 
 * This service orchestrates parent-child job patterns for extracting
 * entities from project documents across multiple PMBOK domains.
 * 
 * Phase 5: Updated to support dependency injection while maintaining
 * backward compatibility with static methods.
 */

import { pool } from '@/database/connection'
import { logger } from '@/utils/logger'
import { io } from '../../socket'
import { PMBOK_DOMAINS } from '@/types/pmbok'
import type { PmbokDomain } from '@/types/pmbok'
import type { IQueueJob } from './queue/IQueue'
import { v4 as uuidv4 } from 'uuid'
// Phase 3: Use centralized types
import type { ProjectDataExtractionJobData, JobStatus, QueueName } from './types'
// Phase 5: Dependency injection
import type { QueueServiceDependencies } from './queue/QueueDependencies'

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
  'scope_baseline', 'wbs_nodes', 'scope_change_requests', 'requirements_traceability', 'scope_verification',
  // Digital Twin
  'dt_assets',
  // Schedule Domain
  'schedule_baseline', 'schedule_activities', 'critical_path', 'schedule_variances', 'schedule_forecasts',
  // Finance Domain
  'budget_baseline', 'cost_actuals', 'cost_estimates', 'funding_tranches', 'financial_variances', 'procurement_costs',
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
    'scope_baseline',
    'wbs_nodes',
    'scope_change_requests',
    'requirements_traceability',
    'scope_verification',
    'dt_assets',        // Digital Twin L0 asset register (extracted from documents)
    // ADDED: Core scope entities
    'scope_items',      // Direct scope definition
    'requirements',     // Scope requirements
    'deliverables',     // Scope deliverables
    'phases'            // Deliverables per phase
  ],

  // Schedule Domain - Timeline, milestones, activities, and schedule control
  schedule: [
    'schedule_baseline',
    'schedule_activities',
    'critical_path',
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
    'budget_baseline',
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
  dtAssets: number
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
  scope_baseline: 'scopeBaselines',
  wbs_nodes: 'wbsNodes',
  scope_change_requests: 'scopeChangeRequests',
  requirements_traceability: 'requirementsTraceability',
  scope_verification: 'scopeVerification',
  // Schedule Domain
  schedule_baseline: 'scheduleBaselines',
  schedule_activities: 'scheduleActivities',
  critical_path: 'criticalPathActivities',
  schedule_variances: 'scheduleVariances',
  schedule_forecasts: 'scheduleForecasts',
  // Finance Domain
  budget_baseline: 'budgetBaselines',
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
  relationship_health: 'relationshipHealth',
  dt_assets: 'dtAssets'
}

type DomainRunIdMap = Partial<Record<PmbokDomain, string>>

// Phase 3: Use centralized type (extended for internal use)
interface ExtendedExtractionJobData extends ProjectDataExtractionJobData {
  autoTriggered?: boolean
  sourceDocumentId?: string
  domainRunIds?: DomainRunIdMap
}

interface ProcessJobOptions {
  workerId: string
  updateJobStatus: (jobId: string, status: JobStatus, progress: number, workerId?: string, queueName?: QueueName | string, errorMessage?: string) => Promise<void>
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
 * Phase 5: Accepts optional dependencies
 */
async function registerDomainRuns(params: {
  jobId: string
  projectId: string
  userId?: string
  aiProvider?: string
  aiModel?: string
  documentIds?: string[]
  domains: PmbokDomain[]
}, deps?: QueueServiceDependencies): Promise<DomainRunIdMap> {
  const db = deps?.database || { query: pool.query.bind(pool) } as any
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
    const result = await db.query(
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
/**
 * Mark domain runs as completed
 * Phase 5: Accepts optional dependencies
 */
async function completeDomainRuns(params: {
  domainRunIds: DomainRunIdMap
  domainCounts: Record<PmbokDomain, number>
  failedEntityTypes: string[]
}, deps?: QueueServiceDependencies): Promise<void> {
  const db = deps?.database || { query: pool.query.bind(pool) } as any
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

    await db.query(
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
 * Phase 5: Accepts optional dependencies
 */
async function failDomainRuns(domainRunIds?: DomainRunIdMap, reason?: string, deps?: QueueServiceDependencies): Promise<void> {
  const db = deps?.database || { query: pool.query.bind(pool) } as any
  if (!domainRunIds) return
  const entries = Object.values(domainRunIds).filter((id): id is string => Boolean(id))
  if (!entries.length) return
  await Promise.all(
    entries.map((runId) =>
      db.query(
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
 * Phase 5: Supports both static methods (backward compatibility) and instance methods (DI)
 */
export class ExtractionOrchestrationService {
  // Phase 5: Instance properties for dependency injection
  private database: QueueServiceDependencies['database']
  private websocket: QueueServiceDependencies['websocket']
  private logger: QueueServiceDependencies['logger']

  /**
   * Phase 5: Constructor for dependency injection
   */
  constructor(dependencies?: QueueServiceDependencies) {
    if (dependencies) {
      this.database = dependencies.database
      this.websocket = dependencies.websocket
      this.logger = dependencies.logger
    } else {
      // Fallback to global imports for backward compatibility
      this.database = { query: pool.query.bind(pool), connect: pool.connect.bind(pool), end: pool.end.bind(pool) } as any
      this.websocket = io as any
      this.logger = logger as any
    }
  }

  /**
   * Process an extraction orchestration job (instance method with DI)
   */
  async processJob(job: IQueueJob, options: ProcessJobOptions): Promise<any> {
    return ExtractionOrchestrationService.processJob(job, options, {
      database: this.database,
      websocket: this.websocket,
      logger: this.logger,
    } as QueueServiceDependencies)
  }

  /**
   * Process an extraction orchestration job (static method for backward compatibility)
   * Phase 5: Now accepts optional dependencies parameter
   */
  static async processJob(job: IQueueJob, options: ProcessJobOptions, deps?: QueueServiceDependencies): Promise<any> {
    // Phase 5: Use injected dependencies or fall back to global imports
    // Ensure pool is available before creating fallback
    let db: any
    if (deps?.database) {
      db = deps.database
    } else {
      // Fallback: get fresh pool reference if needed
      if (!pool) {
        const { getDatabasePool } = await import('@/database/connection')
        const freshPool = getDatabasePool()
        if (!freshPool) {
          throw new Error('Database connection pool is not initialized. Ensure connectDatabase() is called before processing jobs.')
        }
        db = { query: freshPool.query.bind(freshPool) }
      } else {
        db = { query: pool.query.bind(pool) }
      }
    }
    const ws = deps?.websocket || io
    const log = deps?.logger || logger
    const { jobId, projectId, userId, aiProvider, aiModel, documentIds, domains } = job.data as ExtendedExtractionJobData
    const selectedDomains = normalizeDomains(domains)
    const entityTypesForRun = resolveEntityTypesForDomains(selectedDomains)
    const { workerId, updateJobStatus } = options

    try {
      // Check if job is already marked as failed/cancelled in database before processing
      const jobCheck = await db.query(
        'SELECT status, error_message FROM jobs WHERE id = $1',
        [jobId]
      )

      if (jobCheck.rows.length > 0) {
        const dbJob = jobCheck.rows[0]
        // Skip processing if job is already failed, cancelled, or has an error message
        if (dbJob.status === 'failed' || dbJob.status === 'cancelled' || dbJob.error_message) {
          log.warn(`[EXTRACTION-PARENT] ⚠️ Skipping job ${jobId} - already ${dbJob.status} with error: ${dbJob.error_message?.substring(0, 50)}`)
          // Update database to ensure it's marked as failed
          await db.query(
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
        log.warn(`[EXTRACTION-PARENT] ⚠️ Job ${jobId} not found in database - skipping`)
        await job.remove()
        return
      }

      log.info(`[EXTRACTION-PARENT] 🚀 Starting orchestration: ${jobId}`, {
        projectId,
        userId,
        documentIds,
        domains: selectedDomains,
        autoTriggered: (job.data as ExtendedExtractionJobData).autoTriggered || false,
        sourceDocumentId: (job.data as ExtendedExtractionJobData).sourceDocumentId
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
      }, deps)

        // ensure job data reflects selected domains for downstream processing
        ; (job.data as ExtendedExtractionJobData).domains = selectedDomains
        ; (job.data as ExtendedExtractionJobData).domainRunIds = domainRunIds

      // Use queue service to persist DB rows and create child jobs with canonical UUID jobIds
      const { addJob, getQueueService } = await import('../queueService')
      const queueSvc = getQueueService()

      // Create child jobs for each entity type via QueueService.addJob (creates DB row + enqueues)
      const childJobPromises = entityTypesForRun.map(async (entityType, index) => {
        const childJobId = uuidv4()
        const jobData = {
          jobId: childJobId,
          parentJobId: jobId,
          projectId,
          userId,
          aiProvider,
          aiModel,
          documentIds,
          entityType,
          entityIndex: index,
          totalEntities: entityTypesForRun.length
        }

        // addJob will insert a DB row and enqueue with the provided jobId
        await addJob(`extract-entity-${entityType}` as any, jobData, {
          jobId: childJobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }
        })

        // Retrieve the queued job wrapper so we can monitor its state
        const childQueue = (queueSvc as any).getQueue('project-data-extraction')
        try {
          const queued = await childQueue.getJob(childJobId)
          return queued || ({ id: childJobId, data: jobData, getState: async () => 'unknown' })
        } catch (err) {
          // If we cannot get the job wrapper, return a lightweight object compatible with monitoring
          return ({ id: childJobId, data: jobData, getState: async () => 'unknown' })
        }
      })

      // Wait for all child jobs to be created (returned as IQueueJob wrappers or placeholders)
      const childJobs = await Promise.all(childJobPromises)

      log.info(`[EXTRACTION-PARENT] Created ${childJobs.length} child extraction jobs`, { jobId })

      await updateJobStatus(jobId, "processing", 10, workerId)

      // Store child job IDs in parent job data
      await db.query(
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

      // Monitor child job completion using a Promise that resolves when all children complete
      // This ensures Bull doesn't mark the parent job as complete prematurely
      const monitoringResult = await new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
        let completedCount = 0
        let checkInterval: NodeJS.Timeout | null = null
        let isResolved = false // Prevent multiple resolutions
        const jobStartTimes = new Map<string, number>() // Track when each child job started processing
        // Configurable timeouts (minutes -> ms)
        const STUCK_JOB_TIMEOUT = (parseInt(process.env.EXTRACTION_STUCK_TIMEOUT_MINUTES || '10') || 10) * 60 * 1000
        const CRITICAL_JOB_TIMEOUT = (parseInt(process.env.EXTRACTION_CRITICAL_TIMEOUT_MINUTES || '20') || 20) * 60 * 1000
        const PARTIAL_SUCCESS_TIMEOUT_MS = (parseInt(process.env.EXTRACTION_PARTIAL_TIMEOUT_MINUTES || '20') || 20) * 60 * 1000
        const FULL_TIMEOUT_MS = (parseInt(process.env.EXTRACTION_FULL_TIMEOUT_MINUTES || '30') || 30) * 60 * 1000

        let partialSuccessTimeout: NodeJS.Timeout | null = null
        let fullTimeout: NodeJS.Timeout | null = null
        let currentHeartbeatProgress = 10
        let lastRealProgress = 10

        const cleanup = () => {
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
          if (partialSuccessTimeout) {
            clearTimeout(partialSuccessTimeout)
            partialSuccessTimeout = null
          }
          if (fullTimeout) {
            clearTimeout(fullTimeout)
            fullTimeout = null
          }
          // Clean up global reference
          if ((global as any).extractionIntervals) {
            (global as any).extractionIntervals.delete(jobId)
          }
        }

        const performCheck = async (): Promise<void> => {
          if (isResolved) return // Skip if already resolved

          try {
            // Check if job was cancelled
            const statusCheck = await db.query(
              'SELECT status FROM jobs WHERE id = $1',
              [jobId]
            )
            if (statusCheck.rows.length > 0 && statusCheck.rows[0].status === 'cancelled') {
              log.info(`[EXTRACTION-PARENT] Job ${jobId} was cancelled - stopping monitoring`)
              cleanup()
              isResolved = true
              resolve({ success: false, error: 'Job was cancelled' })
              return
            }

            const now = Date.now()
            const states = await Promise.all(
              childJobs.map(async (j) => {
                try {
                  const state = await j.getState()

                  const jobIdStr = j.id.toString()

                  // Track when jobs start processing
                  if (state === 'active' && !jobStartTimes.has(jobIdStr)) {
                    jobStartTimes.set(jobIdStr, now)
                    const entityType = (j.data as any)?.entityType || 'unknown'
                    log.debug(`[EXTRACTION-PARENT] Child job ${j.id} (${entityType}) started processing`)
                  }

                  // use configured timeouts above
                  const STUCK_JOB_TIMEOUT_LOCAL = STUCK_JOB_TIMEOUT
                  const CRITICAL_JOB_TIMEOUT_LOCAL = CRITICAL_JOB_TIMEOUT

                  // Check for stuck jobs (active for too long)
                  if (state === 'active') {
                    const startTime = jobStartTimes.get(jobIdStr)
                    if (startTime) {
                      const activeDuration = now - startTime
                      const entityType = (j.data as any)?.entityType || 'unknown'

                      if (activeDuration > CRITICAL_JOB_TIMEOUT) {
                        log.error(`[EXTRACTION-PARENT] 🛑 Child job ${j.id} (${entityType}) is CRITICALLY stuck (>20m active). Treating as failed.`)
                        return 'failed'
                      } else if (activeDuration > STUCK_JOB_TIMEOUT) {
                        const stuckDuration = Math.floor(activeDuration / 1000 / 60)
                        log.warn(`[EXTRACTION-PARENT] ⚠️ Child job ${j.id} (${entityType}) appears stuck - active for ${stuckDuration} minutes`)
                      }
                    }
                  }

                  // Treat 'unknown' (job removed from queue) as completed
                  // This happens when jobs are auto-cleaned after completion
                  if ((state as string) === 'unknown') {
                    log.debug(`[EXTRACTION-PARENT] Child job ${j.id} state is 'unknown' (removed from queue), treating as completed`)
                    jobStartTimes.delete(jobIdStr)
                    return 'completed'
                  }

                  // Clear start time when job completes or fails
                  if (state === 'completed' || state === 'failed') {
                    jobStartTimes.delete(jobIdStr)
                  }

                  return state
                } catch (err) {
                  // If we can't get state, assume completed (job was cleaned up)
                  log.warn(`[EXTRACTION-PARENT] Could not get state for child job ${j.id}, assuming completed: ${err}`)
                  const jobIdStr = j.id.toString()
                  jobStartTimes.delete(jobIdStr)
                  return 'completed'
                }
              })
            )

            const completed = states.filter(s => s === 'completed').length
            const failed = states.filter(s => s === 'failed').length
            const active = states.filter(s => s === 'active').length
            const waiting = states.filter(s => s === 'waiting' || s === 'delayed').length

            // Log detailed progress including stuck jobs
            const stuckJobs = childJobs
              .map((j, i) => ({ job: j, state: states[i], index: i }))
              .filter(({ state }) => state === 'active')
              .filter(({ job }) => {
                const startTime = jobStartTimes.get(job.id.toString())
                return startTime && (now - startTime) > STUCK_JOB_TIMEOUT
              })
              .map(({ job }) => {
                const entityType = (job.data as any)?.entityType || 'unknown'
                const startTime = jobStartTimes.get(job.id.toString())
                const stuckDuration = startTime ? Math.floor((now - startTime) / 1000 / 60) : 0
                return `${entityType} (${stuckDuration}m)`
              })

            if (stuckJobs.length > 0) {
              log.warn(`[EXTRACTION-PARENT] Job ${jobId} progress: ${completed} completed, ${failed} failed, ${active} active (${stuckJobs.length} stuck: ${stuckJobs.join(', ')}), ${waiting} waiting out of ${childJobs.length}`)
            } else if (active > 0 || waiting > 0) {
              log.debug(`[EXTRACTION-PARENT] Job ${jobId} progress: ${completed} completed, ${failed} failed, ${active} active, ${waiting} waiting out of ${childJobs.length}`)
            } else {
              log.debug(`[EXTRACTION-PARENT] Job ${jobId} progress: ${completed} completed, ${failed} failed out of ${childJobs.length}`)
            }

            const activeEntities = childJobs
              .map((j, i) => ({ entity: (j.data as any).entityType, state: states[i] }))
              .filter(s => s.state === 'active')
              .map(s => s.entity)
              .slice(0, 3) // Show first 3 active entities

            const activeMessage = activeEntities.length > 0
              ? `Extracting ${activeEntities.join(', ')}${activeEntities.length < active ? '...' : ''}`
              : 'Orchestrating extractions...'

            const realProgress = 10 + Math.floor(((completed + failed) / childJobs.length) * 85)

            // Sync heartbeat with real progress if real progress moved forward
            if (realProgress > lastRealProgress) {
              lastRealProgress = realProgress
              currentHeartbeatProgress = Math.max(currentHeartbeatProgress, realProgress)
            } else {
              // Otherwise, slowly increment heartbeat progress (max 1% every check)
              if (currentHeartbeatProgress < 95 && currentHeartbeatProgress < realProgress + 5) {
                currentHeartbeatProgress += 0.5
              }
            }

            if (completed + failed === childJobs.length) {
              // All children done - clean up and finalize
              cleanup()
              isResolved = true

              // Get details about failed jobs for better error reporting
              const failedJobs: Array<{ entityType: string; error: string }> = []
              if (failed > 0) {
                for (let i = 0; i < childJobs.length; i++) {
                  if (states[i] === 'failed') {
                    try {
                      const childJob = childJobs[i]
                      const entityType = (childJob.data as any)?.entityType || 'unknown'

                      // Try to get error from job's failedReason or returnvalue
                      let errorMessage = 'Unknown error'
                      try {
                        if ((childJob as any).failedReason) {
                          errorMessage = (childJob as any).failedReason
                        } else {
                          const returnValue = childJob.returnvalue ?? null
                          if (returnValue?.error) {
                            errorMessage = returnValue.error
                          } else if (returnValue?.message) {
                            errorMessage = returnValue.message
                          }
                        }
                      } catch (err) {
                        errorMessage = 'Failed after retries'
                      }

                      failedJobs.push({ entityType, error: errorMessage })
                      log.error(`[EXTRACTION-PARENT] Failed entity type: ${entityType}`, {
                        jobId: childJob.id,
                        error: errorMessage,
                        parentJobId: jobId,
                        jobData: childJob.data
                      })
                    } catch (err: any) {
                      log.error(`[EXTRACTION-PARENT] Could not get failed job details: ${err?.message || err}`, {
                        jobId: childJobs[i].id,
                        error: err
                      })
                      const entityType = (childJobs[i].data as any)?.entityType || 'unknown'
                      failedJobs.push({ entityType, error: `Could not retrieve error: ${err?.message || 'Unknown'}` })
                    }
                  }
                }

                const failedTypes = failedJobs.map(f => f.entityType).join(', ')
                log.warn(`[EXTRACTION-PARENT] ${failed} entity extraction(s) failed: ${failedTypes}`, {
                  failedJobs,
                  completed,
                  total: childJobs.length
                })

                // Allow partial success if at least 50% succeeded
                const successRate = completed / childJobs.length
                if (successRate >= 0.5) {
                  log.info(`[EXTRACTION-PARENT] Allowing partial success: ${completed}/${childJobs.length} succeeded (${(successRate * 100).toFixed(1)}%)`)
                  await this.finalizeExtractionJob(jobId, projectId, failedJobs, workerId, updateJobStatus, domainRunIds, deps)
                  resolve({ success: true })
                } else {
                  const errorMessage = `${failed} entity extraction(s) failed: ${failedTypes}. Errors: ${failedJobs.map(f => `${f.entityType}: ${f.error}`).join('; ')}`
                  reject(new Error(errorMessage))
                }
              } else {
                // All succeeded
                await this.finalizeExtractionJob(jobId, projectId, undefined, workerId, updateJobStatus, domainRunIds, deps)
                resolve({ success: true })
              }
            } else {
              // Update progress based on completed child jobs + heartbeat
              const displayProgress = Math.floor(currentHeartbeatProgress)

              // Only update DB if progress milestone reached or every few cycles to reduce load
              if (displayProgress > (job as any).lastReportedProgress || now % 9000 < 3000) {
                await updateJobStatus(jobId, "processing", displayProgress, workerId, "project-data-extraction")
                  ; (job as any).lastReportedProgress = displayProgress
              }

              // Always emit WebSocket for real-time feel
              if (ws) {
                ws.emit("job:status", {
                  jobId,
                  userId: (job.data as any).userId,
                  progress: displayProgress,
                  status: "processing",
                  projectId,
                  message: `${activeMessage} (${completed}/${childJobs.length} done)`
                })
              }
              completedCount = completed
            }
          } catch (error: any) {
            if (isResolved) return

            cleanup()
            isResolved = true

            const errorMessage = error?.message || 'Unknown extraction monitoring error'
            log.error(`[EXTRACTION-PARENT] Monitoring loop failed for job ${jobId}: ${errorMessage}`, {
              projectId,
              stack: error?.stack
            })

            try {
              await updateJobStatus(jobId, "failed", undefined, workerId, "project-data-extraction")
              await db.query(
                `UPDATE jobs 
                 SET status = 'failed', error_message = $1, 
                     started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                     processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
                     completed_at = CURRENT_TIMESTAMP 
                 WHERE id = $2`,
                [errorMessage, jobId]
              )
              await failDomainRuns((job.data as ExtendedExtractionJobData).domainRunIds || domainRunIds, errorMessage, deps)
            } catch (updateError: any) {
              log.error(
                `[EXTRACTION-PARENT] Failed to record monitoring failure for job ${jobId}: ${updateError?.message || updateError}`,
                { projectId }
              )
            }

            reject(error)
          }
        }

        // Start monitoring interval
        checkInterval = setInterval(() => {
          performCheck().catch(err => {
            log.error(`[EXTRACTION-PARENT] Unhandled error in check for job ${jobId}:`, err)
          })
        }, 3000) // Check every 3 seconds

        // Store interval reference for cleanup on cancellation
        if (!(global as any).extractionIntervals) {
          (global as any).extractionIntervals = new Map<string, NodeJS.Timeout>()
        }
        (global as any).extractionIntervals.set(jobId, checkInterval)

        // Run first check immediately
        performCheck().catch(err => {
          log.error(`[EXTRACTION-PARENT] Initial check failed for job ${jobId}:`, err)
        })

        // Add a timeout to prevent jobs from hanging forever (30 minutes max)
        // But allow partial success if most jobs completed (after 20 minutes)
        partialSuccessTimeout = setTimeout(async () => {
          if (!isResolved) {
            // Check if we have enough completed jobs to allow partial success
            try {
              const states = await Promise.all(
                childJobs.map(async (j) => {
                  try {
                    const state = await j.getState()
                    if ((state as string) === 'unknown') return 'completed'
                    return state
                  } catch {
                    return 'completed'
                  }
                })
              )

              const completed = states.filter(s => s === 'completed').length
              const failed = states.filter(s => s === 'failed').length
              const successRate = (completed + failed) / childJobs.length

              // If at least 80% of jobs are done (completed or failed), allow partial success
              if (successRate >= 0.8) {
                log.warn(`[EXTRACTION-PARENT] Job ${jobId} reached 20-minute timeout but ${(successRate * 100).toFixed(1)}% complete - allowing partial success`, {
                  completed,
                  failed,
                  total: childJobs.length,
                  successRate
                })

                const failedJobs: Array<{ entityType: string; error: string }> = []
                // Collect failed job details
                for (let i = 0; i < childJobs.length; i++) {
                  if (states[i] === 'failed') {
                    const entityType = (childJobs[i].data as any)?.entityType || 'unknown'
                    failedJobs.push({ entityType, error: 'Job failed or timed out' })
                  } else if (states[i] === 'active' || states[i] === 'waiting' || states[i] === 'delayed') {
                    const entityType = (childJobs[i].data as any)?.entityType || 'unknown'
                    failedJobs.push({ entityType, error: 'Job timed out after 20 minutes' })
                  }
                }

                cleanup()
                isResolved = true
                await this.finalizeExtractionJob(jobId, projectId, failedJobs, workerId, updateJobStatus, domainRunIds, deps)
                resolve({ success: true })
                return
              }
            } catch (err: any) {
              log.error(`[EXTRACTION-PARENT] Error checking partial success at 20-minute timeout: ${err?.message || err}`)
            }
          }
        }, PARTIAL_SUCCESS_TIMEOUT_MS) // check for partial success (configurable)

        fullTimeout = setTimeout(() => {
          if (!isResolved) {
            clearTimeout(partialSuccessTimeout)
            cleanup()
            isResolved = true
            const timeoutError = `Extraction job timed out after ${Math.floor(FULL_TIMEOUT_MS / 60000)} minutes`
            log.error(`[EXTRACTION-PARENT] ${timeoutError}: ${jobId}`)
            reject(new Error(timeoutError))
          }
        }, FULL_TIMEOUT_MS)
      })

      log.info(`[EXTRACTION-PARENT] Monitoring completed for job ${jobId}`, { result: monitoringResult })
      return monitoringResult

    } catch (error: any) {
      log.error(`[EXTRACTION-PARENT] Failed: ${jobId} ${error.message}`, { stack: error.stack })

      // Clear monitoring interval if it exists (prevent memory leak)
      if ((global as any).extractionIntervals) {
        const interval = (global as any).extractionIntervals.get(jobId)
        if (interval) {
          clearInterval(interval)
            ; (global as any).extractionIntervals.delete(jobId)
          log.info(`Cleared monitoring interval for failed job: ${jobId}`)
        }
      }

      await updateJobStatus(jobId, "failed", undefined, workerId, "project-data-extraction")
      await db.query(
        `UPDATE jobs SET status = 'failed', error_message = $1, 
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
             failed_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [error.message, jobId]
      )
      await failDomainRuns((job.data as ExtendedExtractionJobData).domainRunIds, error.message, deps)
      throw error
    }
  }

  /**
   * Finalize parent job after all child jobs complete
   * @param failedJobs Optional array of failed entity types for partial success scenarios
   * Phase 5: Accepts optional dependencies
   */
  private static async finalizeExtractionJob(
    jobId: string,
    projectId: string,
    failedJobs: Array<{ entityType: string; error: string }> | undefined,
    workerId: string,
    updateJobStatus: ProcessJobOptions['updateJobStatus'],
    domainRunIds: DomainRunIdMap,
    deps?: QueueServiceDependencies
  ): Promise<void> {
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    const ws = deps?.websocket || io
    const log = deps?.logger || logger
    try {
      log.info(`[EXTRACTION-PARENT] Finalizing job ${jobId}`)

      await updateJobStatus(jobId, "processing", 95, workerId, "project-data-extraction")

      // Phase 4: Optimize count queries - use PostgreSQL function for single optimized query
      // This replaces 63 separate queries with one function call that handles missing tables gracefully
      const startTime = Date.now()
      let countResult
      let countsJson: Record<string, number>

      try {
        // Use the optimized PostgreSQL function that handles missing tables gracefully
        const functionResult = await db.query(
          'SELECT get_all_entity_counts($1) as counts',
          [projectId]
        )

        countsJson = functionResult.rows[0].counts as Record<string, number>
        const queryTime = Date.now() - startTime
        log.debug(`[EXTRACTION-PARENT] Optimized count query completed in ${queryTime}ms`, { projectId })

        // Convert JSONB result to row format for compatibility with existing code
        countResult = {
          rows: [{
            stakeholders: countsJson.stakeholders || 0,
            requirements: countsJson.requirements || 0,
            risks: countsJson.risks || 0,
            milestones: countsJson.milestones || 0,
            constraints: countsJson.constraints || 0,
            success_criteria: countsJson.success_criteria || 0,
            best_practices: countsJson.best_practices || 0,
            phases: countsJson.phases || 0,
            resources: countsJson.resources || 0,
            technologies: countsJson.technologies || 0,
            quality_standards: countsJson.quality_standards || 0,
            compliance_security: countsJson.compliance_security || 0,
            deliverables: countsJson.deliverables || 0,
            scope_items: countsJson.scope_items || 0,
            activities: countsJson.activities || 0,
            team_agreements: countsJson.team_agreements || 0,
            development_approaches: countsJson.development_approaches || 0,
            project_iterations: countsJson.project_iterations || 0,
            work_items: countsJson.work_items || 0,
            capacity_plans: countsJson.capacity_plans || 0,
            performance_measurements: countsJson.performance_measurements || 0,
            earned_value_metrics: countsJson.earned_value_metrics || 0,
            opportunities: countsJson.opportunities || 0,
            risk_responses: countsJson.risk_responses || 0,
            performance_actuals: countsJson.performance_actuals || 0,
            governance_decisions: countsJson.governance_decisions || 0,
            approval_workflows: countsJson.approval_workflows || 0,
            steering_committees: countsJson.steering_committees || 0,
            change_control_boards: countsJson.change_control_boards || 0,
            policy_compliance: countsJson.policy_compliance || 0,
            scope_baselines: countsJson.scope_baselines || 0,
            wbs_nodes: countsJson.wbs_nodes || 0,
            scope_change_requests: countsJson.scope_change_requests || 0,
            requirements_traceability: countsJson.requirements_traceability || 0,
            scope_verification: countsJson.scope_verification || 0,
            schedule_baselines: countsJson.schedule_baselines || 0,
            schedule_activities: countsJson.schedule_activities || 0,
            critical_path_activities: countsJson.critical_path_activities || 0,
            schedule_variances: countsJson.schedule_variances || 0,
            schedule_forecasts: countsJson.schedule_forecasts || 0,
            budget_baselines: countsJson.budget_baselines || 0,
            cost_actuals: countsJson.cost_actuals || 0,
            cost_estimates: countsJson.cost_estimates || 0,
            funding_tranches: countsJson.funding_tranches || 0,
            financial_variances: countsJson.financial_variances || 0,
            procurement_costs: countsJson.procurement_costs || 0,
            resource_assignments: countsJson.resource_assignments || 0,
            resource_pool: countsJson.resource_pool || 0,
            capacity_forecasts: countsJson.capacity_forecasts || 0,
            utilization_records: countsJson.utilization_records || 0,
            resource_conflicts: countsJson.resource_conflicts || 0,
            onboarding_offboarding: countsJson.onboarding_offboarding || 0,
            risk_assessments: countsJson.risk_assessments || 0,
            risk_response_plans: countsJson.risk_response_plans || 0,
            risk_triggers: countsJson.risk_triggers || 0,
            risk_reviews: countsJson.risk_reviews || 0,
            contingency_reserves: countsJson.contingency_reserves || 0,
            risk_metrics: countsJson.risk_metrics || 0,
            engagement_actions: countsJson.engagement_actions || 0,
            communication_logs: countsJson.communication_logs || 0,
            satisfaction_surveys: countsJson.satisfaction_surveys || 0,
            stakeholder_issues: countsJson.stakeholder_issues || 0,
            relationship_health: countsJson.relationship_health || 0
          }]
        }
      } catch (error: unknown) {
        // Fallback to individual queries if function doesn't exist or fails
        const errorMessage = error instanceof Error ? error.message : String(error)
        log.warn(`[EXTRACTION-PARENT] Optimized count function failed, falling back to individual queries: ${errorMessage}`)

        const safeCount = async (table: string): Promise<number> => {
          try {
            const result = await db.query(`SELECT COUNT(*) as count FROM ${table} WHERE project_id = $1`, [projectId])
            return parseInt(result.rows[0].count)
          } catch {
            return 0
          }
        }

        const fallbackStartTime = Date.now()
        const countQueries = await Promise.all([
          safeCount('stakeholders'), safeCount('requirements'), safeCount('risks'), safeCount('milestones'),
          safeCount('constraints'), safeCount('success_criteria'), safeCount('best_practices'), safeCount('phases'),
          safeCount('resources'), safeCount('technologies'), safeCount('quality_standards'), safeCount('compliance_security'),
          safeCount('deliverables'), safeCount('scope_items'), safeCount('activities'),
          safeCount('team_agreements'), safeCount('development_approaches'), safeCount('project_iterations'),
          safeCount('work_items'), safeCount('capacity_plans'), safeCount('performance_measurements'),
          safeCount('earned_value_metrics'), safeCount('opportunities'), safeCount('risk_responses'),
          safeCount('performance_actuals'), safeCount('governance_decisions'), safeCount('approval_workflows'),
          safeCount('steering_committees'), safeCount('change_control_boards'), safeCount('policy_compliance'),
          safeCount('scope_baselines'), safeCount('wbs_nodes'), safeCount('scope_change_requests'),
          safeCount('requirements_traceability'), safeCount('scope_verification'), safeCount('schedule_baselines'),
          safeCount('schedule_activities'), safeCount('critical_path_activities'), safeCount('schedule_variances'),
          safeCount('schedule_forecasts'), safeCount('budget_baselines'), safeCount('cost_actuals'),
          safeCount('cost_estimates'), safeCount('funding_tranches'), safeCount('financial_variances'),
          safeCount('procurement_costs'), safeCount('resource_assignments'), safeCount('resource_pool'),
          safeCount('capacity_forecasts'), safeCount('utilization_records'), safeCount('resource_conflicts'),
          safeCount('onboarding_offboarding'), safeCount('risk_assessments'), safeCount('risk_response_plans'),
          safeCount('risk_triggers'), safeCount('risk_reviews'), safeCount('contingency_reserves'),
          safeCount('risk_metrics'), safeCount('engagement_actions'), safeCount('communication_logs'),
          safeCount('satisfaction_surveys'), safeCount('stakeholder_issues'), safeCount('relationship_health')
        ])
        const fallbackTime = Date.now() - fallbackStartTime
        log.warn(`[EXTRACTION-PARENT] Fallback queries completed in ${fallbackTime}ms (63 queries)`, { projectId })

        // Convert to object format for compatibility
        countResult = {
          rows: [{
            stakeholders: countQueries[0], requirements: countQueries[1], risks: countQueries[2],
            milestones: countQueries[3], constraints: countQueries[4], success_criteria: countQueries[5],
            best_practices: countQueries[6], phases: countQueries[7], resources: countQueries[8],
            technologies: countQueries[9], quality_standards: countQueries[10], compliance_security: countQueries[11],
            deliverables: countQueries[12], scope_items: countQueries[13], activities: countQueries[14],
            team_agreements: countQueries[15], development_approaches: countQueries[16], project_iterations: countQueries[17],
            work_items: countQueries[18], capacity_plans: countQueries[19], performance_measurements: countQueries[20],
            earned_value_metrics: countQueries[21], opportunities: countQueries[22], risk_responses: countQueries[23],
            performance_actuals: countQueries[24], governance_decisions: countQueries[25], approval_workflows: countQueries[26],
            steering_committees: countQueries[27], change_control_boards: countQueries[28], policy_compliance: countQueries[29],
            scope_baselines: countQueries[30], wbs_nodes: countQueries[31], scope_change_requests: countQueries[32],
            requirements_traceability: countQueries[33], scope_verification: countQueries[34], schedule_baselines: countQueries[35],
            schedule_activities: countQueries[36], critical_path_activities: countQueries[37], schedule_variances: countQueries[38],
            schedule_forecasts: countQueries[39], budget_baselines: countQueries[40], cost_actuals: countQueries[41],
            cost_estimates: countQueries[42], funding_tranches: countQueries[43], financial_variances: countQueries[44],
            procurement_costs: countQueries[45], resource_assignments: countQueries[46], resource_pool: countQueries[47],
            capacity_forecasts: countQueries[48], utilization_records: countQueries[49], resource_conflicts: countQueries[50],
            onboarding_offboarding: countQueries[51], risk_assessments: countQueries[52], risk_response_plans: countQueries[53],
            risk_triggers: countQueries[54], risk_reviews: countQueries[55], contingency_reserves: countQueries[56],
            risk_metrics: countQueries[57], engagement_actions: countQueries[58], communication_logs: countQueries[59],
            satisfaction_surveys: countQueries[60], stakeholder_issues: countQueries[61], relationship_health: countQueries[62]
          }]
        }
      }

      const row = countResult.rows[0]

      // Phase 4: Use optimized query result (single row with all counts)
      const counts: DomainCountSummary = {
        // Core entities
        stakeholders: parseInt(row.stakeholders) || 0,
        requirements: parseInt(row.requirements) || 0,
        risks: parseInt(row.risks) || 0,
        milestones: parseInt(row.milestones) || 0,
        constraints: parseInt(row.constraints) || 0,
        successCriteria: parseInt(row.success_criteria) || 0,
        bestPractices: parseInt(row.best_practices) || 0,
        phases: parseInt(row.phases) || 0,
        resources: parseInt(row.resources) || 0,
        technologies: parseInt(row.technologies) || 0,
        qualityStandards: parseInt(row.quality_standards) || 0,
        complianceSecurity: parseInt(row.compliance_security) || 0,
        deliverables: parseInt(row.deliverables) || 0,
        scopeItems: parseInt(row.scope_items) || 0,
        activities: parseInt(row.activities) || 0,
        // Performance Domain entities
        teamAgreements: parseInt(row.team_agreements) || 0,
        developmentApproaches: parseInt(row.development_approaches) || 0,
        projectIterations: parseInt(row.project_iterations) || 0,
        workItems: parseInt(row.work_items) || 0,
        capacityPlans: parseInt(row.capacity_plans) || 0,
        performanceMeasurements: parseInt(row.performance_measurements) || 0,
        earnedValueMetrics: parseInt(row.earned_value_metrics) || 0,
        opportunities: parseInt(row.opportunities) || 0,
        riskResponses: parseInt(row.risk_responses) || 0,
        performanceActuals: parseInt(row.performance_actuals) || 0,
        // Knowledge Area Domain entities
        // Governance
        governanceDecisions: parseInt(row.governance_decisions) || 0,
        approvalWorkflows: parseInt(row.approval_workflows) || 0,
        steeringCommittees: parseInt(row.steering_committees) || 0,
        changeControlBoards: parseInt(row.change_control_boards) || 0,
        policyCompliance: parseInt(row.policy_compliance) || 0,
        // Scope
        scopeBaselines: parseInt(row.scope_baselines) || 0,
        wbsNodes: parseInt(row.wbs_nodes) || 0,
        scopeChangeRequests: parseInt(row.scope_change_requests) || 0,
        requirementsTraceability: parseInt(row.requirements_traceability) || 0,
        scopeVerification: parseInt(row.scope_verification) || 0,
        // Schedule
        scheduleBaselines: parseInt(row.schedule_baselines) || 0,
        scheduleActivities: parseInt(row.schedule_activities) || 0,
        criticalPathActivities: parseInt(row.critical_path_activities) || 0,
        scheduleVariances: parseInt(row.schedule_variances) || 0,
        scheduleForecasts: parseInt(row.schedule_forecasts) || 0,
        // Finance
        budgetBaselines: parseInt(row.budget_baselines) || 0,
        costActuals: parseInt(row.cost_actuals) || 0,
        costEstimates: parseInt(row.cost_estimates) || 0,
        fundingTranches: parseInt(row.funding_tranches) || 0,
        financialVariances: parseInt(row.financial_variances) || 0,
        procurementCosts: parseInt(row.procurement_costs) || 0,
        // Resources
        resourceAssignments: parseInt(row.resource_assignments) || 0,
        resourcePool: parseInt(row.resource_pool) || 0,
        capacityForecasts: parseInt(row.capacity_forecasts) || 0,
        utilizationRecords: parseInt(row.utilization_records) || 0,
        resourceConflicts: parseInt(row.resource_conflicts) || 0,
        onboardingOffboarding: parseInt(row.onboarding_offboarding) || 0,
        // Risk
        riskAssessments: parseInt(row.risk_assessments) || 0,
        riskResponsePlans: parseInt(row.risk_response_plans) || 0,
        riskTriggers: parseInt(row.risk_triggers) || 0,
        riskReviews: parseInt(row.risk_reviews) || 0,
        contingencyReserves: parseInt(row.contingency_reserves) || 0,
        riskMetrics: parseInt(row.risk_metrics) || 0,
        // Stakeholders Ops
        engagementActions: parseInt(row.engagement_actions) || 0,
        communicationLogs: parseInt(row.communication_logs) || 0,
        satisfactionSurveys: parseInt(row.satisfaction_surveys) || 0,
        stakeholderIssues: parseInt(row.stakeholder_issues) || 0,
        relationshipHealth: parseInt(row.relationship_health) || 0
      }

      const entityCountLookup = Object.entries(ENTITY_COUNT_KEY_MAP).reduce(
        (acc, [entityType, key]) => {
          acc[entityType as EntityType] = counts[key]
          return acc
        },
        {} as Record<EntityType, number>
      )

      const jobData = await db.query(`SELECT created_by, data FROM jobs WHERE id = $1`, [jobId])
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
      }, deps)

      const totalEntities = Object.values(counts).reduce((sum, count) => sum + count, 0)

      log.info(`[EXTRACTION-PARENT] Total entities extracted: ${totalEntities}`)

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
        log.warn(`[EXTRACTION-PARENT] Partial success: ${failedJobs.length} entity types failed`, {
          failedTypes: result.failedEntityTypes
        })
      }

      // After we know project-level entity tables are populated, rebuild
      // per-document entity_counts and inferred_*_domain, then refresh
      // template_entity_profile using the helper views.
      // This runs best-effort; failures here should not break the main extraction job.
      try {
        const { default: DocumentPurposeService } = await import('../documentPurposeService')
        const { default: TemplateAnalyticsService } = await import('../templateAnalyticsService')

        log.info(`[EXTRACTION-PARENT] Rebuilding document purposes for project ${projectId}`)

        // Check how many documents have entities before rebuild
        const beforeCheck = await db.query(
          `SELECT COUNT(*) as doc_count,
                  COUNT(CASE WHEN source_document_id IS NOT NULL THEN 1 END) as entities_with_source
           FROM (
             SELECT DISTINCT source_document_id FROM stakeholders WHERE project_id = $1 AND source_document_id IS NOT NULL
             UNION
             SELECT DISTINCT source_document_id FROM requirements WHERE project_id = $1 AND source_document_id IS NOT NULL
             UNION
             SELECT DISTINCT source_document_id FROM risks WHERE project_id = $1 AND source_document_id IS NOT NULL
             LIMIT 100
           ) sub`,
          [projectId]
        )
        log.info(`[EXTRACTION-PARENT] Pre-rebuild check: Found entities with source_document_id for project ${projectId}`)

        await DocumentPurposeService.rebuildForProject(projectId)

        // Verify entity_counts were populated
        const afterCheck = await db.query(
          `SELECT COUNT(*) as total_docs,
                  COUNT(CASE WHEN entity_counts != '{}'::jsonb AND entity_counts IS NOT NULL THEN 1 END) as docs_with_counts
           FROM documents
           WHERE project_id = $1`,
          [projectId]
        )
        log.info(`[EXTRACTION-PARENT] Post-rebuild check: ${afterCheck.rows[0].docs_with_counts}/${afterCheck.rows[0].total_docs} documents have entity_counts populated`)

        // Recompute template_entity_profile rows only for templates used in this project
        log.info(`[EXTRACTION-PARENT] Finding templates used in project ${projectId}`)
        const templatesRes = await db.query(
          `SELECT DISTINCT template_id,
                  COUNT(*) as doc_count,
                  COUNT(CASE WHEN entity_counts != '{}'::jsonb AND entity_counts IS NOT NULL THEN 1 END) as docs_with_counts
           FROM documents
           WHERE project_id = $1 AND template_id IS NOT NULL
           GROUP BY template_id`,
          [projectId]
        )

        const templateIds = templatesRes.rows.map((row) => row.template_id as string)
        log.info(`[EXTRACTION-PARENT] Found ${templateIds.length} templates to update:`,
          templatesRes.rows.map((r: any) => ({
            templateId: r.template_id,
            totalDocs: r.doc_count,
            docsWithCounts: r.docs_with_counts
          }))
        )

        if (templateIds.length > 0) {
          for (const templateId of templateIds) {
            const templateInfo = templatesRes.rows.find((r: any) => r.template_id === templateId)
            log.info(`[EXTRACTION-PARENT] Updating template entity profile for template ${templateId} (${templateInfo?.docs_with_counts}/${templateInfo?.doc_count} docs have entity_counts)`)
            await TemplateAnalyticsService.updateTemplateEntityProfile(templateId)
          }
          log.info(`[EXTRACTION-PARENT] Successfully updated ${templateIds.length} template entity profiles`)
        } else {
          log.warn(`[EXTRACTION-PARENT] No templates found for project ${projectId} - documents may not have template_id set`)
        }
      } catch (analyticsError: any) {
        log.error('[EXTRACTION-PARENT] Failed to rebuild document/template purpose analytics', {
          jobId,
          projectId,
          error: analyticsError.message,
          stack: analyticsError.stack
        })
        // Don't throw - this is best-effort and shouldn't break the extraction job
      }

      // Update job to completed (status is VARCHAR(20), so we use 'completed' and store warnings in result)
      // Note: Status column is VARCHAR(20), so we can't use 'completed_with_warnings' (25 chars)
      // Instead, we store the partial success info in the result JSON
      await db.query(
        `UPDATE jobs 
         SET status = 'completed', result = $1, progress = 100, 
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(result), jobId]
      )

      // Emit success notification (or warning if partial success)
      if (userId) {
        const message = failedJobs && failedJobs.length > 0
          ? `Extracted ${totalEntities} entities (${failedJobs.length} entity types failed: ${failedJobs.map(f => f.entityType).join(', ')})`
          : `Successfully extracted ${totalEntities} entities from project documents`

        // Emit job completion event (status is always 'completed', warnings are in the event data)
        ws.emit("job:completed", {
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
      ws.to(`project:${projectId}`).emit("project:entities-extracted", {
        projectId,
        totalEntities,
        entityCounts: counts
      })

      log.info(`[EXTRACTION-PARENT] Extraction completed: ${jobId}`, {
        projectId,
        totalEntities
      })

      // Enqueue GKG sync when Neo4j is configured (non-fatal if enqueue fails)
      try {
        const { isNeo4jConfigured } = await import("../../utils/neo4j")
        const { addJob } = await import("../queueService")
        if (isNeo4jConfigured() && projectId) {
          await addJob("gkg-sync-project", { projectId }, { attempts: 2, backoff: { type: "exponential", delay: 5000 } })
          log.info(`[EXTRACTION-PARENT] Enqueued GKG sync for project ${projectId}`)
        }
      } catch (gkgErr: any) {
        log.warn(`[EXTRACTION-PARENT] GKG sync enqueue failed (non-fatal): ${gkgErr?.message || gkgErr}`)
      }

      // Automatically trigger WBS import after successful extraction
      try {
        const relevantDomains: PmbokDomain[] = ['planning', 'project_work', 'delivery', 'scope', 'schedule', 'development_approach', 'team', 'resources']
        const hasRelevantData = Object.keys(domainRunIds).some(domain =>
          relevantDomains.includes(domain as PmbokDomain)
        )

        if (hasRelevantData) {
          const { importWBSFromProjectEntities } = await import("../wbsImportService")

          // Get the user ID who triggered the job
          const jobResult = await db.query('SELECT created_by FROM jobs WHERE id = $1', [jobId])
          const userId = jobResult.rows[0]?.created_by || 'system'

          log.info(`[EXTRACTION-PARENT] Automatically triggering WBS import for project ${projectId}`)
          const importResult = await importWBSFromProjectEntities(projectId, userId, { autoMatchRoles: true })

          log.info(`[EXTRACTION-PARENT] Auto-WBS import completed`, {
            projectId,
            tasksCreated: importResult.tasksCreated,
            totalHours: importResult.totalEstimatedHours
          })

          // Update message with WBS import summary
          const wbsSummary = `Auto-WBS: ${importResult.tasksCreated} tasks created/updated.`
          await db.query(
            `UPDATE jobs SET message = message || $1 WHERE id = $2`,
            [`\n${wbsSummary}`, jobId]
          )
        }
      } catch (importErr: any) {
        log.warn(`[EXTRACTION-PARENT] Auto-WBS import failed (non-fatal): ${importErr?.message || importErr}`)
      }

    } catch (error: any) {
      log.error(`[EXTRACTION-PARENT] Failed to finalize: ${jobId} ${error.message}`)

      // Update job with error
      await db.query(
        `UPDATE jobs 
         SET status = 'failed', error_message = $1, 
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [error.message || "Unknown error", jobId]
      )
      throw error
    }
  }
}

