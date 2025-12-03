import { PoolClient } from 'pg'
import { pool } from '../database/connection'
import { getDomainTier, type PmbokDomain } from '@/types/pmbok'
import { ENTITY_DOMAIN_WEIGHTS, type EntityDomainWeight } from '@/types/entity-domain-weights'

type EntityCountsByDocument = Record<string, Record<string, number>>

export class DocumentPurposeService {
  /**
   * Rebuild entity_counts and inferred_*_domain fields for all documents in a project.
   * Intended to be called after a full extraction run completes.
   */
  static async rebuildForProject(projectId: string): Promise<void> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const countsByDoc = await this.computeEntityCountsForProject(client, projectId)

      for (const [documentId, counts] of Object.entries(countsByDoc)) {
        // Ensure total is present in counts JSON
        const total =
          typeof counts.total === 'number'
            ? counts.total
            : Object.entries(counts)
                .filter(([key]) => key !== 'total')
                .reduce((sum, [, value]) => sum + (Number(value) || 0), 0)

        counts.total = total

        const { primaryDomain, secondaryDomains } = this.assignKnowledgeDomainPurpose(counts)

        await client.query(
          `
          UPDATE documents
          SET
            entity_counts = $1,
            inferred_primary_domain = $2,
            inferred_secondary_domains = $3
          WHERE id = $4
          `,
          [counts, primaryDomain, JSON.stringify(secondaryDomains), documentId]
        )
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private static async computeEntityCountsForProject(
    client: PoolClient,
    projectId: string
  ): Promise<EntityCountsByDocument> {
    const countsByDoc: EntityCountsByDocument = {}

    const addCounts = (docId: string, entityType: string, count: number) => {
      if (!countsByDoc[docId]) {
        countsByDoc[docId] = {}
      }
      countsByDoc[docId][entityType] = (countsByDoc[docId][entityType] || 0) + count
      countsByDoc[docId].total = (countsByDoc[docId].total || 0) + count
    }

    const queries: Array<{ entityType: string; sql: string }> = [
      { entityType: 'stakeholders', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM stakeholders WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'requirements', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM requirements WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'risks', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM risks WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'milestones', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM milestones WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'constraints', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM constraints WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'success_criteria', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM success_criteria WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'best_practices', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM best_practices WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'phases', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM phases WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'resources', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM resources WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'technologies', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM technologies WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'quality_standards', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM quality_standards WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'deliverables', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM deliverables WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'scope_items', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM scope_items WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'activities', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM activities WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'team_agreements', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM team_agreements WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'development_approaches', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM development_approaches WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'project_iterations', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM project_iterations WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'work_items', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM work_items WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'capacity_plans', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM capacity_plans WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'performance_measurements', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM performance_measurements WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'earned_value_metrics', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM earned_value_metrics WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'opportunities', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM opportunities WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'risk_responses', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM risk_responses WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' },
      { entityType: 'performance_actuals', sql: 'SELECT source_document_id AS document_id, COUNT(*)::int AS count FROM performance_actuals WHERE project_id = $1 AND source_document_id IS NOT NULL GROUP BY source_document_id' }
    ]

    for (const { entityType, sql } of queries) {
      const res = await client.query(sql, [projectId])
      for (const row of res.rows) {
        const docId: string | null = row.document_id
        const count: number = Number(row.count) || 0
        if (!docId || !count) continue
        addCounts(docId, entityType, count)
      }
    }

    return countsByDoc
  }

  private static assignKnowledgeDomainPurpose(entityCounts: Record<string, number>): {
    primaryDomain: string | null
    secondaryDomains: string[]
  } {
    const knowledgeCoverage: Record<string, number> = {}

    for (const [entityType, countRaw] of Object.entries(entityCounts)) {
      if (entityType === 'total') continue
      const count = Number(countRaw)
      if (!count || count <= 0) continue

      const weights: EntityDomainWeight[] =
        ENTITY_DOMAIN_WEIGHTS[entityType] ||
        ENTITY_DOMAIN_WEIGHTS[
          entityType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
        ] ||
        []

      if (!weights.length) continue

      for (const w of weights) {
        const tier = getDomainTier(w.domain as PmbokDomain)
        if (tier !== 'knowledge') continue
        const increment = count * w.weight
        knowledgeCoverage[w.domain] = (knowledgeCoverage[w.domain] || 0) + increment
      }
    }

    const total = Object.values(knowledgeCoverage).reduce((sum, v) => sum + v, 0) || 1
    const normalized: Record<string, number> = {}
    for (const [domain, value] of Object.entries(knowledgeCoverage)) {
      normalized[domain] = value / total
    }

    let primaryDomain: string | null = null
    let bestVal = 0
    for (const [domain, value] of Object.entries(normalized)) {
      if (value > bestVal) {
        bestVal = value
        primaryDomain = domain
      }
    }

    const secondaryDomains = Object.entries(normalized)
      .filter(([domain, value]) => domain !== primaryDomain && value >= 0.2)
      .map(([domain]) => domain)

    return { primaryDomain, secondaryDomains }
  }
}

export default DocumentPurposeService;


