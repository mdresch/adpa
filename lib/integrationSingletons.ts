/** Server-configured integration types — at most one active record per deployment. */
export const SINGLETON_INTEGRATION_TYPES = new Set([
  "mongodb",
  "pinecone",
  "supabase",
  "neo4j",
])

export const CANONICAL_INTEGRATION_NAMES: Record<string, string> = {
  mongodb: "MongoDB Vector Store",
  pinecone: "Pinecone Vector Store",
  supabase: "Supabase",
  neo4j: "Neo4j",
}

type IntegrationRow = {
  id: string
  type: string
  name?: string
  is_active?: boolean
  last_sync?: string | null
  created_at?: string
  updated_at?: string
}

function canonicalScore(integration: IntegrationRow): number {
  let score = 0
  if (integration.is_active) score += 1_000_000
  const lastSync = integration.last_sync ? Date.parse(integration.last_sync) : 0
  if (!Number.isNaN(lastSync)) score += lastSync
  const updated = integration.updated_at ? Date.parse(integration.updated_at) : 0
  if (!Number.isNaN(updated)) score += updated / 1000
  return score
}

/** Pick the best row when multiple records exist for a singleton type. */
export function pickCanonicalIntegration<T extends IntegrationRow>(
  integrations: T[],
  type: string
): T | undefined {
  const matches = integrations.filter((i) => i.type === type)
  if (matches.length === 0) return undefined
  return matches.reduce((best, current) =>
    canonicalScore(current) > canonicalScore(best) ? current : best
  )
}

/** Collapse duplicate singleton rows to a single canonical card for the Overview list. */
export function dedupeSingletonIntegrations<T extends IntegrationRow>(
  integrations: T[]
): T[] {
  const singletons = new Map<string, T>()
  const rest: T[] = []

  for (const integration of integrations) {
    if (!SINGLETON_INTEGRATION_TYPES.has(integration.type)) {
      rest.push(integration)
      continue
    }

    const existing = singletons.get(integration.type)
    if (!existing) {
      singletons.set(integration.type, integration)
      continue
    }

    const canonical = pickCanonicalIntegration([existing, integration], integration.type)!
    singletons.set(integration.type, canonical)
  }

  const normalizedSingletons = Array.from(singletons.values()).map((integration) => {
    const displayName = CANONICAL_INTEGRATION_NAMES[integration.type]
    if (!displayName) return integration
    return { ...integration, name: displayName }
  })

  return [...rest, ...normalizedSingletons]
}

export function countSingletonDuplicates(
  integrations: IntegrationRow[],
  type: string
): number {
  const count = integrations.filter((i) => i.type === type).length
  return Math.max(0, count - 1)
}
