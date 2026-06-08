import { saveSingleEntityType } from './extraction/ExtractionOrchestrator';
import { areEntitiesFuzzyMatch } from './entityExtractionService';
import {
  computeEntityExtractionQuality,
  type EntityExtractionQuality,
} from '../modules/analysis/entityExtractionQuality';

export type { EntityExtractionQuality };

export interface ContextConsistencyWin {
  name: string;
  type: string;
  occurrences: number;
  matchScore: number;
  method: string;
  matchedContextName: string;
}

export interface ContextConsistencyStats {
  /** Total H8 inline tags parsed in this document */
  totalOccurrences: number;
  /** Each matched H8 tag counts as one consistency win */
  consistencyWins: number;
  uniqueEntitiesTagged: number;
  uniqueContextEntitiesReused: number;
  /** Percentage of H8 tags that reused provided context */
  occurrenceConsistencyScore: number;
  winsByEntity: ContextConsistencyWin[];
}

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
    'resources': 'resource',
    'wbs_nodes': 'wbs_node',
    'scope_baselines': 'scope_baseline',
    'scope_change_requests': 'scope_change_request',
  };
  return map[normalized] || normalized;
}

/** LLMs often markdown-escape brackets inside JSON values (e.g. `\[TBD - Role\]`), which is invalid JSON. */
export function repairInlineEntityJson(jsonStr: string): string {
  return jsonStr.replace(/\\([\[\]])/g, '$1');
}

function parseInlineEntityJson(jsonStr: string): unknown | null {
  try {
    return JSON.parse(jsonStr);
  } catch {
    try {
      return JSON.parse(repairInlineEntityJson(jsonStr));
    } catch {
      return null;
    }
  }
}

/** Matches a single H8 inline entity tag line: `######## entity_type: {...}` */
export const INLINE_H8_ENTITY_LINE_REGEX = /^#{8}\s+([a-zA-Z0-9_-]+):\s*(.*)$/;

/** LLM sometimes omits ######## and chains tags with backslashes: `type: {...}\type: {...}` */
const INLINE_LOOSE_ENTITY_SEGMENT_REGEX = /^([a-z][a-z0-9_-]*):\s*(\{[\s\S]*)$/i;

/** Split chained loose tags: `}{...\}\resources: {` */
const INLINE_CHAINED_LOOSE_TAG_SPLIT_REGEX = /(?<=\})\s*\\(?=\s*[a-z][a-z0-9_-]*:\s*\{)/i;

function lineHasLooseEntityTags(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || INLINE_H8_ENTITY_LINE_REGEX.test(trimmed)) return false;
  if (INLINE_LOOSE_ENTITY_SEGMENT_REGEX.test(trimmed)) return true;
  return /\}\s*\\[a-z][a-z0-9_-]*:\s*\{/i.test(trimmed);
}

function normalizeLooseEntitySegment(segment: string): string | null {
  let trimmed = segment.trim();
  if (!trimmed) return null;
  if (trimmed.endsWith('\\')) trimmed = trimmed.slice(0, -1).trim();

  const h8Match = trimmed.match(INLINE_H8_ENTITY_LINE_REGEX);
  if (h8Match) return trimmed;

  const looseMatch = trimmed.match(INLINE_LOOSE_ENTITY_SEGMENT_REGEX);
  if (!looseMatch) return null;

  return `######## ${looseMatch[1]}: ${looseMatch[2]}`;
}

/**
 * Repair common LLM formatting mistakes: missing ######## prefix and backslash-chained tags on one line.
 */
export function normalizeInlineEntityMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const normalizedLines: string[] = [];

  for (const line of lines) {
    if (!lineHasLooseEntityTags(line)) {
      normalizedLines.push(line);
      continue;
    }

    const parts = line.split(INLINE_CHAINED_LOOSE_TAG_SPLIT_REGEX);
    if (parts.length === 1) {
      const normalized = normalizeLooseEntitySegment(line);
      normalizedLines.push(normalized ?? line);
      continue;
    }

    for (const part of parts) {
      const normalized = normalizeLooseEntitySegment(part);
      if (normalized) normalizedLines.push(normalized);
    }
  }

  return normalizedLines.join('\n');
}

