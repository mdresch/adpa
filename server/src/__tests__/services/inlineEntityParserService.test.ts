import {
  InlineEntityParserService,
  hasInlineH8EntityTags,
  normalizeInlineEntityMarkdown,
  repairInlineEntityJson,
  stripInlineH8TagsForExport,
} from '../../services/inlineEntityParserService';
import { saveSingleEntityType } from '../../services/extraction/ExtractionOrchestrator';

jest.mock('../../services/extraction/ExtractionOrchestrator', () => ({
  saveSingleEntityType: jest.fn().mockResolvedValue({ saved: 1, skipped: 0, failed: 0 }),
}));

describe('InlineEntityParserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hasInlineH8EntityTags detects H8 lines and ignores plain markdown', () => {
    expect(hasInlineH8EntityTags('######## stakeholders: {"name":"A"}')).toBe(true);
    expect(hasInlineH8EntityTags('# Heading only\nBody text')).toBe(false);
    expect(hasInlineH8EntityTags('')).toBe(false);
  });

  it('stripInlineH8TagsForExport removes H8 lines but keeps narrative markdown', () => {
    const markdown = [
      '# Schedule Overview',
      'The project follows a phased approach.',
      '######## milestones: {"name":"Phase Gate 1","date":"2026-06-01"}',
      '######## activities: {"name":"Kickoff","duration_days":1}',
      '',
      '## Next Steps',
      'Review baseline with the PMO.',
    ].join('\n');

    const stripped = stripInlineH8TagsForExport(markdown);

    expect(stripped).toContain('# Schedule Overview');
    expect(stripped).toContain('The project follows a phased approach.');
    expect(stripped).toContain('## Next Steps');
    expect(stripped).not.toContain('########');
    expect(stripped).not.toContain('milestones:');
  });

  it('stripInlineH8TagsForExport removes loose chained entity tags', () => {
    const loose =
      'Intro paragraph.\nresources: {"name": "Analyst", "type": "human"}\\stakeholders: {"name": "Sponsor", "role": "Exec"}\nClosing paragraph.';

    const stripped = stripInlineH8TagsForExport(loose);

    expect(stripped).toContain('Intro paragraph.');
    expect(stripped).toContain('Closing paragraph.');
    expect(stripped).not.toContain('resources:');
    expect(stripped).not.toContain('stakeholders:');
  });

  it('hasInlineH8EntityTags detects backslash-chained loose tags without ######## prefix', () => {
    const loose =
      'team_agreements: {"title": "A"}\\resources: {"name": "B", "type": "human"}\\stakeholders: {"name": "C", "role": "Sponsor"}';
    expect(hasInlineH8EntityTags(loose)).toBe(true);
  });

  it('normalizeInlineEntityMarkdown splits backslash-chained loose tags onto separate H8 lines', () => {
    const loose =
      'team_agreements: {"title": "ADPA Agreement", "category": "quality_standards"}\\resources: {"name": "Engineer", "type": "human"}\\stakeholders: {"name": "Audit Board", "role": "Auditor"}';

    const normalized = normalizeInlineEntityMarkdown(loose);

    expect(normalized.split('\n')).toHaveLength(3);
    expect(normalized).toContain('######## team_agreements:');
    expect(normalized).toContain('######## resources:');
    expect(normalized).toContain('######## stakeholders:');
  });

  it('should parse backslash-chained loose tags missing the ######## prefix', async () => {
    const markdown =
      'team_agreements: {"title": "ADPA Framework Core Working Agreement", "category": "quality_standards", "description": "All code must maintain 100% unit test coverage.", "status": "active"}\\roles_and_responsibilities: {"role": "Project Manager", "name": "Raj Patel", "responsibilities": "Overall project execution.", "authority_level": "high"}\\resources: {"name": "Menno Drescher", "type": "human", "quantity": 1, "availability": "full-time", "cost_per_unit": 180, "unit": "hour"}\\stakeholders: {"name": "ADPA Executive Team", "role": "Project Sponsor", "interest_level": "high", "influence_level": "high", "department": "Executive Leadership", "expectations": "Successful automation."}';

    const result = await InlineEntityParserService.parseAndProcess({
      projectId: 'p1',
      userId: 'u1',
      markdown,
      persist: false,
    });

    expect(result.extractedCount).toBe(4);
    expect(result.extractedCountByType.team_agreements).toBe(1);
    expect(result.extractedCountByType.roles_and_responsibilities).toBe(1);
    expect(result.extractedCountByType.resources).toBe(1);
    expect(result.extractedCountByType.stakeholders).toBe(1);
    expect(result.cleanedMarkdown).toContain('######## team_agreements:');
    expect(result.cleanedMarkdown).not.toContain('\\resources:');
  });

  it('should skip persistence when persist is false', async () => {
    const markdown = '######## risks: { "title": "Delay", "severity": "high" }';
    const result = await InlineEntityParserService.parseAndProcess({
      projectId: 'p1',
      userId: 'u1',
      markdown,
      persist: false,
    });

    expect(result.extractedCount).toBe(1);
    expect(saveSingleEntityType).not.toHaveBeenCalled();
  });

  it('should parse entities and clean markdown correctly', async () => {
    const markdown = [
      '# Project Report',
      'This is a test report.',
      '######## stakeholder: { "name": "John Doe", "role": "PM" }',
      'Some more text in between.',
      '######## stakeholder: { "name": "Jane Smith", "role": "Developer" }',
      '######## risk: { "title": "Budget overrun", "severity": "high" }',
      'End of document.',
    ].join('\n');

    const projectId = 'project-123';
    const userId = 'user-456';

    const result = await InlineEntityParserService.parseAndProcess({
      projectId,
      userId,
      markdown,
    });

    // Verify cleaned markdown (should preserve H8 tag lines)
    expect(result.cleanedMarkdown).toBe(markdown);
    expect(result.extractedCount).toBe(3);

    // Verify saveSingleEntityType calls
    expect(saveSingleEntityType).toHaveBeenCalledTimes(2);

    expect(saveSingleEntityType).toHaveBeenCalledWith(
      projectId,
      userId,
      'stakeholder',
      [
        { name: 'John Doe', role: 'PM' },
        { name: 'Jane Smith', role: 'Developer' },
      ]
    );

    expect(saveSingleEntityType).toHaveBeenCalledWith(
      projectId,
      userId,
      'risk',
      [
        { title: 'Budget overrun', severity: 'high' },
      ]
    );
  });

  it('should handle markdown with no entities', async () => {
    const markdown = [
      '# Heading',
      'No entities here.',
    ].join('\n');

    const result = await InlineEntityParserService.parseAndProcess({
      projectId: 'p1',
      userId: 'u1',
      markdown,
    });

    expect(result.cleanedMarkdown).toBe(markdown);
    expect(result.extractedCount).toBe(0);
    expect(saveSingleEntityType).not.toHaveBeenCalled();
  });

  it('should ignore malformed JSON but still preserve the H8 line', async () => {
    const markdown = [
      'Before line.',
      '######## stakeholder: { invalid json }',
      'After line.',
    ].join('\n');

    const result = await InlineEntityParserService.parseAndProcess({
      projectId: 'p1',
      userId: 'u1',
      markdown,
    });

    expect(result.cleanedMarkdown).toBe(markdown);
    expect(result.extractedCount).toBe(0);
    expect(saveSingleEntityType).not.toHaveBeenCalled();
  });

  it('should handle empty markdown input', async () => {
    const result = await InlineEntityParserService.parseAndProcess({
      projectId: 'p1',
      userId: 'u1',
      markdown: '',
    });

    expect(result.cleanedMarkdown).toBe('');
    expect(result.extractedCount).toBe(0);
    expect(saveSingleEntityType).not.toHaveBeenCalled();
  });

  it('repairInlineEntityJson fixes markdown-escaped brackets in JSON string values', () => {
    const raw = '{"owner": "\\[TBD - Role\\]", "wbs_code": "1.0"}';
    const repaired = repairInlineEntityJson(raw);
    expect(JSON.parse(repaired)).toEqual({ owner: '[TBD - Role]', wbs_code: '1.0' });
  });

  it('should parse wbs_nodes with markdown-escaped bracket placeholders', async () => {
    const markdown =
      '######## wbs_nodes: {"wbs_code": "1.0", "name": "ADPA - ICT Governance Framework", "level": 1, "parent_code": null, "owner": "\\[TBD - Role\\]", "estimated_effort": null, "estimated_cost": null}';

    const result = await InlineEntityParserService.parseAndProcess({
      projectId: 'p1',
      userId: 'u1',
      markdown,
      persist: false,
    });

    expect(result.extractedCount).toBe(1);
    expect(result.extractedCountByType.wbs_nodes).toBe(1);
    expect(result.entitiesByType.wbs_nodes[0].owner).toBe('[TBD - Role]');
  });

  it('should score each repeated context entity tag as a consistency win', async () => {
    const markdown = [
      '######## stakeholders: { "name": "Steering Committee", "role": "Sponsor" }',
      '######## stakeholders: { "name": "Steering Committee", "role": "Sponsor" }',
      '######## stakeholders: { "name": "Steering Committee", "role": "Sponsor" }',
      '######## stakeholders: { "name": "Steering Committee", "role": "Sponsor" }',
      '######## stakeholders: { "name": "Steering Committee", "role": "Sponsor" }',
      '######## stakeholders: { "name": "New Stakeholder", "role": "Analyst" }',
    ].join('\n');

    const result = await InlineEntityParserService.parseAndProcess({
      projectId: 'p1',
      userId: 'u1',
      markdown,
      providedEntities: [
        { name: 'Steering Committee', type: 'stakeholder' },
      ],
    });

    expect(result.extractedCount).toBe(6);
    expect(result.contextConsistencyStats.consistencyWins).toBe(5);
    expect(result.contextConsistencyStats.totalOccurrences).toBe(6);
    expect(result.contextConsistencyStats.winsByEntity).toHaveLength(1);
    expect(result.contextConsistencyStats.winsByEntity[0].occurrences).toBe(5);
    expect(result.contextConsistencyStats.occurrenceConsistencyScore).toBe(83);
  });
});
