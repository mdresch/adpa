import { saveSingleEntityType } from './extraction/ExtractionOrchestrator';

export class InlineEntityParserService {
  /**
   * Parses inline entities from markdown text, groups them by entity type,
   * saves them to the database, and returns the cleaned markdown and count.
   */
  public static async parseAndProcess(params: {
    projectId: string;
    userId: string;
    markdown: string;
  }): Promise<{ cleanedMarkdown: string; extractedCount: number }> {
    const { projectId, userId, markdown } = params;

    if (!markdown) {
      return { cleanedMarkdown: '', extractedCount: 0 };
    }

    const lines = markdown.split(/\r?\n/);
    const cleanedLines: string[] = [];
    const entityGroups: { [entityType: string]: any[] } = {};
    let extractedCount = 0;

    for (const line of lines) {
      // Match lines starting with 8 hashes: ######## entity_type: { json }
      const match = line.match(/^#{8}\s+([a-zA-Z0-9_-]+):\s*(.+)$/);
      if (match) {
        const entityType = match[1];
        const jsonStr = match[2].trim();
        try {
          const entity = JSON.parse(jsonStr);
          if (!entityGroups[entityType]) {
            entityGroups[entityType] = [];
          }
          entityGroups[entityType].push(entity);
          extractedCount++;
        } catch (error) {
          // Log error or handle parsing failure, still exclude it from the cleaned markdown
          console.error(`Failed to parse inline entity JSON: ${jsonStr}`, error);
        }
      } else {
        cleanedLines.push(line);
      }
    }

    // Call saveSingleEntityType for each entity group
    for (const [entityType, entities] of Object.entries(entityGroups)) {
      if (entities.length > 0) {
        await saveSingleEntityType(projectId, userId, entityType, entities);
      }
    }

    const cleanedMarkdown = cleanedLines.join('\n');
    return { cleanedMarkdown, extractedCount };
  }
}
