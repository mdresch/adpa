import type { Pool } from 'pg';
import { logger } from '../utils/logger';

export interface PineconeEntityRow {
  id: string;
  entity_type: string;
  name: string;
  project_id: string;
  source_document_id: string | null;
  source_document_title: string;
  description: string;
  confidence: number;
  created_at: string;
}

type EntityFetchDefinition = {
  entityType: string;
  sql: string;
};

/**
 * Typed domain tables synced into Pinecone `entities` namespace.
 * Each row includes project_id, entity_type, and document source origin.
 */
const ENTITY_FETCH_DEFINITIONS: EntityFetchDefinition[] = [
  {
    entityType: 'stakeholders',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(NULLIF(name, ''), role, 'Unnamed stakeholder') AS entity_name,
      LEFT(TRIM(COALESCE(role, '') || ' ' || COALESCE(expectations, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM stakeholders WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'requirements',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(NULLIF(name, ''), title, 'Unnamed requirement') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM requirements WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'risks',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed risk') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM risks WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'milestones',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed milestone') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM milestones WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'constraints',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(NULLIF(name, ''), title, 'Unnamed constraint') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM constraints WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'success_criteria',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed success criterion') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM success_criteria WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'best_practices',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed best practice') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM best_practices WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'phases',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed phase') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM phases WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'resources',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed resource') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM resources WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'technologies',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed technology') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM technologies WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'quality_standards',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed quality standard') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM quality_standards WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'deliverables',
    sql: `SELECT id, project_id,
      COALESCE(source_document_id, extracted_from_document_id) AS source_document_id,
      COALESCE(name, 'Unnamed deliverable') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, confidence_score
      FROM deliverables WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'scope_items',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed scope item') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM scope_items WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'activities',
    sql: `SELECT id, project_id,
      COALESCE(source_document_id, extracted_from_document_id) AS source_document_id,
      COALESCE(NULLIF(name, ''), activity_name, 'Unnamed activity') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, confidence_score
      FROM activities WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'team_agreements',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed team agreement') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM team_agreements WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'development_approaches',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed development approach') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM development_approaches WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'project_iterations',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed iteration') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM project_iterations WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'work_items',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed work item') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM work_items WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'capacity_plans',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed capacity plan') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM capacity_plans WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'performance_measurements',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed performance measurement') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM performance_measurements WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'earned_value_metrics',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed earned value metric') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM earned_value_metrics WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'opportunities',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed opportunity') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM opportunities WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'risk_responses',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed risk response') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM risk_responses WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
  {
    entityType: 'performance_actuals',
    sql: `SELECT id, project_id, source_document_id,
      COALESCE(name, 'Unnamed performance actual') AS entity_name,
      LEFT(TRIM(COALESCE(description, '') || ' ' || COALESCE(source_snippet, '')), 1500) AS entity_text,
      created_at, NULL::numeric AS confidence_score
      FROM performance_actuals WHERE ($1::uuid IS NULL OR project_id = $1)`,
  },
];

async function loadDocumentTitles(
  pgPool: Pool,
  documentIds: string[]
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  if (documentIds.length === 0) return titles;

  const uniqueIds = [...new Set(documentIds.filter(Boolean))];
  const chunkSize = 500;

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const result = await pgPool.query<{ id: string; title: string }>(
      `SELECT id, COALESCE(NULLIF(title, ''), name, 'Untitled document') AS title
       FROM documents
       WHERE id = ANY($1::uuid[])`,
      [chunk]
    );
    for (const row of result.rows) {
      titles.set(row.id, row.title);
    }
  }

  return titles;
}

export async function fetchEntitiesForPinecone(
  pgPool: Pool,
  projectId?: string
): Promise<PineconeEntityRow[]> {
  const projectParam = projectId ?? null;
  const rows: PineconeEntityRow[] = [];
  const documentIds: string[] = [];

  for (const definition of ENTITY_FETCH_DEFINITIONS) {
    try {
      const result = await pgPool.query(definition.sql, [projectParam]);
      for (const row of result.rows) {
        const sourceDocumentId = row.source_document_id ?? null;
        if (sourceDocumentId) {
          documentIds.push(sourceDocumentId);
        }

        rows.push({
          id: String(row.id),
          entity_type: definition.entityType,
          name: String(row.entity_name ?? '').trim() || definition.entityType,
          project_id: String(row.project_id),
          source_document_id: sourceDocumentId,
          source_document_title: '',
          description: String(row.entity_text ?? '').trim(),
          confidence: row.confidence_score != null ? Number(row.confidence_score) : 0.85,
          created_at: row.created_at
            ? new Date(row.created_at).toISOString()
            : new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.debug('Skipping Pinecone entity table during sync', {
        entityType: definition.entityType,
        error: (error as Error).message,
      });
    }
  }

  const documentTitles = await loadDocumentTitles(pgPool, documentIds);
  for (const row of rows) {
    if (row.source_document_id) {
      row.source_document_title = documentTitles.get(row.source_document_id) ?? '';
    }
  }

  logger.info('Fetched entities for Pinecone sync', {
    projectId: projectId ?? 'all',
    total: rows.length,
    byType: rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.entity_type] = (acc[row.entity_type] ?? 0) + 1;
      return acc;
    }, {}),
  });

  return rows;
}

export function entityRowToPineconeRecord(entity: PineconeEntityRow) {
  const sourceLabel = entity.source_document_title || entity.source_document_id || '';
  const text = [
    entity.name,
    entity.entity_type.replace(/_/g, ' '),
    entity.description,
    sourceLabel ? `Source document: ${sourceLabel}` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    _id: `entity_${entity.entity_type}_${entity.id}`,
    text,
    type: 'entity',
    name: entity.name,
    entity_type: entity.entity_type,
    project_id: entity.project_id,
    source_document_id: entity.source_document_id ?? '',
    source_document_title: entity.source_document_title,
    document_id: entity.source_document_id ?? '',
    confidence: entity.confidence,
    created_at: entity.created_at,
  };
}
