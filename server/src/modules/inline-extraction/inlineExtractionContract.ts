import { 
  hasInlineH8EntityTags, 
  stripInlineH8TagsForExport,
  InlineEntityParserService 
} from '../../services/inlineEntityParserService';

export async function validateInlineExtractionContract(): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 1. Parsing Resiliency - hasInlineH8EntityTags (REQ-001)
  const messyContent = `This is some regular document text.
######## risks: {"name": "Budget Overrun"}
Some other text here.
######## invalid_type: {"name": "Bad Entity"}`;
  
  if (!hasInlineH8EntityTags(messyContent)) {
    errors.push(`The 'hasInlineH8EntityTags' regex failed to identify H8 formatted entity blocks in raw markdown.`);
  }

  // 2. Parsing Resiliency - stripping tags (REQ-001)
  const stripped = stripInlineH8TagsForExport(messyContent);
  if (stripped.includes('######## risks')) {
    errors.push(`The 'stripInlineH8TagsForExport' failed to clean the H8 blocks from the output string.`);
  }

  // 3. Validation of Persistence Mocking (REQ-002 Dual Store)
  // We call parseAndProcess but override the persist flag to test the extraction grouping
  try {
    const parseResult = await InlineEntityParserService.parseAndProcess({
      projectId: 'test-project-123',
      userId: 'test-user-123',
      markdown: messyContent,
      persist: false // Testing extraction mapping only
    });

    // If it extracted 2, the second must be the invalid_type handled gracefully without crashing
    const validCount = parseResult.extractedCount;
    if (validCount === 2) {
      if (!parseResult.entitiesByType['invalid_type'] || parseResult.entitiesByType['invalid_type'].length !== 1) {
        errors.push(`Parser extracted 2 entities, but the invalid type was not handled gracefully in the entities output.`);
      }
    } else {
      errors.push(`Parser extracted ${validCount} entities, expected exactly 2 (risks and invalid_type handled gracefully).`);
    }

    if (!parseResult.entitiesByType['risks'] || parseResult.entitiesByType['risks'].length !== 1) {
      errors.push(`Parser failed to group the extracted 'risks' entity correctly.`);
    }
  } catch (err: any) {
    errors.push(`parseAndProcess crashed during extraction: ${err.message}`);
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
