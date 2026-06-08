import {
  computeEntityExtractionQuality,
  resolveDocumentEntityProfile,
} from '../entityExtractionQuality';

describe('entityExtractionQuality', () => {
  it('resolves charter profile from template name', () => {
    expect(resolveDocumentEntityProfile('Project Charter', null)?.id).toBe('charter');
  });

  it('scores low type fit when charter doc extracts schedule-only types', () => {
    const result = computeEntityExtractionQuality({
      extractedCountByType: {
        schedule_baseline: 2,
        schedule_activities: 5,
      },
      contextGroundedScore: 80,
      contextBackedTagCount: 8,
      totalTagCount: 10,
      templateName: 'Project Charter',
    });

    expect(result.typeFitScore).toBe(0);
    expect(result.unexpectedTypes).toEqual(['schedule_activities', 'schedule_baseline']);
    expect(result.documentProfile).toBe('charter');
    expect(result.concerns).toContain('wrong_types');
    expect(result.overallFitScore).toBeLessThan(80);
  });

  it('flags over-extraction on integration plan with inflated entity volume', () => {
    const result = computeEntityExtractionQuality({
      extractedCountByType: { stakeholders: 400, risks: 350, deliverables: 500, milestones: 672 },
      contextGroundedScore: 60,
      contextBackedTagCount: 120,
      totalTagCount: 300,
      templateName: 'Integration Management Plan',
      wordCount: 18662,
    });

    expect(result.documentProfile).toBe('integration');
    expect(result.totalEntityCount).toBe(1922);
    expect(result.volumeStatus).toBe('very_high');
    expect(result.concerns).toContain('too_many');
    expect(result.volumeScore).toBeLessThan(40);
    expect(result.diagnosisHeadline.toLowerCase()).toMatch(/too many/);
  });

  it('scores high when charter types are extracted at appropriate volume', () => {
    const result = computeEntityExtractionQuality({
      extractedCountByType: {
        stakeholders: 4,
        success_criteria: 2,
        risks: 3,
      },
      contextGroundedScore: 75,
      contextBackedTagCount: 9,
      totalTagCount: 12,
      templateName: 'Project Charter',
      wordCount: 1200,
    });

    expect(result.typeFitScore).toBe(100);
    expect(result.unexpectedTypes).toEqual([]);
    expect(result.concerns).not.toContain('too_many');
    expect(result.concerns).not.toContain('wrong_types');
    expect(result.overallFitScore).toBeGreaterThan(70);
  });

  it('falls back to context-only score when profile is unknown', () => {
    const result = computeEntityExtractionQuality({
      extractedCountByType: { stakeholders: 1 },
      contextGroundedScore: 42,
      contextBackedTagCount: 5,
      totalTagCount: 12,
      templateName: 'Custom Workshop Notes',
    });

    expect(result.documentProfile).toBeNull();
    expect(result.typeFitScore).toBe(100);
    expect(result.overallFitScore).toBe(Math.round(42 * 0.6 + 100 * 0.4));
  });
});
