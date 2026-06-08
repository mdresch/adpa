/**
 * Measures whether inline H8 extraction matches the document type, volume, and project context.
 * Separates "too many entities" from "wrong entity types".
 */

export interface VolumeGuide {
  entityCount: { ideal: number; max: number };
  tagCount: { ideal: number; max: number };
  typeCount: { ideal: number; max: number };
  entitiesPer1000Words: { ideal: number; max: number };
}

export interface DocumentEntityProfile {
  id: string;
  label: string;
  types: string[];
  volume: VolumeGuide;
}

export type ExtractionConcern = 'too_many' | 'wrong_types' | 'off_context' | 'under_extracted';

export type VolumeStatus = 'appropriate' | 'elevated' | 'high' | 'very_high' | 'low' | 'unknown';

export const DOCUMENT_ENTITY_PROFILES: Record<string, DocumentEntityProfile> = {
  charter: {
    id: 'charter',
    label: 'Project Charter',
    types: [
      'stakeholders',
      'success_criteria',
      'constraints',
      'deliverables',
      'milestones',
      'risks',
      'requirements',
      'phases',
      'project_charter_details',
      'assumptions',
      'scope_items',
      'resources',
    ],
    volume: {
      entityCount: { ideal: 35, max: 90 },
      tagCount: { ideal: 50, max: 120 },
      typeCount: { ideal: 8, max: 12 },
      entitiesPer1000Words: { ideal: 6, max: 18 },
    },
  },
  integration: {
    id: 'integration',
    label: 'Integration / PMP',
    types: [
      'stakeholders',
      'deliverables',
      'milestones',
      'risks',
      'requirements',
      'constraints',
      'success_criteria',
      'phases',
      'activities',
      'scope_items',
      'wbs_nodes',
      'governance_decisions',
      'change_control_boards',
      'performance_measurements',
      'development_approaches',
      'team_agreements',
    ],
    volume: {
      entityCount: { ideal: 120, max: 280 },
      tagCount: { ideal: 180, max: 400 },
      typeCount: { ideal: 12, max: 16 },
      entitiesPer1000Words: { ideal: 8, max: 22 },
    },
  },
  cost: {
    id: 'cost',
    label: 'Cost Management',
    types: [
      'budget_baseline',
      'cost_estimates',
      'funding_tranches',
      'financial_variances',
      'procurement_costs',
      'cost_actuals',
      'contingency_reserves',
      'constraints',
    ],
    volume: {
      entityCount: { ideal: 25, max: 70 },
      tagCount: { ideal: 40, max: 100 },
      typeCount: { ideal: 5, max: 8 },
      entitiesPer1000Words: { ideal: 5, max: 15 },
    },
  },
  schedule: {
    id: 'schedule',
    label: 'Schedule Management',
    types: [
      'schedule_baseline',
      'schedule_activities',
      'milestones',
      'critical_path',
      'phases',
      'activities',
      'schedule_variances',
      'schedule_forecasts',
      'dependencies',
    ],
    volume: {
      entityCount: { ideal: 40, max: 100 },
      tagCount: { ideal: 60, max: 150 },
      typeCount: { ideal: 6, max: 9 },
      entitiesPer1000Words: { ideal: 6, max: 16 },
    },
  },
  risk: {
    id: 'risk',
    label: 'Risk Management',
    types: [
      'risks',
      'opportunities',
      'risk_responses',
      'risk_assessments',
      'risk_response_plans',
      'risk_triggers',
      'risk_reviews',
      'contingency_reserves',
      'probability_impact_matrix',
    ],
    volume: {
      entityCount: { ideal: 30, max: 80 },
      tagCount: { ideal: 45, max: 110 },
      typeCount: { ideal: 5, max: 8 },
      entitiesPer1000Words: { ideal: 5, max: 14 },
    },
  },
  quality: {
    id: 'quality',
    label: 'Quality Management',
    types: [
      'quality_standards',
      'performance_measurements',
      'performance_actuals',
      'deliverables',
      'requirements',
      'best_practices',
    ],
    volume: {
      entityCount: { ideal: 25, max: 65 },
      tagCount: { ideal: 35, max: 90 },
      typeCount: { ideal: 5, max: 7 },
      entitiesPer1000Words: { ideal: 5, max: 13 },
    },
  },
  communications: {
    id: 'communications',
    label: 'Communications Management',
    types: [
      'communication_logs',
      'engagement_actions',
      'stakeholder_engagements',
      'stakeholders',
      'meeting_minutes',
      'action_items',
    ],
    volume: {
      entityCount: { ideal: 20, max: 55 },
      tagCount: { ideal: 30, max: 75 },
      typeCount: { ideal: 4, max: 6 },
      entitiesPer1000Words: { ideal: 4, max: 12 },
    },
  },
  stakeholder: {
    id: 'stakeholder',
    label: 'Stakeholder Management',
    types: [
      'stakeholders',
      'stakeholder_engagements',
      'engagement_actions',
      'relationship_health',
      'satisfaction_surveys',
      'stakeholder_issues',
    ],
    volume: {
      entityCount: { ideal: 25, max: 60 },
      tagCount: { ideal: 35, max: 85 },
      typeCount: { ideal: 4, max: 6 },
      entitiesPer1000Words: { ideal: 5, max: 12 },
    },
  },
};

