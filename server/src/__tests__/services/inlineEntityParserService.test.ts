import { InlineEntityParserService } from '../../services/inlineEntityParserService';
import { saveSingleEntityType } from '../../services/extraction/ExtractionOrchestrator';

jest.mock('../../services/extraction/ExtractionOrchestrator', () => ({
  saveSingleEntityType: jest.fn().mockResolvedValue({ saved: 1, skipped: 0, failed: 0 }),
}));

describe('InlineEntityParserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
