import {
  assessFormalPlanningDocs,
  assessTripleConstraint,
  computeBaselineReadiness,
} from '../baselineReadiness';

describe('baselineReadiness', () => {
  it('does not certify readiness when charter exists but only entity data is rich', () => {
    const result = computeBaselineReadiness({
      hasCharter: true,
      coveragePercent: 100,
      totalEntities: 1922,
      documents: [{ title: 'Project Charter' }],
      activeBaseline: null,
    });

    expect(result.isReady).toBe(false);
    expect(result.lifecyclePhase).toBe('planning');
    expect(result.statusLabel).toBe('Planning In Progress');
    expect(result.dataMaturityMet).toBe(true);
    expect(result.missingReason).toContain('approved active baseline');
  });

  it('certifies readiness only with charter, approved baseline, and triple constraint', () => {
    const result = computeBaselineReadiness({
      hasCharter: true,
      coveragePercent: 100,
      totalEntities: 500,
      documents: [
        { title: 'Project Charter' },
        { title: 'Cost Management Plan' },
        { title: 'Schedule Management Plan' },
      ],
      activeBaseline: {
        is_approved: true,
        entity_count: {
          scope_items: 10,
          milestones: 5,
          budget_items: 3,
        },
      },
    });

    expect(result.isReady).toBe(true);
    expect(result.lifecyclePhase).toBe('ready_to_baseline');
    expect(result.hasTripleConstraint).toBe(true);
    expect(result.missingReason).toBeNull();
  });

  it('detects formal planning documents from titles', () => {
    const docs = assessFormalPlanningDocs([
      { title: 'Cost Management Plan' },
      { title: 'Schedule Management Plan' },
    ]);

    expect(docs.formalPlanningDocCount).toBe(2);
    expect(docs.hasCostPlan).toBe(true);
    expect(docs.hasSchedulePlan).toBe(true);
  });

  it('recognizes canonical singular/PMBOK8 entity_count keys for triple constraint', () => {
    expect(
      assessTripleConstraint({
        is_approved: true,
        entity_count: {
          scope_item: 4,
          schedule_activities: 12,
          budget_baselines: 2,
        },
      })
    ).toBe(true);

    expect(
      assessTripleConstraint({
        is_approved: true,
        entity_count: {
          scope_item: 4,
          schedule_activities: 12,
        },
      })
    ).toBe(false);
  });

  it('requires approval for triple constraint assessment', () => {
    expect(
      assessTripleConstraint({
        is_approved: false,
        entity_count: { scope_items: 1, milestones: 1, budget_items: 1 },
      })
    ).toBe(false);

    expect(
      assessTripleConstraint({
        is_approved: true,
        entity_count: { scope_items: 1, milestones: 1, budget_items: 1 },
      })
    ).toBe(true);
  });
});
