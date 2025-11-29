/**
 * PMBOK 8 Domain Types
 * 
 * Two-tier domain model:
 * - Tier 1: Performance Domains (PMBOK 8 outcome-focused)
 * - Tier 2: Knowledge Area Domains (function-focused, operational controls)
 * 
 * @see docs/06-features/pmbok/pmbok8-alignment.md
 */

// =============================================================================
// TIER 1: Performance Domains (PMBOK 8)
// =============================================================================

export const PMBOK_PERFORMANCE_DOMAINS = [
  'stakeholders',
  'team',
  'development_approach',
  'planning',
  'project_work',
  'delivery',
  'measurement',
  'uncertainty'
] as const

export type PmbokPerformanceDomain = (typeof PMBOK_PERFORMANCE_DOMAINS)[number]

// =============================================================================
// TIER 2: Knowledge Area Domains (Supplementary)
// =============================================================================

export const PMBOK_KNOWLEDGE_DOMAINS = [
  'governance',
  'scope',
  'schedule',
  'finance',
  'resources',
  'risk',
  'stakeholders_ops'
] as const

export type PmbokKnowledgeDomain = (typeof PMBOK_KNOWLEDGE_DOMAINS)[number]

// =============================================================================
// Combined Domain Types
// =============================================================================

export const PMBOK_DOMAINS = [
  ...PMBOK_PERFORMANCE_DOMAINS,
  ...PMBOK_KNOWLEDGE_DOMAINS
] as const

export type PmbokDomain = (typeof PMBOK_DOMAINS)[number]

// Domain tier classification
export type DomainTier = 'performance' | 'knowledge'

export const getDomainTier = (domain: PmbokDomain): DomainTier => {
  return (PMBOK_PERFORMANCE_DOMAINS as readonly string[]).includes(domain)
    ? 'performance'
    : 'knowledge'
}

export const isPerformanceDomain = (domain: PmbokDomain): domain is PmbokPerformanceDomain => {
  return (PMBOK_PERFORMANCE_DOMAINS as readonly string[]).includes(domain)
}

export const isKnowledgeDomain = (domain: PmbokDomain): domain is PmbokKnowledgeDomain => {
  return (PMBOK_KNOWLEDGE_DOMAINS as readonly string[]).includes(domain)
}

// =============================================================================
// Project Management Focus Areas (Phases)
// =============================================================================

export const PROJECT_FOCUS_AREAS = [
  'initiating',
  'planning',
  'executing',
  'monitoring_controlling',
  'closing'
] as const

export type ProjectFocusArea = (typeof PROJECT_FOCUS_AREAS)[number]

// Domain contribution intensity per focus area
export type ContributionIntensity = 'primary' | 'major' | 'moderate' | 'minor' | 'minimal'

export interface DomainFocusAreaMapping {
  domain: PmbokDomain
  focusArea: ProjectFocusArea
  intensity: ContributionIntensity
  activities: string[]
  entities: string[]
}

// =============================================================================
// KPI Definitions
// =============================================================================

export interface DomainKpiDefinition {
  domain: PmbokDomain
  key: string
  label: string
  description: string
  targetDirection: 'higher_is_better' | 'lower_is_better' | 'range'
  units?: string
  targetValue?: number
  minValue?: number
  maxValue?: number
}

export interface DomainKpiSnapshot {
  projectId: string
  domain: PmbokDomain
  metricName: string
  metricValue: number | null
  targetValue?: number | null
  variance?: number | null
  status?: 'on_track' | 'at_risk' | 'off_track' | 'improving' | 'declining' | 'unknown'
  units?: string
  recordedAt: string
  payload?: Record<string, unknown>
}

// =============================================================================
// Extraction Run Types
// =============================================================================

export interface DomainExtractionRunSummary {
  id: string
  projectId: string
  domain: PmbokDomain
  tier: DomainTier
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial'
  aiProvider?: string
  aiModel?: string
  cacheHitRate?: number | null
  successRate?: number | null
  totalEntities?: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  extractionRuntimeMs?: number | null
  startedAt?: string | null
  completedAt?: string | null
  errorCode?: string | null
}