export interface EntityExtractionQuality {
  typeFitScore: number;
  contextGroundedScore: number;
  volumeScore: number;
  overallFitScore: number;
  documentProfile: string | null;
  documentProfileLabel: string | null;
  extractedTypeCount: number;
  matchedTypeCount: number;
  totalEntityCount: number;
  unexpectedTypes: string[];
  missingExpectedTypes: string[];
  contextBackedTagCount: number;
  novelTagCount: number;
  totalTagCount: number;
  entitiesPer1000Words: number | null;
  volumeStatus: VolumeStatus;
  concerns: ExtractionConcern[];
  diagnosisHeadline: string;
  diagnosisDetail: string;
}

function scoreAgainstGuide(actual: number, ideal: number, max: number): number {
  if (actual <= 0) return 100;
  if (actual <= ideal) return 100;
  if (actual <= max) {
    const span = max - ideal || 1;
    return Math.round(100 - ((actual - ideal) / span) * 35);
  }
  const ratio = max / actual;
  return Math.max(15, Math.round(ratio * 65));
}

function scoreLowVolume(actual: number, ideal: number): number {
  if (actual >= ideal * 0.5) return 100;
  if (actual <= 0) return 40;
  return Math.max(40, Math.round((actual / (ideal * 0.5)) * 100));
}

function resolveVolumeStatus(
  totalEntityCount: number,
  extractedTypeCount: number,
  entitiesPer1000Words: number | null,
  guide: VolumeGuide | null
): VolumeStatus {
  if (!guide) return 'unknown';

  const entityRatio = totalEntityCount / guide.entityCount.max;
  const typeRatio = extractedTypeCount / guide.typeCount.max;
  const densityRatio =
    entitiesPer1000Words != null
      ? entitiesPer1000Words / guide.entitiesPer1000Words.max
      : 0;

  const peak = Math.max(entityRatio, typeRatio, densityRatio);
  if (peak >= 2.5) return 'very_high';
  if (peak >= 1.5) return 'high';
  if (peak >= 1.0) return 'elevated';
  if (totalEntityCount < guide.entityCount.ideal * 0.25) return 'low';
  return 'appropriate';
}

