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

    const pluralize = (singular: string): string => {
      const map: Record<string, string> = {
        'stakeholder': 'stakeholders',
        'deliverable': 'deliverables',
        'milestone': 'milestones',
        'risk': 'risks',
        'requirement': 'requirements',
        'activity': 'activities',
        'assumption': 'assumptions',
        'constraint': 'constraints',
        'dependency': 'dependencies',
        'resource': 'resources',
        'scope_item': 'scope_items',
        'success_criteria': 'success_criteria',
        'opportunity': 'opportunities',
        'work_item': 'work_items'
      }
      return map[singular] || (singular.endsWith('s') ? singular : singular + 's')
    }

    const res = await client.query(
      `SELECT id, document_id, entity_type, entity_data 
       FROM entity_extractions 
       WHERE project_id = $1 AND status = 'active'`,
      [projectId]
    )

    for (const row of res.rows) {
      const entityData = typeof row.entity_data === 'string' ? JSON.parse(row.entity_data) : (row.entity_data || {})
      const sourceDocIds = new Set<string>()
      if (row.document_id) sourceDocIds.add(row.document_id)
      if (Array.isArray(entityData.source_document_ids)) {
        entityData.source_document_ids.forEach((id: string) => sourceDocIds.add(id))
      }

      const typePlural = pluralize(row.entity_type)

      for (const docId of sourceDocIds) {
        addCounts(docId, typePlural, 1)
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


