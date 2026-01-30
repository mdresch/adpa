/**
 * GKG Context Service
 * Fetches semantic units from the Governance Knowledge Graph by template strategy
 * for use as LLM context during document generation.
 * See docs/07-architecture/GKG_CONTEXT_STRATEGY.md and GKG_SCHEMA.md.
 */

import { getNeo4jDriver, getNeo4jDatabase, isNeo4jConfigured } from '../../utils/neo4j'
import { logger } from '../../utils/logger'
import type {
  GkgContextStrategy,
  GkgContextProfile,
  GkgContextScope,
  GkgDocumentStatusFilter,
} from '../../modules/documentTemplates/types'

/** Document statuses treated as approved/published for GKG context filtering. */
const APPROVED_PUBLISHED_STATUSES = ['approved', 'published']

export interface GkgContextResult {
  markdown: string
  unitsCount: number
  documentsCount: number
  entityTypes: string[]
}

const PROFILE_ENTITY_TYPES: Record<GkgContextProfile, string[]> = {
  governance_full: ['Requirement', 'Risk', 'Stakeholder', 'Milestone', 'Constraint', 'Deliverable'],
  charter_light: ['Requirement', 'Risk', 'Stakeholder'],
  requirements_only: ['Requirement'],
  risks_only: ['Risk'],
  stakeholders_only: ['Stakeholder'],
  custom: [], // caller must provide entityTypes
}

function resolveEntityTypes(strategy: GkgContextStrategy): string[] {
  if (strategy.entityTypes?.length) return strategy.entityTypes
  if (strategy.profile && strategy.profile !== 'custom') {
    return PROFILE_ENTITY_TYPES[strategy.profile] ?? []
  }
  return []
}

function resolveScope(strategy: GkgContextStrategy): GkgContextScope {
  return strategy.scope ?? 'same_project'
}

/**
 * Fetch LLM-ready context from the GKG for a project using the template's strategy.
 * Returns markdown built from semantic unit summaries (and payload snippets).
 */
