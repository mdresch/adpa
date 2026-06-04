import { saveSingleEntityType } from './extraction/ExtractionOrchestrator';

function getSingularType(pluralType: string): string {
  const normalized = String(pluralType || '').toLowerCase().trim();
  const map: Record<string, string> = {
    'stakeholders': 'stakeholder',
    'risks': 'risk',
    'milestones': 'milestone',
    'deliverables': 'deliverable',
    'requirements': 'requirement',
    'activities': 'activity',
    'assumptions': 'assumption',
    'constraints': 'constraint',
    'dependencies': 'dependency',
    'resources': 'resource'
  };
  return map[normalized] || normalized;
}

function getEntityName(entity: any, type: string): string {
  if (!entity) return `Unnamed ${type}`;
  
  const rawName = entity.name || entity.title || entity.item_name || entity.description || '';
  const stringName = String(rawName).trim();
  
  if (stringName.length > 0) return stringName;
  return `Unnamed ${type}`;
}

export class InlineEntityParserService {
  /**
   * Parses inline entities from markdown text, groups them by entity type,
   * saves them to the database, and returns the cleaned markdown and count.
   */
  public static async parseAndProcess(params: {
    projectId: string;
    userId: string;
    documentId?: string;
    markdown: string;
    providedEntities?: Array<{ name: string; type: string }>;
  }): Promise<{ 
    cleanedMarkdown: string; 
    extractedCount: number; 
    extractedCountByType: Record<string, number>;
    entitiesByType: Record<string, any[]>
  }> {
    const { projectId, userId, documentId, providedEntities } = params;
    let { markdown } = params;

    if (!markdown) {
      return { cleanedMarkdown: '', extractedCount: 0, extractedCountByType: {}, entitiesByType: {} };
    }

    // Fix truncation artifacts: If a code block was started but never closed (due to LLM output limit), 
    // close it manually before processing to prevent regexes from matching the rest of the document.
    const codeBlockCount = (markdown.match(/^```/gm) || []).length;
    if (codeBlockCount % 2 !== 0) {
      markdown += "\n```";
      console.warn(`[PARSER] Found unclosed code block, manually closed at EOF to prevent truncation.`);
    }

    // Remove fenced code blocks that exclusively wrap our H8 entity tags.
    // Fixed: Using a safer regex that doesn't consume large chunks of the document.
    markdown = markdown.replace(/^```(?:json|markdown|md)?\s*\n(#{8}\s+[a-zA-Z0-9_-]+:(?:(?!```)[\s\S])*?)\n\s*```$/gm, '$1');

    const lines = markdown.split(/\r?\n/);
    const cleanedLines: string[] = [];
    const entityGroups: { [entityType: string]: any[] } = {};
    const extractedCountByType: Record<string, number> = {};
    let extractedCount = 0;

    let i = 0;
    while (i < lines.length) {
      let line = lines[i];
      const match = line.match(/^#{8}\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
      
      if (match) {
        const entityType = match[1];
        let jsonStr = match[2].trim();
        if (jsonStr.endsWith('\\')) jsonStr = jsonStr.slice(0, -1).trim();

        let parsedData = null;
        let consumedLines = 0;

        while (i + consumedLines < lines.length) {
          try {
            parsedData = JSON.parse(jsonStr);
            break; // Successfully parsed
          } catch (e) {
            consumedLines++;
            if (i + consumedLines >= lines.length) break;
            
            let nextLine = lines[i + consumedLines];
            if (nextLine.endsWith('\\')) nextLine = nextLine.slice(0, -1);
            jsonStr += "\n" + nextLine;
          }
        }

        if (parsedData) {
          if (!entityGroups[entityType]) {
            entityGroups[entityType] = [];
          }
          
          // Hallucination Check for database sync (Type-specific matching)
          const name = getEntityName(parsedData, entityType).toLowerCase();
          const singularType = getSingularType(entityType).toLowerCase();
          
          if (providedEntities) {
            const isTracked = providedEntities.some(p => {
              const pName = (p.name || "").toLowerCase().trim();
              const pType = (p.type || "").toLowerCase();
              return pName === name && (pType === singularType || pType === entityType.toLowerCase());
            });

            if (!isTracked) {
              parsedData._status = 'PENDING_REVIEW';
              parsedData._is_hallucination = true;
            }
          }

          entityGroups[entityType].push(parsedData);
          extractedCount++;
          extractedCountByType[entityType] = (extractedCountByType[entityType] || 0) + 1;
          
          // DO NOT SKIP. Retain the parsed H8 lines in the document for full traceability.
          for (let j = 0; j <= consumedLines; j++) {
            cleanedLines.push(lines[i + j]);
          }
          i += consumedLines + 1;
          continue;
        } else {
          console.error(`Failed to parse inline entity JSON for type ${entityType}`);
        }
      }
      
      cleanedLines.push(line);
      i++;
    }

    // Ensure registry is initialized
    const { extractionRegistry, initializeRegistry } = await import('./extraction/ExtractionRegistry');
    if (extractionRegistry.getRegisteredEntities().length === 0) {
      await initializeRegistry();
    }

    // Call saveSingleEntityType for each entity group
    for (const [entityType, entities] of Object.entries(entityGroups)) {
      if (entities.length > 0) {
        if (documentId) {
          entities.forEach((entity: any) => {
            entity.source_document_id = documentId;
          });
        }
        try {
          await saveSingleEntityType(projectId, userId, entityType, entities);
        } catch (err) {
          console.error(`Failed to save inline entities of type ${entityType}:`, err);
        }
      }
    }

    // Sync entities to the central entity_extractions table
    if (documentId) {
      try {
        const { entityExtractionService } = await import('./entityExtractionService');
        const extractedEntities: any[] = [];

        for (const [entityType, entities] of Object.entries(entityGroups)) {
          const singularType = getSingularType(entityType);
          
          for (const entity of entities) {
            extractedEntities.push({
              entity_type: singularType,
              entity_name: getEntityName(entity, singularType),
              entity_data: entity,
              extraction_confidence: 85, // Standard generation confidence
              source_document_id: documentId,
              extraction_method: 'ai',
              status: entity._status || 'active', // Mark as PENDING_REVIEW if hallucinated
              related_entity_ids: []
            });
          }
        }

        if (extractedEntities.length > 0) {
          await entityExtractionService.storeEntities(
            extractedEntities,
            projectId,
            documentId,
            { aiProvider: 'openai', aiModel: 'gpt-4' }
          );
        }
      } catch (err) {
        console.error('Failed to sync inline entities to entity_extractions table:', err);
      }
    }

    const cleanedMarkdown = cleanedLines.join('\n');
    return { cleanedMarkdown, extractedCount, extractedCountByType, entitiesByType: entityGroups };
  }


}
