/**
 * Maps frontend camelCase entity keys to PostgreSQL table names.
 * Table names align with ExtractionOrchestrationService fallback counts (safeCount list).
 */
export const ENTITY_CAMEL_KEY_TO_TABLE: Record<string, string> = {
  stakeholders: 'stakeholders',
  requirements: 'requirements',
  risks: 'risks',
  milestones: 'milestones',
  constraints: 'constraints',
  successCriteria: 'success_criteria',
  bestPractices: 'best_practices',
  phases: 'phases',
  resources: 'resources',
  technologies: 'technologies',
  qualityStandards: 'quality_standards',
  complianceSecurity: 'compliance_security',
  deliverables: 'deliverables',
  scopeItems: 'scope_items',
  activities: 'activities',
  teamAgreements: 'team_agreements',
  developmentApproaches: 'development_approaches',
  projectIterations: 'project_iterations',
  workItems: 'work_items',
  capacityPlans: 'capacity_plans',
  performanceMeasurements: 'performance_measurements',
  earnedValueMetrics: 'earned_value_metrics',
  opportunities: 'opportunities',
  riskResponses: 'risk_responses',
  performanceActuals: 'performance_actuals',
  governanceDecisions: 'governance_decisions',
  approvalWorkflows: 'approval_workflows',
  steeringCommittees: 'steering_committees',
  changeControlBoards: 'change_control_boards',
  policyCompliance: 'policy_compliance',
  scopeBaselines: 'scope_baselines',
  wbsNodes: 'wbs_nodes',
  scopeChangeRequests: 'scope_change_requests',
  requirementsTraceability: 'requirements_traceability',
  scopeVerification: 'scope_verification',
  scheduleBaselines: 'schedule_baselines',
  scheduleActivities: 'schedule_activities',
  criticalPathActivities: 'critical_path_activities',
  scheduleVariances: 'schedule_variances',
  scheduleForecasts: 'schedule_forecasts',
  budgetBaselines: 'budget_baselines',
  costActuals: 'cost_actuals',
  costEstimates: 'cost_estimates',
  fundingTranches: 'funding_tranches',
  financialVariances: 'financial_variances',
  procurementCosts: 'procurement_costs',
  resourceAssignments: 'resource_assignments',
  resourcePool: 'resource_pool',
  capacityForecasts: 'capacity_forecasts',
  utilizationRecords: 'utilization_records',
  resourceConflicts: 'resource_conflicts',
  onboardingOffboarding: 'onboarding_offboarding',
  riskAssessments: 'risk_assessments',
  riskResponsePlans: 'risk_response_plans',
  riskTriggers: 'risk_triggers',
  riskReviews: 'risk_reviews',
  contingencyReserves: 'contingency_reserves',
  riskMetrics: 'risk_metrics',
  engagementActions: 'engagement_actions',
  communicationLogs: 'communication_logs',
  satisfactionSurveys: 'satisfaction_surveys',
  stakeholderIssues: 'stakeholder_issues',
  relationshipHealth: 'relationship_health',
  dtAssets: 'dt_assets',
}

const ALLOWED_TABLES = new Set(Object.values(ENTITY_CAMEL_KEY_TO_TABLE))

/** Safe PostgreSQL unquoted identifiers (lowercase snake_case entity tables). */
const PG_IDENTIFIER_RE = /^[a-z][a-z0-9_]*$/

/** Tables used for project-level entity count queries ({ key, name }). */
export const ENTITY_COUNT_TABLES = Object.entries(ENTITY_CAMEL_KEY_TO_TABLE).map(([key, name]) => ({
  key,
  name,
}))

/**
 * Resolve a frontend entity type key (camelCase) or snake_case table name to a DB table.
 */
export function resolveEntityTableName(entityTypeKey: string): string | null {
  if (!entityTypeKey || typeof entityTypeKey !== 'string') return null

  const trimmed = entityTypeKey.trim()
  if (ENTITY_CAMEL_KEY_TO_TABLE[trimmed]) {
    return ENTITY_CAMEL_KEY_TO_TABLE[trimmed]
  }

  if (ALLOWED_TABLES.has(trimmed)) {
    return trimmed
  }

  return null
}

/**
 * Assert table name is on the entity whitelist and matches safe identifier rules.
 * Use before interpolating a table name into SQL (values still use $1, $2, …).
 */
export function assertAllowedEntityTableName(tableName: string): void {
  if (!ALLOWED_TABLES.has(tableName)) {
    throw new Error(`Invalid entity table: ${tableName}`)
  }
  if (!PG_IDENTIFIER_RE.test(tableName)) {
    throw new Error(`Invalid entity table identifier: ${tableName}`)
  }
}

/**
 * Resolve entity type key to a whitelist-validated table name for SQL FROM clauses.
 */
export function getAllowedEntityTableName(entityTypeKey: string): string {
  const tableName = resolveEntityTableName(entityTypeKey)
  if (!tableName) {
    throw new Error(`Unknown entity type: ${entityTypeKey}`)
  }
  assertAllowedEntityTableName(tableName)
  return tableName
}

/**
 * Double-quoted PostgreSQL identifier for a whitelist-validated entity table.
 */
export function quotedEntityTableName(tableName: string): string {
  assertAllowedEntityTableName(tableName)
  return `"${tableName}"`
}
