export const CHARTER_TEMPLATE_IDS = [
  'ffbcf898-0486-46fa-939f-e5629737de0e',
  '27788b37-2aa2-473f-accc-5a9e7eec7c48',
];

export type LifecyclePhase = 'initiation' | 'planning' | 'ready_to_baseline';

export interface DocumentTitleRef {
  title?: string | null;
  name?: string | null;
}

export interface ActiveBaselineRef {
  is_approved?: boolean | null;
  entity_count?: Record<string, number> | null;
}

export interface BaselineReadinessInput {
  hasCharter: boolean;
  coveragePercent: number;
  totalEntities: number;
  documents: DocumentTitleRef[];
  activeBaseline: ActiveBaselineRef | null;
}

export interface BaselineReadinessResult {
  isReady: boolean;
  lifecyclePhase: LifecyclePhase;
  statusLabel: string;
  coveragePercent: number;
  dataMaturityMet: boolean;
  hasCharter: boolean;
  hasApprovedActiveBaseline: boolean;
  hasTripleConstraint: boolean;
  formalPlanningDocCount: number;
  totalEntities: number;
  requirements: {
    minEntities: number;
    minCoverage: number;
    requiresCharter: true;
    requiresApprovedBaseline: true;
    requiresTripleConstraint: true;
  };
  missingReason: string | null;
  nextSteps: string[];
}

const MIN_ENTITIES = 350;
const MIN_COVERAGE = 60;

/** Legacy plural keys and canonical singular/PMBOK8 keys written by inline extraction. */
const SCOPE_BASELINE_COUNT_KEYS = [
  'scope_items',
  'scope_item',
  'deliverables',
  'deliverable',
  'requirements',
  'requirement',
  'scope_baselines',
  'scope_baseline',
  'wbs_nodes',
  'wbs_node',
  'scope_change_requests',
  'scope_change_request',
  'requirements_traceability',
  'scope_verification',
] as const;

const SCHEDULE_BASELINE_COUNT_KEYS = [
  'milestones',
  'milestone',
  'phases',
  'phase',
  'activities',
  'activity',
  'schedule_activities',
  'schedule_activity',
  'schedule_baselines',
  'schedule_baseline',
  'critical_path_activities',
  'critical_path_activity',
  'schedule_variances',
  'schedule_variance',
  'schedule_forecasts',
  'schedule_forecast',
] as const;

const COST_BASELINE_COUNT_KEYS = [
  'budget_items',
  'budget_item',
  'budget_baselines',
  'budget_baseline',
  'cost_estimates',
  'cost_estimate',
  'cost_actuals',
  'cost_actual',
  'financial_entities',
  'financial_entity',
  'earned_value_metrics',
  'earned_value_metric',
] as const;

function sumEntityCounts(
  counts: Record<string, number>,
  keys: readonly string[]
): number {
  return keys.reduce((sum, key) => sum + (Number(counts[key]) || 0), 0);
}

function normalizeTitle(doc: DocumentTitleRef): string {
  return (doc.title || doc.name || '').toLowerCase();
}

export function assessFormalPlanningDocs(documents: DocumentTitleRef[]): {
  hasCostPlan: boolean;
  hasSchedulePlan: boolean;
  formalPlanningDocCount: number;
} {
  const titles = documents.map(normalizeTitle);
  const hasCostPlan = titles.some(
    (t) => t.includes('cost') && t.includes('plan')
  );
  const hasSchedulePlan = titles.some(
    (t) => t.includes('schedule') && t.includes('plan')
  );

  return {
    hasCostPlan,
    hasSchedulePlan,
    formalPlanningDocCount: [hasCostPlan, hasSchedulePlan].filter(Boolean).length,
  };
}

export function assessTripleConstraint(
  activeBaseline: ActiveBaselineRef | null
): boolean {
  if (!activeBaseline?.is_approved) {
    return false;
  }

  const counts = activeBaseline.entity_count || {};
  const scopeCount = sumEntityCounts(counts, SCOPE_BASELINE_COUNT_KEYS);
  const scheduleCount = sumEntityCounts(counts, SCHEDULE_BASELINE_COUNT_KEYS);
  const costCount = sumEntityCounts(counts, COST_BASELINE_COUNT_KEYS);

  return scopeCount > 0 && scheduleCount > 0 && costCount > 0;
}

export function computeBaselineReadiness(
  input: BaselineReadinessInput
): BaselineReadinessResult {
  const { hasCharter, coveragePercent, totalEntities, documents, activeBaseline } =
    input;

  const dataMaturityMet =
    coveragePercent >= MIN_COVERAGE && totalEntities >= MIN_ENTITIES;
  const { formalPlanningDocCount } = assessFormalPlanningDocs(documents);
  const hasApprovedActiveBaseline = Boolean(activeBaseline?.is_approved);
  const hasTripleConstraint = assessTripleConstraint(activeBaseline);

  const isReady =
    hasCharter && hasApprovedActiveBaseline && hasTripleConstraint;

  let lifecyclePhase: LifecyclePhase;
  let statusLabel: string;

  if (isReady) {
    lifecyclePhase = 'ready_to_baseline';
    statusLabel = 'Ready to Baseline';
  } else if (hasCharter) {
    lifecyclePhase = 'planning';
    statusLabel = 'Planning In Progress';
  } else {
    lifecyclePhase = 'initiation';
    statusLabel = 'Initiation In Progress';
  }

  const nextSteps: string[] = [];
  if (!hasCharter) {
    nextSteps.push('Publish a Project Charter to complete initiation.');
  } else {
    if (formalPlanningDocCount < 2) {
      nextSteps.push(
        'Develop formal Cost and Schedule management plans during planning.'
      );
    }
    if (!hasApprovedActiveBaseline) {
      nextSteps.push(
        'Create and approve an integrated project baseline (scope, schedule, cost).'
      );
    } else if (!hasTripleConstraint) {
      nextSteps.push(
        'Ensure the approved baseline includes scope, schedule, and cost components.'
      );
    }
  }

  let missingReason: string | null = null;
  if (!hasCharter) {
    missingReason = 'Project Charter missing';
  } else if (!hasApprovedActiveBaseline) {
    missingReason =
      'No approved active baseline — entity extraction alone does not certify baseline readiness';
  } else if (!hasTripleConstraint) {
    missingReason =
      'Approved baseline missing scope, schedule, or cost baseline components';
  }

  return {
    isReady,
    lifecyclePhase,
    statusLabel,
    coveragePercent,
    dataMaturityMet,
    hasCharter,
    hasApprovedActiveBaseline,
    hasTripleConstraint,
    formalPlanningDocCount,
    totalEntities,
    requirements: {
      minEntities: MIN_ENTITIES,
      minCoverage: MIN_COVERAGE,
      requiresCharter: true,
      requiresApprovedBaseline: true,
      requiresTripleConstraint: true,
    },
    missingReason,
    nextSteps,
  };
}
