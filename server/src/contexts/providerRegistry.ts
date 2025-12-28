import { ProviderAdapter } from './types'
import { confluenceAdapterFactory } from './adapters/confluenceAdapter'
import { jiraAdapterFactory } from './adapters/jiraAdapter'

export type ProviderName = 'confluence' | 'jira'

const registry: Record<ProviderName, () => ProviderAdapter> = {
  confluence: confluenceAdapterFactory,
  jira: jiraAdapterFactory,
}

export function getProviderAdapter(name: ProviderName): ProviderAdapter {
  const factory = registry[name]
  if (!factory) throw new Error(`Unknown provider: ${name}`)
  return factory()
}
