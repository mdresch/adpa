import {
  buildInlineEntityExtractionPrompt,
  INLINE_ENTITY_EXTRACTION_PROMPT,
} from '../../services/inlineEntityExtractionPrompt';

describe('buildInlineEntityExtractionPrompt', () => {
  it('returns full prompt when document profile is unknown', () => {
    const prompt = buildInlineEntityExtractionPrompt({
      templateName: 'Workshop Notes',
      category: null,
    });
    expect(prompt).toBe(INLINE_ENTITY_EXTRACTION_PROMPT);
  });

  it('scopes Risk Management Plan to profile entity types only', () => {
    const prompt = buildInlineEntityExtractionPrompt({
      templateName: 'Risk Management Plan',
      category: 'ADPA - ICT Governance Framework',
    });

    expect(prompt).toContain('Document profile: Risk Management');
    expect(prompt).toContain('**risks**');
    expect(prompt).toContain('**risk_assessments**');
    expect(prompt).toContain('**contingency_reserves**');
    expect(prompt).toContain('Profile lock');

    expect(prompt).not.toContain('**activities**');
    expect(prompt).not.toContain('**deliverables**');
    expect(prompt).not.toContain('**approval_workflows**');
    expect(prompt).not.toContain('**change_control_boards**');
    expect(prompt.length).toBeLessThan(INLINE_ENTITY_EXTRACTION_PROMPT.length);
  });
});
