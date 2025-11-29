import { 
  DOMAIN_KPI_KEYS, 
  PMBOK_DOMAINS, 
  type DomainKpiDefinition, 
  type PmbokDomain,
  type DomainTier,
  getDomainTier
} from '@/types/pmbok'

export interface DomainExtractionConfig {
  domain: PmbokDomain
  tier: DomainTier
  title: string
  description: string
  entityTypes: string[]
  requiredDocuments: string[]
  recommendedProviders: string[]
  prompt: string
  schemaHint: string
  kpis: DomainKpiDefinition[]
  cacheTtlSeconds: number
}

const trim = (value: string): string => value.trim().replace(/\s+$/g, '')

const buildPrompt = (heading: string, focus: string[], output: string[]): string => {
  return trim(`
You are a PMBOK® 8th Edition ${heading} expert.

Focus on:
${focus.map((item) => `- ${item}`).join('\n')}

Output JSON with:
${output.map((item) => `- ${item}`).join('\n')}

All descriptive text must be Markdown. Include document references when available.
  `)
}

export const DOMAIN_EXTRACTION_CONFIGS: Record<PmbokDomain, DomainExtractionConfig> = {
  // =========================================================================
  // TIER 1: Performance Domains (PMBOK 8)
  // =========================================================================
  
  stakeholders: {
    domain: 'stakeholders',
    tier: 'performance',
    title: 'Stakeholders Performance Domain',
    description: 'Identifies stakeholders, engagement strategies, and sentiment trends.',
    entityTypes: ['stakeholders', 'engagement_strategies', 'communication_requirements'],
    requiredDocuments: ['Stakeholder Register', 'Communication Plan', 'RACI Matrix', 'Meeting Minutes'],
    recommendedProviders: ['openai:gpt-4o', 'google:gemini-1.5-pro'],
    prompt: buildPrompt(
      'Stakeholders Performance Domain',
      [
        'Stakeholder identification, influence/interest, and engagement level',
        'Communication preferences and key expectations or concerns',
        'Engagement tactics and sentiment changes across the timeline'
      ],
      [
        'stakeholders: Stakeholder[]',
        'engagement_summary: { power_interest_grid, at_risk_stakeholders[] }',
        'recommendations: string[] referenced to source docs'
      ]
    ),
    schemaHint: `{
  "stakeholders": [{
    "name": "string",
    "role": "string",
    "organization": "string",
    "interest_level": "high|medium|low",
    "influence_level": "high|medium|low",
    "engagement_level": "unaware|resistant|neutral|supportive|leading",
    "communication_preferences": ["channel :: frequency"],
    "expectations": "markdown",
    "concerns": "markdown",
    "recommended_strategy": "manage_closely|keep_satisfied|keep_informed|monitor"
  }],
  "engagement_summary": {...},
  "recommendations": ["markdown"]
}`,
    kpis: DOMAIN_KPI_KEYS.stakeholders,
    cacheTtlSeconds: 60 * 60 * 6
  },
  team: {
    domain: 'team',
    tier: 'performance',
    title: 'Team Performance Domain',
    description: 'Captures team composition, skills, capacity, and collaboration health.',
    entityTypes: ['team_members', 'team_dynamics', 'skill_inventory', 'training_needs'],
    requiredDocuments: ['Resource Management Plan', 'Team Charter', 'Skills Matrix', 'Performance Reviews'],
    recommendedProviders: ['mistral:large', 'openai:gpt-4o'],
    prompt: buildPrompt(
      'Team Performance Domain',
      [
        'Team composition, skills, competency levels, and allocations',
        'Velocity or throughput trends plus collaboration / cohesion observations',
        'Training needs, coaching actions, and open conflicts or impediments'
      ],
      [
        'team_members: TeamMember[]',
        'team_dynamics: { velocity_trend, collaboration_score, cohesion_rating, conflict_incidents }',
        'skill_gaps: [{ skill, severity, mitigation_plan }]',
        'recommendations: string[]'
      ]
    ),
    schemaHint: `TeamMember { name, role, allocation_pct, skills[], competency_level, certifications[], performance_rating, training_needs[] }`,
    kpis: DOMAIN_KPI_KEYS.team,
    cacheTtlSeconds: 60 * 60 * 3
  },
  development_approach: {
    domain: 'development_approach',
    tier: 'performance',
    title: 'Development Approach & Life Cycle Domain',
    description: 'Describes methodology, tailoring decisions, iterations, and governance gates.',
    entityTypes: ['development_approach', 'project_iterations', 'quality_gates', 'methodology_tailoring'],
    requiredDocuments: ['Project Management Plan', 'Agile Playbook', 'Lifecycle Definition', 'Phase Gate Checklist'],
    recommendedProviders: ['google:gemini-1.5-pro', 'openai:gpt-4.1-mini'],
    prompt: buildPrompt(
      'Development Approach & Life Cycle Domain',
      [
        'Chosen delivery approach, methodology, cadence, and justification',
        'Iteration cadences (sprints/phases), goals, and accomplishments',
        'Quality or stage gates with pass/fail results and tailoring choices'
      ],
      [
        'development_approach: { approach, methodology, tailoring_decisions[], governance_notes }',
        'iterations: Iteration[] with planned vs actual velocity',
        'quality_gates: QualityGate[] capturing criteria and status'
      ]
    ),
    schemaHint: `Iteration { name, iteration_type, start_date, end_date, goals[], planned_story_points, completed_story_points, status }`,
    kpis: DOMAIN_KPI_KEYS.development_approach,
    cacheTtlSeconds: 60 * 60 * 12
  },
  planning: {
    domain: 'planning',
    tier: 'performance',
    title: 'Planning Performance Domain',
    description: 'Aggregates milestones, WBS, dependencies, and constraint landscape.',
    entityTypes: ['milestones', 'activities', 'requirements', 'constraints', 'dependencies', 'wbs_nodes'],
    requiredDocuments: ['Integrated Project Plan', 'Schedule Baseline', 'Requirements Register', 'WBS Dictionary'],
    recommendedProviders: ['openai:gpt-4o', 'anthropic:claude-3-5-sonnet'],
    prompt: buildPrompt(
      'Planning Performance Domain',
      [
        'Milestones, success criteria, dependencies, and critical path indicators',
        'Constraints (scope/time/cost/quality/resource/regulatory) with severity',
        'WBS hierarchy and linkage between scope, schedule, and resources'
      ],
      [
        'milestones: Milestone[]',
        'dependencies: ActivityDependency[]',
        'constraints: Constraint[]',
        'wbs_nodes: WbsNode[] describing hierarchy'
      ]
    ),
    schemaHint: `ActivityDependency { activity_name, depends_on, type, lag_days }`,
    kpis: DOMAIN_KPI_KEYS.planning,
    cacheTtlSeconds: 60 * 60 * 2
  },
  project_work: {
    domain: 'project_work',
    tier: 'performance',
    title: 'Project Work Performance Domain',
    description: 'Tracks execution health: work items, capacity, blockers, and throughput.',
    entityTypes: ['work_items', 'capacity_plans', 'impediments', 'work_logs'],
    requiredDocuments: ['Work Plan', 'Daily Standup Notes', 'Capacity Plans', 'Kanban / Sprint Boards'],
    recommendedProviders: ['mistral:large', 'groq:llama-3.1-70b'],
    prompt: buildPrompt(
      'Project Work Performance Domain',
      [
        'Work item status vs plan, actual effort, and blocker narratives',
        'Capacity plans for team members including utilization variances',
        'Emerging impediments plus mitigation or escalation actions'
      ],
      [
        'work_items: WorkItem[]',
        'capacity_plans: CapacityPlan[]',
        'impediments: [{ description, owner, impact, unblock_actions }]',
        'recommendations: string[] referencing blockers or utilization hotspots'
      ]
    ),
    schemaHint: `WorkItem { name, assigned_to, estimated_hours, actual_hours, status, blockers[], progress_percentage }`,
    kpis: DOMAIN_KPI_KEYS.project_work,
    cacheTtlSeconds: 60 * 15
  },
  delivery: {
    domain: 'delivery',
    tier: 'performance',
    title: 'Delivery Performance Domain',
    description: 'Focuses on deliverable readiness, acceptance, releases, and customer feedback.',
    entityTypes: ['deliverables', 'deliverable_acceptance', 'releases', 'customer_feedback'],
    requiredDocuments: ['Deliverable Register', 'Acceptance Forms', 'Release Notes', 'Customer Sign-off'],
    recommendedProviders: ['openai:gpt-4o', 'anthropic:claude-3-5-sonnet'],
    prompt: buildPrompt(
      'Delivery Performance Domain',
      [
        'Deliverable completion status, ownership, and acceptance outcomes',
        'Release plans, go-live checklists, rollback strategies',
        'Customer satisfaction inputs or deviations noted during acceptance'
      ],
      [
        'deliverables: DeliverableSummary[]',
        'acceptance: DeliverableAcceptance[] with reviewer feedback',
        'releases: ReleaseRecord[] capturing readiness gates'
      ]
    ),
    schemaHint: `DeliverableAcceptance { deliverable_name, reviewer, status, review_date, feedback, acceptance_criteria_met, total_criteria }`,
    kpis: DOMAIN_KPI_KEYS.delivery,
    cacheTtlSeconds: 60 * 60
  },
  measurement: {
    domain: 'measurement',
    tier: 'performance',
    title: 'Measurement Performance Domain',
    description: 'Captures KPI actuals, measurement cadence, and EVM snapshots.',
    entityTypes: ['performance_measurements', 'earned_value_metrics', 'kpi_trends'],
    requiredDocuments: ['Performance Reports', 'EVM Packs', 'OKR Tracker', 'Quality Metrics'],
    recommendedProviders: ['openai:gpt-4o-mini', 'google:gemini-1.5-pro'],
    prompt: buildPrompt(
      'Measurement Performance Domain',
      [
        'Success criteria actuals vs targets including variance classification',
        'Earned value metrics (PV, EV, AC, CPI, SPI, EAC, ETC)',
        'Measurement cadence and data freshness (last updated timestamps)'
      ],
      [
        'measurements: Measurement[] sorted by measurement_date desc',
        'evm_snapshots: EarnedValueSnapshot[]',
        'kpi_summary: { on_track, at_risk, off_track }'
      ]
    ),
    schemaHint: `Measurement { success_criterion_name, measurement_date, actual_value, target_value, variance, variance_percentage, trend, status }`,
    kpis: DOMAIN_KPI_KEYS.measurement,
    cacheTtlSeconds: 60 * 10
  },
  uncertainty: {
    domain: 'uncertainty',
    tier: 'performance',
    title: 'Uncertainty Performance Domain',
    description: 'Extends risk/issue register with opportunities and response effectiveness.',
    entityTypes: ['risks', 'risk_responses', 'opportunities', 'reserves'],
    requiredDocuments: ['Risk Register', 'Issue Log', 'Opportunity Register', 'Reserve Analysis'],
    recommendedProviders: ['anthropic:claude-3-opus', 'openai:gpt-4o'],
    prompt: buildPrompt(
      'Uncertainty Performance Domain',
      [
        'Risk probability, impact, response strategy, and residual exposure',
        'Opportunities (positive risks) with exploitation strategy and benefit level',
        'Contingency/reserve consumption with rationale'
      ],
      [
        'risks: RiskRecord[]',
        'risk_responses: RiskResponse[]',
        'opportunities: OpportunityRecord[]',
        'reserve_updates: [{ reserve_type, amount_committed, remaining, notes }]'
      ]
    ),
    schemaHint: `RiskResponse { risk_title, response_date, action_taken, effectiveness, residual_risk_level, cost_of_response }`,
    kpis: DOMAIN_KPI_KEYS.uncertainty,
    cacheTtlSeconds: 60 * 30
  },

  // =========================================================================
  // TIER 2: Knowledge Area Domains (Supplementary)
  // =========================================================================
  
  governance: {
    domain: 'governance',
    tier: 'knowledge',
    title: 'Governance Domain',
    description: 'Governance structures, decision-making frameworks, approvals, and oversight mechanisms.',
    entityTypes: ['governance_decisions', 'approval_workflows', 'steering_committees', 'change_control_boards', 'policy_compliance'],
    requiredDocuments: ['Project Charter', 'Governance Framework', 'Decision Log', 'Change Requests', 'Audit Reports', 'Policy Documents'],
    recommendedProviders: ['anthropic:claude-3-5-sonnet', 'openai:gpt-4o'],
    prompt: buildPrompt(
      'Governance Domain',
      [
        'Governance structure, decision rights, and authority levels',
        'Steering committee composition, mandate, and meeting outcomes',
        'Change control board decisions and approval workflows',
        'Policy compliance status and audit findings'
      ],
      [
        'governance_decisions: GovernanceDecision[] with outcome and rationale',
        'approval_workflows: ApprovalWorkflow[] with gates and approvers',
        'steering_committees: SteeringCommittee[] with members and mandate',
        'change_control_boards: CCB[] with authority levels',
        'policy_compliance: PolicyCompliance[] with status and findings'
      ]
    ),
    schemaHint: `GovernanceDecision { decision_id, decision_type, description, outcome, rationale, decision_makers[], date, implementation_status }`,
    kpis: DOMAIN_KPI_KEYS.governance,
    cacheTtlSeconds: 60 * 60 * 4
  },
  
  scope: {
    domain: 'scope',
    tier: 'knowledge',
    title: 'Scope Domain',
    description: 'Scope definition, WBS, scope changes, and scope control artifacts.',
    entityTypes: ['scope_baseline', 'wbs_nodes', 'scope_change_requests', 'requirements_traceability', 'scope_verification'],
    requiredDocuments: ['Scope Statement', 'WBS', 'WBS Dictionary', 'Requirements Document', 'Change Requests', 'Acceptance Criteria'],
    recommendedProviders: ['openai:gpt-4o', 'anthropic:claude-3-5-sonnet'],
    prompt: buildPrompt(
      'Scope Domain',
      [
        'Scope statement, boundaries, inclusions, and exclusions',
        'WBS hierarchy with work packages and ownership',
        'Scope change requests with impact analysis and status',
        'Requirements traceability to deliverables',
        'Scope verification and acceptance status'
      ],
      [
        'scope_baseline: ScopeBaseline with statement and boundaries',
        'wbs_nodes: WbsNode[] with hierarchy and ownership',
        'scope_change_requests: ScopeChangeRequest[] with impact',
        'requirements_traceability: TraceabilityEntry[]',
        'scope_verification: ScopeVerification[] with acceptance status'
      ]
    ),
    schemaHint: `WbsNode { wbs_code, name, level, parent_code, owner, description, status, estimated_effort, estimated_cost }`,
    kpis: DOMAIN_KPI_KEYS.scope,
    cacheTtlSeconds: 60 * 60 * 2
  },
  
  schedule: {
    domain: 'schedule',
    tier: 'knowledge',
    title: 'Schedule Domain',
    description: 'Schedule baselines, critical path, variances, and schedule control data.',
    entityTypes: ['schedule_baseline', 'schedule_activities', 'critical_path', 'schedule_variances', 'schedule_forecasts'],
    requiredDocuments: ['Project Schedule', 'Schedule Baseline', 'Status Reports', 'Gantt Charts', 'Network Diagrams', 'Schedule Updates'],
    recommendedProviders: ['openai:gpt-4o', 'google:gemini-2.0-flash-exp'],
    prompt: buildPrompt(
      'Schedule Domain',
      [
        'Schedule baseline with key milestones and dates',
        'Activity details with duration, effort, dependencies',
        'Critical path activities with float analysis',
        'Schedule variances with root cause and corrective actions',
        'Schedule forecasts (ETC, EAC for schedule)'
      ],
      [
        'schedule_baseline: ScheduleBaseline with milestones',
        'schedule_activities: ScheduleActivity[] with dependencies',
        'critical_path: CriticalPath with activities and float',
        'schedule_variances: ScheduleVariance[] with cause and action',
        'schedule_forecasts: ScheduleForecast with EAC and ETC'
      ]
    ),
    schemaHint: `ScheduleActivity { activity_id, name, wbs_code, baseline_start, baseline_finish, actual_start, actual_finish, duration_days, float_days, predecessors[], successors[], is_critical, status }`,
    kpis: DOMAIN_KPI_KEYS.schedule,
    cacheTtlSeconds: 60 * 30
  },
  
  finance: {
    domain: 'finance',
    tier: 'knowledge',
    title: 'Finance Domain',
    description: 'Budget baselines, cost tracking, EVM financials, and funding records.',
    entityTypes: ['budget_baseline', 'cost_actuals', 'cost_estimates', 'funding_tranches', 'financial_variances', 'procurement_costs'],
    requiredDocuments: ['Budget Baseline', 'Cost Reports', 'EVM Reports', 'Funding Agreements', 'Invoices', 'Procurement Contracts'],
    recommendedProviders: ['openai:gpt-4o-mini', 'mistral:mistral-small-latest'],
    prompt: buildPrompt(
      'Finance Domain',
      [
        'Budget baseline by phase, category, and WBS element',
        'Actual costs recorded against baseline',
        'Earned value metrics (PV, EV, AC, CPI, EAC, ETC, VAC)',
        'Funding sources, tranches, and release conditions',
        'Cost variances with root cause analysis'
      ],
      [
        'budget_baseline: BudgetBaseline with breakdown',
        'cost_actuals: CostActual[] by period and category',
        'cost_estimates: CostEstimate with EAC, ETC, VAC',
        'funding_tranches: FundingTranche[] with conditions',
        'financial_variances: FinancialVariance[] with root cause'
      ]
    ),
    schemaHint: `CostActual { period, category, wbs_code, planned_amount, actual_amount, variance, variance_pct, cumulative_actual }`,
    kpis: DOMAIN_KPI_KEYS.finance,
    cacheTtlSeconds: 60 * 30
  },
  
  resources: {
    domain: 'resources',
    tier: 'knowledge',
    title: 'Resources Domain',
    description: 'Resource allocation, capacity planning, and resource utilization data.',
    entityTypes: ['resource_assignments', 'resource_pool', 'capacity_forecasts', 'utilization_records', 'resource_conflicts', 'onboarding_offboarding'],
    requiredDocuments: ['Resource Plan', 'Team Roster', 'Capacity Reports', 'Utilization Reports', 'Skills Matrix', 'Onboarding Plans'],
    recommendedProviders: ['mistral:mistral-large-latest', 'openai:gpt-4o-mini'],
    prompt: buildPrompt(
      'Resources Domain',
      [
        'Resource assignments to activities with allocation percentage',
        'Resource pool with skills, availability, and cost rates',
        'Capacity forecasts by role and skill',
        'Utilization records (planned vs actual)',
        'Resource conflicts and overallocation issues',
        'Onboarding and offboarding plans'
      ],
      [
        'resource_assignments: ResourceAssignment[] with allocation',
        'resource_pool: Resource[] with skills and availability',
        'capacity_forecasts: CapacityForecast[] by role',
        'utilization_records: UtilizationRecord[] with variance',
        'resource_conflicts: ResourceConflict[] with resolution',
        'onboarding_offboarding: OnboardingPlan[] with dates'
      ]
    ),
    schemaHint: `ResourceAssignment { resource_id, resource_name, activity_id, activity_name, allocation_pct, start_date, end_date, skill_required, skill_level }`,
    kpis: DOMAIN_KPI_KEYS.resources,
    cacheTtlSeconds: 60 * 60
  },
  
  risk: {
    domain: 'risk',
    tier: 'knowledge',
    title: 'Risk Domain',
    description: 'Comprehensive risk management data with operational focus.',
    entityTypes: ['risk_register', 'risk_assessments', 'risk_response_plans', 'risk_triggers', 'risk_reviews', 'contingency_reserves', 'risk_metrics'],
    requiredDocuments: ['Risk Register', 'Risk Assessment Reports', 'Response Plans', 'Risk Reviews', 'Reserve Analysis', 'Lessons Learned'],
    recommendedProviders: ['anthropic:claude-3-opus', 'openai:gpt-4o'],
    prompt: buildPrompt(
      'Risk Domain',
      [
        'Complete risk register with ID, category, owner, status',
        'Risk assessments with probability, impact, detectability (RPN)',
        'Response plans with strategy, actions, responsible party, deadlines',
        'Risk triggers and early warning indicators',
        'Risk review records with status changes',
        'Contingency reserve allocation and consumption'
      ],
      [
        'risk_register: RiskRegisterEntry[] with full details',
        'risk_assessments: RiskAssessment[] with P×I and RPN',
        'risk_response_plans: RiskResponsePlan[] with actions',
        'risk_triggers: RiskTrigger[] with thresholds',
        'risk_reviews: RiskReview[] with status changes',
        'contingency_reserves: ContingencyReserve[] by category',
        'risk_metrics: RiskMetrics with trends'
      ]
    ),
    schemaHint: `RiskRegisterEntry { risk_id, title, description, category, owner, probability, impact, risk_score, status, response_strategy, trigger_conditions, residual_risk }`,
    kpis: DOMAIN_KPI_KEYS.risk,
    cacheTtlSeconds: 60 * 30
  },
  
  stakeholders_ops: {
    domain: 'stakeholders_ops',
    tier: 'knowledge',
    title: 'Stakeholders Operations Domain',
    description: 'Operational engagement tracking extending Tier 1 Stakeholders domain.',
    entityTypes: ['engagement_actions', 'communication_logs', 'satisfaction_surveys', 'stakeholder_issues', 'relationship_health'],
    requiredDocuments: ['Communication Log', 'Meeting Minutes', 'Satisfaction Surveys', 'Issue Log', 'Stakeholder Feedback', 'Engagement Reports'],
    recommendedProviders: ['openai:gpt-4o', 'google:gemini-2.0-flash-exp'],
    prompt: buildPrompt(
      'Stakeholders Operations Domain',
      [
        'Specific engagement actions taken with outcomes',
        'Communication logs with channel, sentiment, and key messages',
        'Satisfaction surveys with scores and feedback themes',
        'Stakeholder issues and concerns with resolution status',
        'Relationship health indicators over time'
      ],
      [
        'engagement_actions: EngagementAction[] with outcomes',
        'communication_logs: CommunicationLog[] with sentiment',
        'satisfaction_surveys: SatisfactionSurvey[] with NPS',
        'stakeholder_issues: StakeholderIssue[] with resolution',
        'relationship_health: RelationshipHealth[] with indicators'
      ]
    ),
    schemaHint: `EngagementAction { action_id, stakeholder_id, action_type, description, planned_date, actual_date, outcome, follow_up_required }`,
    kpis: DOMAIN_KPI_KEYS.stakeholders_ops,
    cacheTtlSeconds: 60 * 60 * 2
  }
}

export const listDomainExtractionConfigs = (): DomainExtractionConfig[] =>
  PMBOK_DOMAINS.map((domain) => DOMAIN_EXTRACTION_CONFIGS[domain])

export const getDomainExtractionConfig = (domain: PmbokDomain): DomainExtractionConfig => {
  const config = DOMAIN_EXTRACTION_CONFIGS[domain]
  if (!config) {
    throw new Error(`Domain extraction config not found for ${domain}`)
  }
  return config
}