export interface DomainMetricBlock {
  domain: PmbokDomain
  tier: DomainTier
  kpis: DomainKpiSnapshot[]
  summaryScore?: number | null
  recommendations?: string[]
  lastUpdated?: string
}

// =============================================================================
// KPI Definitions by Domain
// =============================================================================

export const DOMAIN_KPI_KEYS: Record<PmbokDomain, DomainKpiDefinition[]> = {
  // =========================================================================
  // TIER 1: Performance Domains
  // =========================================================================
  
  stakeholders: [
    {
      domain: 'stakeholders',
      key: 'engagement_score',
      label: 'Engagement Score',
      description: 'Average engagement score across stakeholders with interest/influence populated.',
      targetDirection: 'higher_is_better',
      targetValue: 0.9
    },
    {
      domain: 'stakeholders',
      key: 'freshness',
      label: 'Data Freshness',
      description: 'Percentage of stakeholder records updated within the last 30 days.',
      targetDirection: 'higher_is_better',
      targetValue: 0.95,
      units: 'ratio'
    }
  ],
  
  team: [
    {
      domain: 'team',
      key: 'skills_coverage',
      label: 'Skills Coverage',
      description: 'Percentage of required skills filled by current team members.',
      targetDirection: 'higher_is_better',
      targetValue: 1,
      units: 'ratio'
    },
    {
      domain: 'team',
      key: 'velocity_trend',
      label: 'Velocity Trend',
      description: 'Velocity trend slope across the last three iterations.',
      targetDirection: 'higher_is_better',
      units: 'story_points'
    }
  ],
  
  development_approach: [
    {
      domain: 'development_approach',
      key: 'iteration_predictability',
      label: 'Iteration Predictability',
      description: 'Planned vs actual completion variance across recent iterations.',
      targetDirection: 'lower_is_better',
      targetValue: 0.1,
      units: 'variance_ratio'
    }
  ],
  
  planning: [
    {
      domain: 'planning',
      key: 'dependency_coverage',
      label: 'Dependency Coverage',
      description: 'Percentage of critical milestones/activities with upstream & downstream links.',
      targetDirection: 'higher_is_better',
      targetValue: 1
    },
    {
      domain: 'planning',
      key: 'planning_confidence',
      label: 'Planning Confidence Index',
      description: 'Composite score across scope clarity, resource readiness, and risk mitigation.',
      targetDirection: 'higher_is_better',
      targetValue: 0.85
    }
  ],
  
  project_work: [
    {
      domain: 'project_work',
      key: 'blocker_sla',
      label: 'Blocker Resolution SLA',
      description: 'Average days to clear blockers captured in work items.',
      targetDirection: 'lower_is_better',
      targetValue: 3,
      units: 'days'
    },
    {
      domain: 'project_work',
      key: 'utilization_alignment',
      label: 'Utilization Alignment',
      description: 'Absolute variance between planned vs actual utilization across capacity plans.',
      targetDirection: 'lower_is_better',
      targetValue: 0.1,
      units: 'ratio'
    }
  ],
  
  delivery: [
    {
      domain: 'delivery',
      key: 'first_pass_acceptance',
      label: 'First-pass Acceptance',
      description: 'Percentage of deliverables accepted without rework.',
      targetDirection: 'higher_is_better',
      targetValue: 0.95
    },
    {
      domain: 'delivery',
      key: 'release_success_rate',
      label: 'Release Success Rate',
      description: 'Ratio of releases completed without rollback.',
      targetDirection: 'higher_is_better',
      targetValue: 0.98
    }
  ],
  
  measurement: [
    {
      domain: 'measurement',
      key: 'kpi_on_track_ratio',
      label: 'KPIs On Track',
      description: 'Percentage of success criteria with status on_track.',
      targetDirection: 'higher_is_better',
      targetValue: 0.7
    },
    {
      domain: 'measurement',
      key: 'spi',
      label: 'Schedule Performance Index',
      description: 'Earned value vs planned value trend.',
      targetDirection: 'range',
      minValue: 0.95,
      maxValue: 1.05
    }
  ],
  
  uncertainty: [
    {
      domain: 'uncertainty',
      key: 'risk_response_coverage',
      label: 'Risk Response Coverage',
      description: 'Percentage of medium+ risks with executed response plans.',
      targetDirection: 'higher_is_better',
      targetValue: 1
    },
    {
      domain: 'uncertainty',
      key: 'opportunity_conversion',
      label: 'Opportunity Conversion Rate',
      description: 'Ratio of realized opportunities vs identified.',
      targetDirection: 'higher_is_better',
      targetValue: 0.25
    }
  ],

  // =========================================================================
  // TIER 2: Knowledge Area Domains
  // =========================================================================
  
  governance: [
    {
      domain: 'governance',
      key: 'decision_cycle_time',
      label: 'Decision Cycle Time',
      description: 'Average days from decision request to approval.',
      targetDirection: 'lower_is_better',
      targetValue: 5,
      units: 'days'
    },
    {
      domain: 'governance',
      key: 'escalation_rate',
      label: 'Escalation Rate',
      description: 'Percentage of decisions escalated beyond initial authority level.',
      targetDirection: 'lower_is_better',
      targetValue: 0.15,
      units: 'ratio'
    },
    {
      domain: 'governance',
      key: 'governance_health_score',
      label: 'Governance Health Score',
      description: 'Composite score of compliance status and decision velocity.',
      targetDirection: 'higher_is_better',
      targetValue: 0.85
    },
    {
      domain: 'governance',
      key: 'audit_findings_open',
      label: 'Open Audit Findings',
      description: 'Count of critical audit findings open longer than 30 days.',
      targetDirection: 'lower_is_better',
      targetValue: 0,
      units: 'count'
    }
  ],
  
  scope: [
    {
      domain: 'scope',
      key: 'scope_creep_index',
      label: 'Scope Creep Index',
      description: 'Percentage of unapproved scope additions relative to baseline.',
      targetDirection: 'lower_is_better',
      targetValue: 0.1,
      units: 'ratio'
    },
    {
      domain: 'scope',
      key: 'requirements_coverage',
      label: 'Requirements Coverage',
      description: 'Percentage of requirements with deliverable linkage.',
      targetDirection: 'higher_is_better',
      targetValue: 0.95,
      units: 'ratio'
    },
    {
      domain: 'scope',
      key: 'wbs_completeness',
      label: 'WBS Completeness',
      description: 'Percentage of WBS leaf nodes with assigned resources and estimates.',
      targetDirection: 'higher_is_better',
      targetValue: 1,
      units: 'ratio'
    }
  ],
  
  schedule: [
    {
      domain: 'schedule',
      key: 'spi',
      label: 'Schedule Performance Index',
      description: 'Earned Value / Planned Value ratio.',
      targetDirection: 'range',
      minValue: 0.95,
      maxValue: 1.05
    },
    {
      domain: 'schedule',
      key: 'critical_path_float',
      label: 'Critical Path Float',
      description: 'Average float on critical path activities.',
      targetDirection: 'higher_is_better',
      targetValue: 0,
      units: 'days'
    },
    {
      domain: 'schedule',
      key: 'milestone_hit_rate',
      label: 'Milestone Hit Rate',
      description: 'Percentage of milestones completed on or before target date.',
      targetDirection: 'higher_is_better',
      targetValue: 0.9,
      units: 'ratio'
    },
    {
      domain: 'schedule',
      key: 'schedule_variance_trend',
      label: 'Schedule Variance Trend',
      description: 'Direction of schedule variance over reporting periods.',
      targetDirection: 'higher_is_better',
      units: 'trend'
    }
  ],
  
  finance: [
    {
      domain: 'finance',
      key: 'cpi',
      label: 'Cost Performance Index',
      description: 'Earned Value / Actual Cost ratio.',
      targetDirection: 'range',
      minValue: 0.95,
      maxValue: 1.05
    },
    {
      domain: 'finance',
      key: 'budget_utilization',
      label: 'Budget Utilization',
      description: 'Percentage of budget consumed relative to timeline progress.',
      targetDirection: 'range',
      minValue: 0.9,
      maxValue: 1.1,
      units: 'ratio'
    },
    {
      domain: 'finance',
      key: 'vac',
      label: 'Variance at Completion',
      description: 'Budget at Completion minus Estimate at Completion.',
      targetDirection: 'higher_is_better',
      targetValue: 0,
      units: 'currency'
    },
    {
      domain: 'finance',
      key: 'funding_runway',
      label: 'Funding Runway',
      description: 'Months of runway at current burn rate.',
      targetDirection: 'higher_is_better',
      targetValue: 3,
      units: 'months'
    }
  ],
  
  resources: [
    {
      domain: 'resources',
      key: 'utilization_rate',
      label: 'Utilization Rate',
      description: 'Actual hours worked / available hours ratio.',
      targetDirection: 'range',
      minValue: 0.75,
      maxValue: 0.9,
      units: 'ratio'
    },
    {
      domain: 'resources',
      key: 'resource_conflict_rate',
      label: 'Resource Conflict Rate',
      description: 'Percentage of resources with overallocation.',
      targetDirection: 'lower_is_better',
      targetValue: 0.05,
      units: 'ratio'
    },
    {
      domain: 'resources',
      key: 'skill_match_score',
      label: 'Skill Match Score',
      description: 'Percentage of assignments where skill level meets requirement.',
      targetDirection: 'higher_is_better',
      targetValue: 0.85,
      units: 'ratio'
    },
    {
      domain: 'resources',
      key: 'bench_rate',
      label: 'Bench Rate',
      description: 'Percentage of available resources currently unassigned.',
      targetDirection: 'lower_is_better',
      targetValue: 0.1,
      units: 'ratio'
    }
  ],
  
  risk: [
    {
      domain: 'risk',
      key: 'risk_exposure_index',
      label: 'Risk Exposure Index',
      description: 'Sum of probability × impact for all open risks.',
      targetDirection: 'lower_is_better',
      units: 'index'
    },
    {
      domain: 'risk',
      key: 'response_plan_coverage',
      label: 'Response Plan Coverage',
      description: 'Percentage of medium+ risks with active response plans.',
      targetDirection: 'higher_is_better',
      targetValue: 1,
      units: 'ratio'
    },
    {
      domain: 'risk',
      key: 'risk_velocity',
      label: 'Risk Velocity',
      description: 'Rate of new risks identified per reporting period.',
      targetDirection: 'lower_is_better',
      units: 'count_per_period'
    },
    {
      domain: 'risk',
      key: 'reserve_adequacy',
      label: 'Reserve Adequacy',
      description: 'Ratio of reserves to current risk exposure.',
      targetDirection: 'higher_is_better',
      targetValue: 1.2,
      units: 'ratio'
    }
  ],
  
  stakeholders_ops: [
    {
      domain: 'stakeholders_ops',
      key: 'communication_compliance',
      label: 'Communication Compliance',
      description: 'Actual communications / planned communications ratio.',
      targetDirection: 'higher_is_better',
      targetValue: 0.9,
      units: 'ratio'
    },
    {
      domain: 'stakeholders_ops',
      key: 'issue_resolution_time',
      label: 'Issue Resolution Time',
      description: 'Average days to resolve stakeholder issues.',
      targetDirection: 'lower_is_better',
      targetValue: 7,
      units: 'days'
    },
    {
      domain: 'stakeholders_ops',
      key: 'satisfaction_trend',
      label: 'Satisfaction Trend',
      description: 'NPS or satisfaction score trend over time.',
      targetDirection: 'higher_is_better',
      units: 'trend'
    },
    {
      domain: 'stakeholders_ops',
      key: 'engagement_action_completion',
      label: 'Engagement Action Completion',
      description: 'Percentage of planned engagement actions completed.',
      targetDirection: 'higher_is_better',
      targetValue: 0.9,
      units: 'ratio'
    }
  ]
}

