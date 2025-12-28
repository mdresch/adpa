"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTITY_PHASE_WEIGHTS = exports.ENTITY_DOMAIN_WEIGHTS = void 0;
exports.getEntityWeights = getEntityWeights;
exports.validateEntityWeights = validateEntityWeights;
exports.calculateWeightedCount = calculateWeightedCount;
exports.formatWeightedCount = formatWeightedCount;
exports.getEntityPhaseWeights = getEntityPhaseWeights;
exports.validateEntityPhaseWeights = validateEntityPhaseWeights;
exports.ENTITY_DOMAIN_WEIGHTS = {
    stakeholders: [
        { domain: 'stakeholders', weight: 0.60, isPrimary: true },
        { domain: 'stakeholders_ops', weight: 0.40, isPrimary: false }
    ],
    requirements: [
        { domain: 'scope', weight: 0.70, isPrimary: true },
        { domain: 'planning', weight: 0.30, isPrimary: false }
    ],
    risks: [
        { domain: 'uncertainty', weight: 0.50, isPrimary: true },
        { domain: 'risk', weight: 0.50, isPrimary: true }
    ],
    milestones: [
        { domain: 'schedule', weight: 0.60, isPrimary: true },
        { domain: 'governance', weight: 0.25, isPrimary: false },
        { domain: 'planning', weight: 0.15, isPrimary: false }
    ],
    constraints: [
        { domain: 'uncertainty', weight: 0.60, isPrimary: true },
        { domain: 'risk', weight: 0.40, isPrimary: false }
    ],
    success_criteria: [
        { domain: 'stakeholders', weight: 0.50, isPrimary: true },
        { domain: 'measurement', weight: 0.50, isPrimary: true }
    ],
    best_practices: [
        { domain: 'delivery', weight: 1.0, isPrimary: true }
    ],
    phases: [
        { domain: 'schedule', weight: 0.60, isPrimary: true },
        { domain: 'governance', weight: 0.40, isPrimary: false }
    ],
    resources: [
        { domain: 'resources', weight: 0.60, isPrimary: true },
        { domain: 'team', weight: 0.40, isPrimary: false }
    ],
    technologies: [
        { domain: 'development_approach', weight: 1.0, isPrimary: true }
    ],
    quality_standards: [
        { domain: 'delivery', weight: 1.0, isPrimary: true }
    ],
    compliance_security: [
        { domain: 'governance', weight: 1.0, isPrimary: true }
    ],
    deliverables: [
        { domain: 'scope', weight: 0.50, isPrimary: true },
        { domain: 'delivery', weight: 0.40, isPrimary: false },
        { domain: 'planning', weight: 0.10, isPrimary: false }
    ],
    scope_items: [
        { domain: 'scope', weight: 0.70, isPrimary: true },
        { domain: 'planning', weight: 0.30, isPrimary: false }
    ],
    activities: [
        { domain: 'schedule', weight: 0.60, isPrimary: true },
        { domain: 'development_approach', weight: 0.25, isPrimary: false },
        { domain: 'planning', weight: 0.15, isPrimary: false }
    ],
    team_agreements: [
        { domain: 'team', weight: 0.50, isPrimary: true },
        { domain: 'governance', weight: 0.30, isPrimary: false },
        { domain: 'resources', weight: 0.20, isPrimary: false }
    ],
    development_approaches: [
        { domain: 'governance', weight: 1.0, isPrimary: true }
    ],
    project_iterations: [
        { domain: 'development_approach', weight: 0.70, isPrimary: true },
        { domain: 'schedule', weight: 0.30, isPrimary: false }
    ],
    work_items: [
        { domain: 'project_work', weight: 1.0, isPrimary: true }
    ],
    capacity_plans: [
        { domain: 'resources', weight: 0.60, isPrimary: true },
        { domain: 'project_work', weight: 0.40, isPrimary: false }
    ],
    performance_measurements: [
        { domain: 'measurement', weight: 1.0, isPrimary: true }
    ],
    earned_value_metrics: [
        { domain: 'measurement', weight: 0.60, isPrimary: true },
        { domain: 'finance', weight: 0.40, isPrimary: false }
    ],
    opportunities: [
        { domain: 'uncertainty', weight: 0.50, isPrimary: true },
        { domain: 'risk', weight: 0.50, isPrimary: true }
    ],
    risk_responses: [
        { domain: 'uncertainty', weight: 0.50, isPrimary: true },
        { domain: 'risk', weight: 0.50, isPrimary: true }
    ],
    performance_actuals: [
        { domain: 'project_work', weight: 1.0, isPrimary: true }
    ],
    governance_decisions: [
        { domain: 'governance', weight: 1.0, isPrimary: true }
    ],
    approval_workflows: [
        { domain: 'governance', weight: 1.0, isPrimary: true }
    ],
    steering_committees: [
        { domain: 'governance', weight: 1.0, isPrimary: true }
    ],
    change_control_boards: [
        { domain: 'governance', weight: 1.0, isPrimary: true }
    ],
    policy_compliance: [
        { domain: 'governance', weight: 1.0, isPrimary: true }
    ],
    scope_baselines: [
        { domain: 'scope', weight: 1.0, isPrimary: true }
    ],
    wbs_nodes: [
        { domain: 'scope', weight: 1.0, isPrimary: true }
    ],
    scope_change_requests: [
        { domain: 'scope', weight: 1.0, isPrimary: true }
    ],
    requirements_traceability: [
        { domain: 'scope', weight: 1.0, isPrimary: true }
    ],
    scope_verification: [
        { domain: 'scope', weight: 1.0, isPrimary: true }
    ],
    schedule_baselines: [
        { domain: 'schedule', weight: 1.0, isPrimary: true }
    ],
    schedule_activities: [
        { domain: 'schedule', weight: 1.0, isPrimary: true }
    ],
    critical_path_activities: [
        { domain: 'schedule', weight: 1.0, isPrimary: true }
    ],
    schedule_variances: [
        { domain: 'schedule', weight: 1.0, isPrimary: true }
    ],
    schedule_forecasts: [
        { domain: 'schedule', weight: 1.0, isPrimary: true }
    ],
    budget_baselines: [
        { domain: 'finance', weight: 1.0, isPrimary: true }
    ],
    cost_actuals: [
        { domain: 'finance', weight: 1.0, isPrimary: true }
    ],
    cost_estimates: [
        { domain: 'finance', weight: 1.0, isPrimary: true }
    ],
    funding_tranches: [
        { domain: 'finance', weight: 1.0, isPrimary: true }
    ],
    financial_variances: [
        { domain: 'finance', weight: 1.0, isPrimary: true }
    ],
    procurement_costs: [
        { domain: 'finance', weight: 1.0, isPrimary: true }
    ],
    resource_assignments: [
        { domain: 'resources', weight: 1.0, isPrimary: true }
    ],
    resource_pool: [
        { domain: 'resources', weight: 1.0, isPrimary: true }
    ],
    capacity_forecasts: [
        { domain: 'resources', weight: 1.0, isPrimary: true }
    ],
    utilization_records: [
        { domain: 'resources', weight: 1.0, isPrimary: true }
    ],
    resource_conflicts: [
        { domain: 'resources', weight: 1.0, isPrimary: true }
    ],
    onboarding_offboarding: [
        { domain: 'resources', weight: 1.0, isPrimary: true }
    ],
    risk_assessments: [
        { domain: 'risk', weight: 1.0, isPrimary: true }
    ],
    risk_response_plans: [
        { domain: 'risk', weight: 1.0, isPrimary: true }
    ],
    risk_triggers: [
        { domain: 'risk', weight: 1.0, isPrimary: true }
    ],
    risk_reviews: [
        { domain: 'risk', weight: 1.0, isPrimary: true }
    ],
    contingency_reserves: [
        { domain: 'risk', weight: 1.0, isPrimary: true }
    ],
    risk_metrics: [
        { domain: 'risk', weight: 1.0, isPrimary: true }
    ],
    engagement_actions: [
        { domain: 'stakeholders_ops', weight: 1.0, isPrimary: true }
    ],
    communication_logs: [
        { domain: 'stakeholders_ops', weight: 1.0, isPrimary: true }
    ],
    satisfaction_surveys: [
        { domain: 'stakeholders_ops', weight: 1.0, isPrimary: true }
    ],
    stakeholder_issues: [
        { domain: 'stakeholders_ops', weight: 1.0, isPrimary: true }
    ],
    relationship_health: [
        { domain: 'stakeholders_ops', weight: 1.0, isPrimary: true }
    ]
};
function getEntityWeights(entityType) {
    const snakeCase = entityType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    return exports.ENTITY_DOMAIN_WEIGHTS[snakeCase] || [];
}
function validateEntityWeights(entityType) {
    const weights = getEntityWeights(entityType);
    const sum = weights.reduce((total, w) => total + w.weight, 0);
    const isValid = Math.abs(sum - 1.0) < 0.0001;
    return { isValid, sum };
}
function calculateWeightedCount(entityCount, weight) {
    return entityCount * weight;
}
function formatWeightedCount(count, weight, isPrimary) {
    const weightedCount = calculateWeightedCount(count, weight);
    const percentage = Math.round(weight * 100);
    const badge = isPrimary ? 'Primary' : 'Secondary';
    return `${weightedCount.toFixed(1)} entities (${badge} ${percentage}%)`;
}
exports.ENTITY_PHASE_WEIGHTS = {
    stakeholders: [
        { phase: 'initiating', weight: 0.35, isPrimary: true },
        { phase: 'planning', weight: 0.25, isPrimary: false },
        { phase: 'executing', weight: 0.20, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    requirements: [
        { phase: 'initiating', weight: 0.15, isPrimary: false },
        { phase: 'planning', weight: 0.60, isPrimary: true },
        { phase: 'executing', weight: 0.15, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    risks: [
        { phase: 'initiating', weight: 0.20, isPrimary: false },
        { phase: 'planning', weight: 0.30, isPrimary: true },
        { phase: 'executing', weight: 0.20, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.25, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    milestones: [
        { phase: 'initiating', weight: 0.05, isPrimary: false },
        { phase: 'planning', weight: 0.20, isPrimary: false },
        { phase: 'executing', weight: 0.30, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.40, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    constraints: [
        { phase: 'initiating', weight: 0.25, isPrimary: false },
        { phase: 'planning', weight: 0.40, isPrimary: true },
        { phase: 'executing', weight: 0.20, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    success_criteria: [
        { phase: 'initiating', weight: 0.40, isPrimary: true },
        { phase: 'planning', weight: 0.30, isPrimary: false },
        { phase: 'executing', weight: 0.10, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    best_practices: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.30, isPrimary: true },
        { phase: 'executing', weight: 0.40, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    phases: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.60, isPrimary: true },
        { phase: 'executing', weight: 0.20, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    resources: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.30, isPrimary: true },
        { phase: 'executing', weight: 0.40, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    technologies: [
        { phase: 'initiating', weight: 0.15, isPrimary: false },
        { phase: 'planning', weight: 0.35, isPrimary: true },
        { phase: 'executing', weight: 0.40, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    quality_standards: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.40, isPrimary: true },
        { phase: 'executing', weight: 0.30, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    compliance_security: [
        { phase: 'initiating', weight: 0.20, isPrimary: false },
        { phase: 'planning', weight: 0.35, isPrimary: true },
        { phase: 'executing', weight: 0.25, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    deliverables: [
        { phase: 'initiating', weight: 0.05, isPrimary: false },
        { phase: 'planning', weight: 0.25, isPrimary: false },
        { phase: 'executing', weight: 0.50, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    scope_items: [
        { phase: 'initiating', weight: 0.15, isPrimary: false },
        { phase: 'planning', weight: 0.55, isPrimary: true },
        { phase: 'executing', weight: 0.20, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    activities: [
        { phase: 'initiating', weight: 0.05, isPrimary: false },
        { phase: 'planning', weight: 0.30, isPrimary: false },
        { phase: 'executing', weight: 0.50, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    team_agreements: [
        { phase: 'initiating', weight: 0.15, isPrimary: false },
        { phase: 'planning', weight: 0.45, isPrimary: true },
        { phase: 'executing', weight: 0.25, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    development_approaches: [
        { phase: 'initiating', weight: 0.30, isPrimary: true },
        { phase: 'planning', weight: 0.40, isPrimary: false },
        { phase: 'executing', weight: 0.20, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    project_iterations: [
        { phase: 'initiating', weight: 0.05, isPrimary: false },
        { phase: 'planning', weight: 0.25, isPrimary: false },
        { phase: 'executing', weight: 0.55, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    work_items: [
        { phase: 'initiating', weight: 0.00, isPrimary: false },
        { phase: 'planning', weight: 0.20, isPrimary: false },
        { phase: 'executing', weight: 0.60, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    capacity_plans: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.50, isPrimary: true },
        { phase: 'executing', weight: 0.25, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    performance_measurements: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.25, isPrimary: false },
        { phase: 'executing', weight: 0.25, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.35, isPrimary: true },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    earned_value_metrics: [
        { phase: 'initiating', weight: 0.00, isPrimary: false },
        { phase: 'planning', weight: 0.30, isPrimary: false },
        { phase: 'executing', weight: 0.30, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.40, isPrimary: true },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    opportunities: [
        { phase: 'initiating', weight: 0.20, isPrimary: false },
        { phase: 'planning', weight: 0.30, isPrimary: true },
        { phase: 'executing', weight: 0.25, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    risk_responses: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.40, isPrimary: true },
        { phase: 'executing', weight: 0.30, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    performance_actuals: [
        { phase: 'initiating', weight: 0.00, isPrimary: false },
        { phase: 'planning', weight: 0.05, isPrimary: false },
        { phase: 'executing', weight: 0.45, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.45, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    governance_decisions: [
        { phase: 'initiating', weight: 0.25, isPrimary: false },
        { phase: 'planning', weight: 0.25, isPrimary: false },
        { phase: 'executing', weight: 0.20, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.25, isPrimary: true },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    approval_workflows: [
        { phase: 'initiating', weight: 0.30, isPrimary: true },
        { phase: 'planning', weight: 0.25, isPrimary: false },
        { phase: 'executing', weight: 0.20, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    steering_committees: [
        { phase: 'initiating', weight: 0.20, isPrimary: false },
        { phase: 'planning', weight: 0.20, isPrimary: false },
        { phase: 'executing', weight: 0.25, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.30, isPrimary: true },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    change_control_boards: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.20, isPrimary: false },
        { phase: 'executing', weight: 0.30, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.40, isPrimary: true },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    policy_compliance: [
        { phase: 'initiating', weight: 0.20, isPrimary: false },
        { phase: 'planning', weight: 0.30, isPrimary: true },
        { phase: 'executing', weight: 0.25, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    scope_baselines: [
        { phase: 'initiating', weight: 0.15, isPrimary: false },
        { phase: 'planning', weight: 0.60, isPrimary: true },
        { phase: 'executing', weight: 0.15, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    wbs_nodes: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.65, isPrimary: true },
        { phase: 'executing', weight: 0.20, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.05, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    scope_change_requests: [
        { phase: 'initiating', weight: 0.05, isPrimary: false },
        { phase: 'planning', weight: 0.15, isPrimary: false },
        { phase: 'executing', weight: 0.35, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.40, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    requirements_traceability: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.50, isPrimary: true },
        { phase: 'executing', weight: 0.25, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    scope_verification: [
        { phase: 'initiating', weight: 0.00, isPrimary: false },
        { phase: 'planning', weight: 0.20, isPrimary: false },
        { phase: 'executing', weight: 0.40, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.35, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    schedule_baselines: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.65, isPrimary: true },
        { phase: 'executing', weight: 0.15, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    schedule_activities: [
        { phase: 'initiating', weight: 0.05, isPrimary: false },
        { phase: 'planning', weight: 0.35, isPrimary: false },
        { phase: 'executing', weight: 0.45, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    critical_path_activities: [
        { phase: 'initiating', weight: 0.00, isPrimary: false },
        { phase: 'planning', weight: 0.45, isPrimary: true },
        { phase: 'executing', weight: 0.30, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.25, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    schedule_variances: [
        { phase: 'initiating', weight: 0.00, isPrimary: false },
        { phase: 'planning', weight: 0.10, isPrimary: false },
        { phase: 'executing', weight: 0.40, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.50, isPrimary: true },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    schedule_forecasts: [
        { phase: 'initiating', weight: 0.00, isPrimary: false },
        { phase: 'planning', weight: 0.25, isPrimary: false },
        { phase: 'executing', weight: 0.35, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.40, isPrimary: true },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    budget_baselines: [
        { phase: 'initiating', weight: 0.15, isPrimary: false },
        { phase: 'planning', weight: 0.60, isPrimary: true },
        { phase: 'executing', weight: 0.15, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    cost_actuals: [
        { phase: 'initiating', weight: 0.00, isPrimary: false },
        { phase: 'planning', weight: 0.05, isPrimary: false },
        { phase: 'executing', weight: 0.50, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.40, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    cost_estimates: [
        { phase: 'initiating', weight: 0.20, isPrimary: false },
        { phase: 'planning', weight: 0.60, isPrimary: true },
        { phase: 'executing', weight: 0.15, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.05, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    funding_tranches: [
        { phase: 'initiating', weight: 0.30, isPrimary: true },
        { phase: 'planning', weight: 0.25, isPrimary: false },
        { phase: 'executing', weight: 0.30, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    financial_variances: [
        { phase: 'initiating', weight: 0.00, isPrimary: false },
        { phase: 'planning', weight: 0.10, isPrimary: false },
        { phase: 'executing', weight: 0.40, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.50, isPrimary: true },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    procurement_costs: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.30, isPrimary: false },
        { phase: 'executing', weight: 0.45, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    resource_assignments: [
        { phase: 'initiating', weight: 0.15, isPrimary: false },
        { phase: 'planning', weight: 0.40, isPrimary: true },
        { phase: 'executing', weight: 0.30, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    resource_pool: [
        { phase: 'initiating', weight: 0.25, isPrimary: false },
        { phase: 'planning', weight: 0.45, isPrimary: true },
        { phase: 'executing', weight: 0.20, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    capacity_forecasts: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.45, isPrimary: true },
        { phase: 'executing', weight: 0.25, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    utilization_records: [
        { phase: 'initiating', weight: 0.00, isPrimary: false },
        { phase: 'planning', weight: 0.10, isPrimary: false },
        { phase: 'executing', weight: 0.50, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.40, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    resource_conflicts: [
        { phase: 'initiating', weight: 0.05, isPrimary: false },
        { phase: 'planning', weight: 0.25, isPrimary: false },
        { phase: 'executing', weight: 0.40, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.30, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    onboarding_offboarding: [
        { phase: 'initiating', weight: 0.15, isPrimary: false },
        { phase: 'planning', weight: 0.20, isPrimary: false },
        { phase: 'executing', weight: 0.35, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.20, isPrimary: false }
    ],
    risk_assessments: [
        { phase: 'initiating', weight: 0.25, isPrimary: false },
        { phase: 'planning', weight: 0.35, isPrimary: true },
        { phase: 'executing', weight: 0.20, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    risk_response_plans: [
        { phase: 'initiating', weight: 0.15, isPrimary: false },
        { phase: 'planning', weight: 0.50, isPrimary: true },
        { phase: 'executing', weight: 0.25, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    risk_triggers: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.30, isPrimary: false },
        { phase: 'executing', weight: 0.35, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.25, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    risk_reviews: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.20, isPrimary: false },
        { phase: 'executing', weight: 0.30, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.40, isPrimary: true },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    contingency_reserves: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.50, isPrimary: true },
        { phase: 'executing', weight: 0.25, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    risk_metrics: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.25, isPrimary: false },
        { phase: 'executing', weight: 0.30, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.35, isPrimary: true },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    engagement_actions: [
        { phase: 'initiating', weight: 0.20, isPrimary: false },
        { phase: 'planning', weight: 0.25, isPrimary: false },
        { phase: 'executing', weight: 0.35, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    communication_logs: [
        { phase: 'initiating', weight: 0.15, isPrimary: false },
        { phase: 'planning', weight: 0.20, isPrimary: false },
        { phase: 'executing', weight: 0.40, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    satisfaction_surveys: [
        { phase: 'initiating', weight: 0.05, isPrimary: false },
        { phase: 'planning', weight: 0.15, isPrimary: false },
        { phase: 'executing', weight: 0.30, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.45, isPrimary: true },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ],
    stakeholder_issues: [
        { phase: 'initiating', weight: 0.10, isPrimary: false },
        { phase: 'planning', weight: 0.15, isPrimary: false },
        { phase: 'executing', weight: 0.35, isPrimary: true },
        { phase: 'monitoring_controlling', weight: 0.40, isPrimary: false },
        { phase: 'closing', weight: 0.00, isPrimary: false }
    ],
    relationship_health: [
        { phase: 'initiating', weight: 0.15, isPrimary: false },
        { phase: 'planning', weight: 0.20, isPrimary: false },
        { phase: 'executing', weight: 0.30, isPrimary: false },
        { phase: 'monitoring_controlling', weight: 0.30, isPrimary: true },
        { phase: 'closing', weight: 0.05, isPrimary: false }
    ]
};
function getEntityPhaseWeights(entityType) {
    const snakeCase = entityType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    return exports.ENTITY_PHASE_WEIGHTS[snakeCase] || [];
}
function validateEntityPhaseWeights(entityType) {
    const weights = getEntityPhaseWeights(entityType);
    const sum = weights.reduce((total, w) => total + w.weight, 0);
    const isValid = Math.abs(sum - 1.0) < 0.0001;
    return { isValid, sum };
}
