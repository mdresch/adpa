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
  const scopeCount =
    (counts.scope_items || 0) +
    (counts.deliverables || 0) +
    (counts.requirements || 0);
  const scheduleCount =
    (counts.milestones || 0) +
    (counts.phases || 0) +
    (counts.activities || 0);
  const costCount =
    (counts.budget_items || 0) +
    (counts.cost_estimates || 0) +
    (counts.financial_entities || 0);

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