export function hasInlineH8EntityTags(markdown: string | null | undefined): boolean {
  if (!markdown) return false;
  return markdown.split(/\r?\n/).some(
    (line) => INLINE_H8_ENTITY_LINE_REGEX.test(line) || lineHasLooseEntityTags(line)
  );
}

function getEntityName(entity: any, type: string): string {
  if (!entity) return `Unnamed ${type}`;

  const rawName =
    entity.name ||
    entity.title ||
    entity.item_name ||
    entity.reserve_name ||
    entity.risk_title ||
    entity.plan_name ||
    entity.metric_name ||
    entity.checklist_name ||
    entity.tranche_name ||
    entity.policy_name ||
    entity.description ||
    '';
  const stringName = String(rawName).trim();

  if (stringName.length > 0) return stringName;
  return `Unnamed ${type}`;
}

function typesAlign(providedType: string, singularType: string, pluralType: string): boolean {
  const p = providedType.toLowerCase().trim();
  return p === singularType || p === pluralType.toLowerCase() || p === `${singularType}s`;
}

function computeContextConsistencyStats(
  occurrences: Array<{ name: string; type: string; pluralType: string }>,
  providedEntities?: Array<{ name: string; type: string }>
): ContextConsistencyStats {
  if (occurrences.length === 0) {
    return {
      totalOccurrences: 0,
      consistencyWins: 0,
      uniqueEntitiesTagged: 0,
      uniqueContextEntitiesReused: 0,
      occurrenceConsistencyScore: 0,
      winsByEntity: [],
    };
  }

  const winMap = new Map<string, ContextConsistencyWin>();
  const uniqueTagged = new Set<string>();
  const uniqueReused = new Set<string>();
  let consistencyWins = 0;

  for (const occ of occurrences) {
    const tagKey = `${occ.type}::${occ.name.toLowerCase().trim()}`;
    uniqueTagged.add(tagKey);

    if (!providedEntities?.length) continue;

    let bestMatch: ReturnType<typeof areEntitiesFuzzyMatch> | null = null;
    let matchedProvided: { name: string; type: string } | null = null;

    for (const provided of providedEntities) {
      if (!provided?.name) continue;
      if (!typesAlign(provided.type || '', occ.type, occ.pluralType)) continue;
      const match = areEntitiesFuzzyMatch(occ.name, provided.name);
      if (match.isMatch && (!bestMatch || match.score > bestMatch.score)) {
        bestMatch = match;
        matchedProvided = provided;
      }
    }

    if (!bestMatch?.isMatch || !matchedProvided) continue;

    consistencyWins++;
    const reuseKey = `${occ.type}::${matchedProvided.name.toLowerCase().trim()}`;
    uniqueReused.add(reuseKey);

    const existing = winMap.get(reuseKey);
    if (existing) {
      existing.occurrences++;
      if (bestMatch.score > existing.matchScore) {
        existing.matchScore = bestMatch.score;
        existing.method = bestMatch.method;
      }
    } else {
      winMap.set(reuseKey, {
        name: matchedProvided.name,
        type: matchedProvided.type || occ.type,
        occurrences: 1,
        matchScore: bestMatch.score,
        method: bestMatch.method,
        matchedContextName: matchedProvided.name,
      });
    }
  }

  const winsByEntity = Array.from(winMap.values()).sort((a, b) => b.occurrences - a.occurrences);
  const occurrenceConsistencyScore =
    occurrences.length > 0 ? Math.round((consistencyWins / occurrences.length) * 100) : 0;

  return {
    totalOccurrences: occurrences.length,
    consistencyWins,
    uniqueEntitiesTagged: uniqueTagged.size,
    uniqueContextEntitiesReused: uniqueReused.size,
    occurrenceConsistencyScore,
    winsByEntity,
  };
}