export async function getContextForStrategy(
  projectId: string,
  strategy: GkgContextStrategy,
  _options?: { userId?: string; projectIds?: string[] }
): Promise<GkgContextResult> {
  const entityTypes = resolveEntityTypes(strategy)
  const scope = resolveScope(strategy)
  const maxUnits = strategy.maxUnits ?? 500
  const maxDocuments = strategy.maxDocuments ?? 10
  const traceableOnly = strategy.traceableOnly ?? false
  const documentStatusFilter: GkgDocumentStatusFilter | undefined = strategy.documentStatusFilter

  if (!isNeo4jConfigured()) {
    logger.debug('[GKG Context] Neo4j not configured; returning empty context')
    return { markdown: '', unitsCount: 0, documentsCount: 0, entityTypes }
  }

  const driver = getNeo4jDriver()
  if (!driver) {
    logger.warn('[GKG Context] Neo4j driver unavailable')
    return { markdown: '', unitsCount: 0, documentsCount: 0, entityTypes }
  }

  const database = getNeo4jDatabase()
  const session = driver.session({ database })

  try {
    let units: Array<{ entityType: string; summary: string; payload?: string }> = []

    if (scope === 'same_project_top_docs' && maxDocuments > 0) {
      units = await queryByTopDocs(session, projectId, entityTypes, maxDocuments, maxUnits, traceableOnly, documentStatusFilter)
    } else if (scope === 'dependent_projects') {
      units = await queryByDependentProjects(session, projectId, entityTypes, maxUnits, traceableOnly, documentStatusFilter)
    } else if (scope === 'all_accessible' && _options?.projectIds?.length) {
      units = await queryByProjectIds(session, _options.projectIds, entityTypes, maxUnits, traceableOnly, documentStatusFilter)
    } else {
      // same_project or fallback
      units = await queryByProject(session, projectId, entityTypes, maxUnits, traceableOnly, documentStatusFilter)
    }

    const markdown = units
      .map((u) => {
        let line = `- **${u.entityType}**: ${u.summary || '(no summary)'}`
        if (u.payload) line += ` ${u.payload}`
        return line
      })
      .join('\n')

    const docCount = 0
    const header =
      units.length > 0
        ? `## Governance Knowledge Graph context (${units.length} units)\n\n`
        : ''
    const fullMarkdown = header + (markdown || '(No semantic units matched the strategy.)')

    logger.info('[GKG Context] Fetched context', {
      projectId,
      scope,
      entityTypes: entityTypes.length,
      unitsCount: units.length,
    })

    return {
      markdown: fullMarkdown,
      unitsCount: units.length,
      documentsCount: docCount,
      entityTypes,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[GKG Context] Query failed', { projectId, error: msg })
    return { markdown: '', unitsCount: 0, documentsCount: 0, entityTypes }
  } finally {
    await session.close()
  }
}

async function queryByProject(
  session: { run: (q: string, p: Record<string, unknown>) => Promise<{ records: any[] }> },
  projectId: string,
  entityTypes: string[],
  maxUnits: number,
  traceableOnly: boolean,
  documentStatusFilter?: GkgDocumentStatusFilter
): Promise<Array<{ entityType: string; summary: string; payload?: string }>> {
  const entityFilter =
    entityTypes.length > 0
      ? ' AND u.adpa_entity_type IN $entityTypes'
      : ''
  const approvedOnly = documentStatusFilter === 'approved_published_only'
  const traceable = !approvedOnly && traceableOnly
    ? ' AND EXISTS { (u)-[:EXTRACTED_FROM]->(:Document) }'
    : ''
  const docStatusMatch = approvedOnly
    ? ' MATCH (u)-[:EXTRACTED_FROM]->(d:Document) WHERE d.status IN $approvedStatuses'
    : ' OPTIONAL MATCH (u)-[:EXTRACTED_FROM]->(d:Document)'
  const docStatusWith = approvedOnly ? ' WITH u' : ' WITH u, d'

  const q = `
    MATCH (p:Project)
    WHERE p.adpa_id = $projectId
    MATCH (u:SemanticUnit)-[:BELONGS_TO]->(p)
    WHERE 1=1 ${entityFilter} ${traceable}
    ${docStatusMatch}
    ${docStatusWith}
    WITH u
    ORDER BY u.adpa_id
    LIMIT $maxUnits
    RETURN u.adpa_entity_type AS entityType,
           u.summary AS summary,
           u.payload AS payload
  `
  const result = await session.run(q, {
    projectId,
    entityTypes: entityTypes.length ? entityTypes : null,
    maxUnits,
    approvedStatuses: approvedOnly ? APPROVED_PUBLISHED_STATUSES : null,
  })
  return result.records.map((r) => ({
    entityType: r.get('entityType') ?? 'Unknown',
    summary: r.get('summary') ?? '',
    payload: typeof r.get('payload') === 'string' ? r.get('payload') : JSON.stringify(r.get('payload') ?? ''),
  }))
}

async function queryByTopDocs(
  session: { run: (q: string, p: Record<string, unknown>) => Promise<{ records: any[] }> },
  projectId: string,
  entityTypes: string[],
  maxDocuments: number,
  maxUnits: number,
  _traceableOnly: boolean,
  documentStatusFilter?: GkgDocumentStatusFilter
): Promise<Array<{ entityType: string; summary: string; payload?: string }>> {
  const entityFilter =
    entityTypes.length > 0
      ? ' AND u.adpa_entity_type IN $entityTypes'
      : ''
  const approvedOnly = documentStatusFilter === 'approved_published_only'
  const docStatusWhere = approvedOnly
    ? ' WHERE d.status IN $approvedStatuses'
    : ''
  const q = `
    MATCH (p:Project)
    WHERE p.adpa_id = $projectId
    MATCH (d:Document)-[:BELONGS_TO]->(p)${docStatusWhere}
    MATCH (u:SemanticUnit)-[:EXTRACTED_FROM]->(d)
    WHERE 1=1 ${entityFilter}
    WITH d, count(u) AS uc
    ORDER BY uc DESC
    LIMIT $maxDocuments
    MATCH (u2:SemanticUnit)-[:EXTRACTED_FROM]->(d)
    WHERE 1=1 ${entityFilter}
    WITH u2
    LIMIT $maxUnits
    RETURN u2.adpa_entity_type AS entityType, u2.summary AS summary, u2.payload AS payload
  `
  const result = await session.run(q, {
    projectId,
    entityTypes: entityTypes.length ? entityTypes : null,
    maxDocuments,
    maxUnits,
    approvedStatuses: approvedOnly ? APPROVED_PUBLISHED_STATUSES : null,
  })
  return result.records.map((r) => ({
    entityType: r.get('entityType') ?? 'Unknown',
    summary: r.get('summary') ?? '',
    payload: typeof r.get('payload') === 'string' ? r.get('payload') : JSON.stringify(r.get('payload') ?? ''),
  }))
}

async function queryByDependentProjects(
  session: { run: (q: string, p: Record<string, unknown>) => Promise<{ records: any[] }> },
  projectId: string,
  entityTypes: string[],
  maxUnits: number,
  traceableOnly: boolean,
  documentStatusFilter?: GkgDocumentStatusFilter
): Promise<Array<{ entityType: string; summary: string; payload?: string }>> {
  const entityFilter =
    entityTypes.length > 0
      ? ' AND u.adpa_entity_type IN $entityTypes'
      : ''
  const approvedOnly = documentStatusFilter === 'approved_published_only'
  const traceable = !approvedOnly && traceableOnly
    ? ' AND EXISTS { (u)-[:EXTRACTED_FROM]->(:Document) }'
    : ''
  const docStatusMatch = approvedOnly
    ? ' MATCH (u)-[:EXTRACTED_FROM]->(d:Document) WHERE d.status IN $approvedStatuses'
    : ''

  const q = `
    MATCH (p:Project)
    WHERE p.adpa_id = $projectId
    OPTIONAL MATCH (p)-[:DEPENDS_ON*1..2]->(dep:Project)
    WITH collect(DISTINCT dep.adpa_id) AS depIds, p.adpa_id AS mainId
    WITH [mainId] + depIds AS projectIds
    UNWIND projectIds AS pid
    MATCH (u:SemanticUnit)-[:BELONGS_TO]->(proj:Project)
    WHERE proj.adpa_id = pid ${entityFilter} ${traceable}
    ${docStatusMatch}
    WITH u
    LIMIT $maxUnits
    RETURN u.adpa_entity_type AS entityType, u.summary AS summary, u.payload AS payload
  `
  const result = await session.run(q, {
    projectId,
    entityTypes: entityTypes.length ? entityTypes : null,
    maxUnits,
    approvedStatuses: approvedOnly ? APPROVED_PUBLISHED_STATUSES : null,
  })
  return result.records.map((r) => ({
    entityType: r.get('entityType') ?? 'Unknown',
    summary: r.get('summary') ?? '',
    payload: typeof r.get('payload') === 'string' ? r.get('payload') : JSON.stringify(r.get('payload') ?? ''),
  }))
}

async function queryByProjectIds(
  session: { run: (q: string, p: Record<string, unknown>) => Promise<{ records: any[] }> },
  projectIds: string[],
  entityTypes: string[],
  maxUnits: number,
  traceableOnly: boolean,
  documentStatusFilter?: GkgDocumentStatusFilter
): Promise<Array<{ entityType: string; summary: string; payload?: string }>> {
  const entityFilter =
    entityTypes.length > 0
      ? ' AND u.adpa_entity_type IN $entityTypes'
      : ''
  const approvedOnly = documentStatusFilter === 'approved_published_only'
  const traceable = !approvedOnly && traceableOnly
    ? ' AND EXISTS { (u)-[:EXTRACTED_FROM]->(:Document) }'
    : ''
  const docStatusMatch = approvedOnly
    ? ' MATCH (u)-[:EXTRACTED_FROM]->(d:Document) WHERE d.status IN $approvedStatuses'
    : ''

  const q = `
    UNWIND $projectIds AS pid
    MATCH (u:SemanticUnit)-[:BELONGS_TO]->(p:Project)
    WHERE p.adpa_id = pid ${entityFilter} ${traceable}
    ${docStatusMatch}
    WITH u
    LIMIT $maxUnits
    RETURN u.adpa_entity_type AS entityType, u.summary AS summary, u.payload AS payload
  `
  const result = await session.run(q, {
    projectIds,
    entityTypes: entityTypes.length ? entityTypes : null,
    maxUnits,
    approvedStatuses: approvedOnly ? APPROVED_PUBLISHED_STATUSES : null,
  })
  return result.records.map((r) => ({
    entityType: r.get('entityType') ?? 'Unknown',
    summary: r.get('summary') ?? '',
    payload: typeof r.get('payload') === 'string' ? r.get('payload') : JSON.stringify(r.get('payload') ?? ''),
  }))
}