// =============================================================================
// Domain Metadata
// =============================================================================

export interface DomainMetadata {
  domain: PmbokDomain
  tier: DomainTier
  title: string
  description: string
  focusAreas: ProjectFocusArea[]
  entityTypes: string[]
}

export const DOMAIN_METADATA: Record<PmbokDomain, DomainMetadata> = {
  // Tier 1: Performance Domains
  stakeholders: {
    domain: 'stakeholders',
    tier: 'performance',
    title: 'Stakeholders Performance Domain',
    description: 'Identifies stakeholders, engagement strategies, and sentiment trends.',
    focusAreas: ['initiating', 'planning', 'executing', 'closing'],
    entityTypes: ['stakeholders', 'engagement_strategies', 'communication_requirements']
  },
  team: {
    domain: 'team',
    tier: 'performance',
    title: 'Team Performance Domain',
    description: 'Captures team composition, skills, capacity, and collaboration health.',
    focusAreas: ['planning', 'executing', 'monitoring_controlling'],
    entityTypes: ['team_members', 'team_dynamics', 'skill_inventory', 'training_needs']
  },
  development_approach: {
    domain: 'development_approach',
    tier: 'performance',
    title: 'Development Approach & Life Cycle Domain',
    description: 'Describes methodology, tailoring decisions, iterations, and governance gates.',
    focusAreas: ['planning', 'executing'],
    entityTypes: ['development_approach', 'project_iterations', 'quality_gates', 'methodology_tailoring']
  },
  planning: {
    domain: 'planning',
    tier: 'performance',
    title: 'Planning Performance Domain',
    description: 'Aggregates milestones, WBS, dependencies, and constraint landscape.',
    focusAreas: ['initiating', 'planning', 'monitoring_controlling'],
    entityTypes: ['milestones', 'activities', 'requirements', 'constraints', 'dependencies', 'wbs_nodes']
  },
  project_work: {
    domain: 'project_work',
    tier: 'performance',
    title: 'Project Work Performance Domain',
    description: 'Tracks execution health: work items, capacity, blockers, and throughput.',
    focusAreas: ['executing', 'monitoring_controlling'],
    entityTypes: ['work_items', 'capacity_plans', 'impediments', 'work_logs']
  },
  delivery: {
    domain: 'delivery',
    tier: 'performance',
    title: 'Delivery Performance Domain',
    description: 'Focuses on deliverable readiness, acceptance, releases, and customer feedback.',
    focusAreas: ['executing', 'monitoring_controlling', 'closing'],
    entityTypes: ['deliverables', 'deliverable_acceptance', 'releases', 'customer_feedback']
  },
  measurement: {
    domain: 'measurement',
    tier: 'performance',
    title: 'Measurement Performance Domain',
    description: 'Captures KPI actuals, measurement cadence, and EVM snapshots.',
    focusAreas: ['planning', 'executing', 'monitoring_controlling', 'closing'],
    entityTypes: ['performance_measurements', 'earned_value_metrics', 'kpi_trends']
  },
  uncertainty: {
    domain: 'uncertainty',
    tier: 'performance',
    title: 'Uncertainty Performance Domain',
    description: 'Extends risk/issue register with opportunities and response effectiveness.',
    focusAreas: ['initiating', 'planning', 'executing', 'monitoring_controlling'],
    entityTypes: ['risks', 'risk_responses', 'opportunities', 'reserves']
  },
  
  // Tier 2: Knowledge Area Domains
  governance: {
    domain: 'governance',
    tier: 'knowledge',
    title: 'Governance Domain',
    description: 'Governance structures, decision-making frameworks, approvals, and oversight.',
    focusAreas: ['initiating', 'planning', 'executing', 'monitoring_controlling', 'closing'],
    entityTypes: ['governance_decisions', 'approval_workflows', 'steering_committees', 'change_control_boards', 'policy_compliance']
  },
  scope: {
    domain: 'scope',
    tier: 'knowledge',
    title: 'Scope Domain',
    description: 'Scope definition, WBS, scope changes, and scope control artifacts.',
    focusAreas: ['planning', 'executing', 'monitoring_controlling'],
    entityTypes: ['scope_baseline', 'wbs_nodes', 'scope_change_requests', 'requirements_traceability', 'scope_verification']
  },
  schedule: {
    domain: 'schedule',
    tier: 'knowledge',
    title: 'Schedule Domain',
    description: 'Schedule baselines, critical path, variances, and schedule control data.',
    focusAreas: ['planning', 'monitoring_controlling'],
    entityTypes: ['schedule_baseline', 'schedule_activities', 'critical_path', 'schedule_variances', 'schedule_forecasts']
  },
  finance: {
    domain: 'finance',
    tier: 'knowledge',
    title: 'Finance Domain',
    description: 'Budget baselines, cost tracking, EVM financials, and funding records.',
    focusAreas: ['planning', 'monitoring_controlling', 'closing'],
    entityTypes: ['budget_baseline', 'cost_actuals', 'cost_estimates', 'funding_tranches', 'financial_variances', 'procurement_costs']
  },
  resources: {
    domain: 'resources',
    tier: 'knowledge',
    title: 'Resources Domain',
    description: 'Resource allocation, capacity planning, and resource utilization data.',
    focusAreas: ['planning', 'executing', 'monitoring_controlling', 'closing'],
    entityTypes: ['resource_assignments', 'resource_pool', 'capacity_forecasts', 'utilization_records', 'resource_conflicts', 'onboarding_offboarding']
  },
  risk: {
    domain: 'risk',
    tier: 'knowledge',
    title: 'Risk Domain',
    description: 'Comprehensive risk management data with operational focus.',
    focusAreas: ['initiating', 'planning', 'executing', 'monitoring_controlling', 'closing'],
    entityTypes: ['risk_register', 'risk_assessments', 'risk_response_plans', 'risk_triggers', 'risk_reviews', 'contingency_reserves', 'risk_metrics']
  },
  stakeholders_ops: {
    domain: 'stakeholders_ops',
    tier: 'knowledge',
    title: 'Stakeholders Operations Domain',
    description: 'Operational engagement tracking extending Tier 1 Stakeholders domain.',
    focusAreas: ['initiating', 'executing', 'monitoring_controlling', 'closing'],
    entityTypes: ['engagement_actions', 'communication_logs', 'satisfaction_surveys', 'stakeholder_issues', 'relationship_health']
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get all domains for a specific tier
 */
export const getDomainsByTier = (tier: DomainTier): PmbokDomain[] => {
  return tier === 'performance' 
    ? [...PMBOK_PERFORMANCE_DOMAINS]
    : [...PMBOK_KNOWLEDGE_DOMAINS]
}

/**
 * Get all domains active in a specific focus area
 */
export const getDomainsByFocusArea = (focusArea: ProjectFocusArea): PmbokDomain[] => {
  return PMBOK_DOMAINS.filter(domain => 
    DOMAIN_METADATA[domain].focusAreas.includes(focusArea)
  )
}

/**
 * Get KPI definitions for a specific domain
 */
export const getKpisForDomain = (domain: PmbokDomain): DomainKpiDefinition[] => {
  return DOMAIN_KPI_KEYS[domain] || []
}

/**
 * Get entity types for a specific domain
 */
export const getEntityTypesForDomain = (domain: PmbokDomain): string[] => {
  return DOMAIN_METADATA[domain]?.entityTypes || []
}

/**
 * Get metadata for a specific domain
 */
export const getDomainMetadata = (domain: PmbokDomain): DomainMetadata | undefined => {
  return DOMAIN_METADATA[domain]
}

// Legacy compatibility export (for existing code using old PMBOK_DOMAINS)
// Note: This now includes all 15 domains, not just 8
export { PMBOK_DOMAINS as PMBOK_DOMAINS_ALL }