function buildDiagnosis(input: {
  concerns: ExtractionConcern[];
  profile: DocumentEntityProfile | null;
  totalEntityCount: number;
  extractedTypeCount: number;
  unexpectedTypes: string[];
  novelTagCount: number;
  totalTagCount: number;
  volumeStatus: VolumeStatus;
  entitiesPer1000Words: number | null;
}): { headline: string; detail: string } {
  const {
    concerns,
    profile,
    totalEntityCount,
    extractedTypeCount,
    unexpectedTypes,
    novelTagCount,
    totalTagCount,
    volumeStatus,
    entitiesPer1000Words,
  } = input;

  if (concerns.length === 0) {
    return {
      headline: 'Volume and entity types look appropriate',
      detail: profile
        ? `${totalEntityCount} entities across ${extractedTypeCount} types fits the ${profile.label} profile.`
        : `${totalEntityCount} entities extracted with no major volume or type warnings.`,
    };
  }

  const parts: string[] = [];
  if (concerns.includes('too_many')) parts.push('extracting too many entities');
  if (concerns.includes('wrong_types')) parts.push('wrong entity types for this document');
  if (concerns.includes('off_context')) parts.push('tags not grounded in project context');
  if (concerns.includes('under_extracted')) parts.push('missing expected entity coverage');

  const headline =
    parts.length === 1
      ? `Likely ${parts[0]}`
      : `Likely ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

  const guide = profile?.volume;
  const densityNote =
    entitiesPer1000Words != null ? ` (~${entitiesPer1000Words} entities per 1k words)` : '';

  let detail = `${totalEntityCount} entities across ${extractedTypeCount} types${densityNote}.`;
  if (guide && (volumeStatus === 'high' || volumeStatus === 'very_high')) {
    detail += ` Guide for ${profile!.label}: aim for ≤${guide.entityCount.max} entities, ≤${guide.typeCount.max} types.`;
  }
  if (unexpectedTypes.length > 0) {
    detail += ` ${unexpectedTypes.length} type(s) are unexpected for this document.`;
  }
  if (totalTagCount > 0 && novelTagCount > 0) {
    detail += ` ${novelTagCount} of ${totalTagCount} H8 tags did not match provided context.`;
  }

  return { headline, detail };
}

function detectConcerns(input: {
  profile: DocumentEntityProfile | null;
  totalEntityCount: number;
  extractedTypeCount: number;
  unexpectedTypes: string[];
  novelTagCount: number;
  totalTagCount: number;
  missingExpectedTypes: string[];
  volumeStatus: VolumeStatus;
  entitiesPer1000Words: number | null;
}): ExtractionConcern[] {
  const concerns: ExtractionConcern[] = [];
  const {
    profile,
    totalEntityCount,
    extractedTypeCount,
    unexpectedTypes,
    novelTagCount,
    totalTagCount,
    missingExpectedTypes,
    volumeStatus,
    entitiesPer1000Words,
  } = input;

  const guide = profile?.volume;

  if (
    volumeStatus === 'high' ||
    volumeStatus === 'very_high' ||
    (guide && totalEntityCount > guide.entityCount.max) ||
    (guide && extractedTypeCount > guide.typeCount.max) ||
    (guide &&
      entitiesPer1000Words != null &&
      entitiesPer1000Words > guide.entitiesPer1000Words.max * 1.25)
  ) {
    concerns.push('too_many');
  }

  const wrongTypeRatio =
    extractedTypeCount > 0 ? unexpectedTypes.length / extractedTypeCount : 0;
  if (unexpectedTypes.length >= 2 && wrongTypeRatio >= 0.2) {
    concerns.push('wrong_types');
  }

  if (totalTagCount >= 5 && novelTagCount / totalTagCount >= 0.35) {
    concerns.push('off_context');
  }

  if (
    guide &&
    totalEntityCount < guide.entityCount.ideal * 0.3 &&
    missingExpectedTypes.length >= Math.min(4, profile!.types.length)
  ) {
    concerns.push('under_extracted');
  }

  return concerns;
}

export function resolveDocumentEntityProfile(
  templateName?: string | null,
  category?: string | null
): DocumentEntityProfile | null {
  const haystack = `${templateName || ''} ${category || ''}`.toLowerCase();

  if (haystack.includes('charter')) return DOCUMENT_ENTITY_PROFILES.charter;
  if (
    haystack.includes('integration') ||
    haystack.includes('project management plan') ||
    haystack.includes('pmp')
  ) {
    return DOCUMENT_ENTITY_PROFILES.integration;
  }
  if (haystack.includes('cost') && haystack.includes('plan')) {
    return DOCUMENT_ENTITY_PROFILES.cost;
  }
  if (haystack.includes('schedule') && haystack.includes('plan')) {
    return DOCUMENT_ENTITY_PROFILES.schedule;
  }
  if (haystack.includes('risk') && haystack.includes('plan')) {
    return DOCUMENT_ENTITY_PROFILES.risk;
  }
  if (haystack.includes('quality') && haystack.includes('plan')) {
    return DOCUMENT_ENTITY_PROFILES.quality;
  }
  if (haystack.includes('communication') && haystack.includes('plan')) {
    return DOCUMENT_ENTITY_PROFILES.communications;
  }
  if (haystack.includes('stakeholder') && haystack.includes('plan')) {
    return DOCUMENT_ENTITY_PROFILES.stakeholder;
  }

  return null;
}

export function computeEntityExtractionQuality(input: {
  extractedCountByType: Record<string, number>;
  contextGroundedScore: number;
  contextBackedTagCount: number;
  totalTagCount: number;
  templateName?: string | null;
  templateCategory?: string | null;
  wordCount?: number | null;
}): EntityExtractionQuality {
  const {
    extractedCountByType,
    contextGroundedScore,
    contextBackedTagCount,
    totalTagCount,
    templateName,
    templateCategory,
    wordCount,
  } = input;

  const extractedTypes = Object.entries(extractedCountByType)
    .filter(([, count]) => count > 0)
    .map(([type]) => type.toLowerCase());

  const totalEntityCount = Object.values(extractedCountByType).reduce(
    (sum, count) => sum + (count > 0 ? count : 0),
    0
  );

  const profile = resolveDocumentEntityProfile(templateName, templateCategory);
  const guide = profile?.volume ?? null;
  const expectedSet = profile ? new Set(profile.types.map((t) => t.toLowerCase())) : null;

  const unexpectedTypes = expectedSet
    ? extractedTypes.filter((t) => !expectedSet.has(t)).sort()
    : [];

  const matchedTypes = expectedSet
    ? extractedTypes.filter((t) => expectedSet.has(t))
    : extractedTypes;

  const missingExpectedTypes = expectedSet
    ? profile!.types.filter((t) => !extractedTypes.includes(t.toLowerCase())).sort()
    : [];

  const typeFitScore =
    !expectedSet || extractedTypes.length === 0
      ? expectedSet
        ? 0
        : 100
      : Math.round((matchedTypes.length / extractedTypes.length) * 100);

  const novelTagCount = Math.max(0, totalTagCount - contextBackedTagCount);

  const entitiesPer1000Words =
    wordCount && wordCount > 0
      ? Math.round((totalEntityCount / wordCount) * 1000 * 10) / 10
      : null;

  let volumeScore = 100;
  if (guide) {
    const entityVol = scoreAgainstGuide(
      totalEntityCount,
      guide.entityCount.ideal,
      guide.entityCount.max
    );
    const tagVol = scoreAgainstGuide(totalTagCount, guide.tagCount.ideal, guide.tagCount.max);
    const typeVol = scoreAgainstGuide(
      extractedTypes.length,
      guide.typeCount.ideal,
      guide.typeCount.max
    );
    const lowVol = scoreLowVolume(totalEntityCount, guide.entityCount.ideal);
    const densityVol =
      entitiesPer1000Words != null
        ? scoreAgainstGuide(
            entitiesPer1000Words,
            guide.entitiesPer1000Words.ideal,
            guide.entitiesPer1000Words.max
          )
        : 100;

    volumeScore = Math.min(entityVol, tagVol, typeVol, lowVol, densityVol);
  }

  const volumeStatus = resolveVolumeStatus(
    totalEntityCount,
    extractedTypes.length,
    entitiesPer1000Words,
    guide
  );

  const concerns = detectConcerns({
    profile,
    totalEntityCount,
    extractedTypeCount: extractedTypes.length,
    unexpectedTypes,
    novelTagCount,
    totalTagCount,
    missingExpectedTypes,
    volumeStatus,
    entitiesPer1000Words,
  });

  const { headline: diagnosisHeadline, detail: diagnosisDetail } = buildDiagnosis({
    concerns,
    profile,
    totalEntityCount,
    extractedTypeCount: extractedTypes.length,
    unexpectedTypes,
    novelTagCount,
    totalTagCount,
    volumeStatus,
    entitiesPer1000Words,
  });

  const overallFitScore = profile
    ? Math.round(typeFitScore * 0.3 + contextGroundedScore * 0.35 + volumeScore * 0.35)
    : Math.round(contextGroundedScore * 0.6 + volumeScore * 0.4);

  return {
    typeFitScore,
    contextGroundedScore,
    volumeScore,
    overallFitScore,
    documentProfile: profile?.id ?? null,
    documentProfileLabel: profile?.label ?? null,
    extractedTypeCount: extractedTypes.length,
    matchedTypeCount: matchedTypes.length,
    totalEntityCount,
    unexpectedTypes,
    missingExpectedTypes,
    contextBackedTagCount,
    novelTagCount,
    totalTagCount,
    entitiesPer1000Words,
    volumeStatus,
    concerns,
    diagnosisHeadline,
    diagnosisDetail,
  };
}

/** Backfill / refresh entityExtractionQuality on read from stored counts + metadata. */
export function enrichDocumentExtractionQuality(document: {
  name?: string;
  entity_counts?: unknown;
  generation_metadata?: unknown;
}): void {
  if (!document.generation_metadata || typeof document.generation_metadata !== 'object') return;
  const meta = document.generation_metadata as Record<string, unknown>;

  let entityCounts: Record<string, number> = {};
  const rawCounts = document.entity_counts;
  if (typeof rawCounts === 'string') {
    try {
      entityCounts = JSON.parse(rawCounts) as Record<string, number>;
    } catch {
      /* ignore */
    }
  } else if (rawCounts && typeof rawCounts === 'object') {
    entityCounts = rawCounts as Record<string, number>;
  }

  const stats = meta.contextConsistencyStats as {
    consistencyWins?: number;
    totalOccurrences?: number;
  } | null;

  const contentMetrics = meta.contentMetrics as { wordCount?: number } | undefined;
  const wordCount =
    contentMetrics?.wordCount ??
    (typeof meta.wordCount === 'number' ? meta.wordCount : null);

  meta.entityExtractionQuality = computeEntityExtractionQuality({
    extractedCountByType: entityCounts,
    contextGroundedScore: Number(meta.occurrenceConsistencyScore) || 0,
    contextBackedTagCount: stats?.consistencyWins ?? 0,
    totalTagCount: stats?.totalOccurrences ?? 0,
    templateName: document.name,
    templateCategory: (meta.template as { framework?: string })?.framework ?? null,
    wordCount,
  });
}