export class InlineEntityParserService {
  /**
   * Parses inline entities from markdown text, groups them by entity type,
   * saves them to the database, and returns the cleaned markdown and count.
   */
  public static async parseAndProcess(params: {
    projectId: string;
    userId: string | null;
    documentId?: string;
    markdown: string;
    providedEntities?: Array<{ name: string; type: string }>;
    templateName?: string | null;
    templateCategory?: string | null;
    wordCount?: number | null;
    /** When false, parse and group entities only — no DB persistence (use save-inline-entities job). */
    persist?: boolean;
  }): Promise<{ 
    cleanedMarkdown: string; 
    extractedCount: number; 
    extractedCountByType: Record<string, number>;
    entitiesByType: Record<string, any[]>;
    contextConsistencyStats: ContextConsistencyStats;
    entityExtractionQuality: EntityExtractionQuality;
  }> {
    const { projectId, userId, documentId, providedEntities, templateName, templateCategory, wordCount, persist = true } = params;
    let { markdown } = params;

    const emptyStats: ContextConsistencyStats = {
      totalOccurrences: 0,
      consistencyWins: 0,
      uniqueEntitiesTagged: 0,
      uniqueContextEntitiesReused: 0,
      occurrenceConsistencyScore: 0,
      winsByEntity: [],
    };

    const emptyQuality = computeEntityExtractionQuality({
      extractedCountByType: {},
      contextGroundedScore: 0,
      contextBackedTagCount: 0,
      totalTagCount: 0,
      templateName,
      templateCategory,
      wordCount,
    });

    if (!markdown) {
      return {
        cleanedMarkdown: '',
        extractedCount: 0,
        extractedCountByType: {},
        entitiesByType: {},
        contextConsistencyStats: emptyStats,
        entityExtractionQuality: emptyQuality,
      };
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

    markdown = normalizeInlineEntityMarkdown(markdown);

    const lines = markdown.split(/\r?\n/);
    const cleanedLines: string[] = [];
    const entityGroups: { [entityType: string]: any[] } = {};
    const extractedCountByType: Record<string, number> = {};
    const tagOccurrences: Array<{ name: string; type: string; pluralType: string }> = [];
    let extractedCount = 0;

    let i = 0;
    while (i < lines.length) {
      let line = lines[i];
      const match = line.match(INLINE_H8_ENTITY_LINE_REGEX);
      
      if (match) {
        const entityType = match[1];
        let jsonStr = match[2].trim();
        if (jsonStr.endsWith('\\')) jsonStr = jsonStr.slice(0, -1).trim();

        let parsedData = null;
        let consumedLines = 0;

        while (i + consumedLines < lines.length) {
          parsedData = parseInlineEntityJson(jsonStr);
          if (parsedData) break;

          consumedLines++;
          if (i + consumedLines >= lines.length) break;

          let nextLine = lines[i + consumedLines];
          if (nextLine.endsWith('\\')) nextLine = nextLine.slice(0, -1);
          jsonStr += "\n" + nextLine;
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
          tagOccurrences.push({
            name: getEntityName(parsedData, entityType),
            type: singularType,
            pluralType: entityType,
          });
          
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

    const persistFailures: string[] = [];

    if (persist) {
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
            const message =
              err instanceof Error ? err.message : String(err);
            persistFailures.push(`${entityType}: ${message}`);
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
                extraction_confidence: 85,
                source_document_id: documentId,
                extraction_method: 'inline_h8',
                status: 'active',
                related_entity_ids: []
              });
            }
          }

          if (extractedEntities.length > 0) {
            await entityExtractionService.storeEntities(
              extractedEntities,
              projectId,
              documentId,
              { aiProvider: 'inline', aiModel: 'h8-parser' }
            );
          }
        } catch (err) {
          console.error('Failed to sync inline entities to entity_extractions table:', err);
        }
      }
    }

    const cleanedMarkdown = cleanedLines.join('\n');
    const contextConsistencyStats = computeContextConsistencyStats(tagOccurrences, providedEntities);
    const entityExtractionQuality = computeEntityExtractionQuality({
      extractedCountByType,
      contextGroundedScore: contextConsistencyStats.occurrenceConsistencyScore,
      contextBackedTagCount: contextConsistencyStats.consistencyWins,
      totalTagCount: contextConsistencyStats.totalOccurrences,
      templateName,
      templateCategory,
      wordCount,
    });

    return {
      cleanedMarkdown,
      extractedCount,
      extractedCountByType,
      entitiesByType: entityGroups,
      contextConsistencyStats,
      entityExtractionQuality,
      persistFailures,
    };
  }


}
