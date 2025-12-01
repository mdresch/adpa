export const PMBOK_PERFORMANCE_DOMAINS = [
  "stakeholders",
  "team",
  "development_approach",
  "planning",
  "project_work",
  "delivery",
  "measurement",
  "uncertainty",
] as const

export const PMBOK_KNOWLEDGE_DOMAINS = [
  "governance",
  "scope",
  "schedule",
  "finance",
  "resources",
  "risk",
  "stakeholders_ops",
] as const

export const PMBOK_DOMAINS = [
  ...PMBOK_PERFORMANCE_DOMAINS,
  ...PMBOK_KNOWLEDGE_DOMAINS,
] as const

export type PmbokPerformanceDomain = (typeof PMBOK_PERFORMANCE_DOMAINS)[number]
export type PmbokKnowledgeDomain = (typeof PMBOK_KNOWLEDGE_DOMAINS)[number]
export type PmbokDomain = (typeof PMBOK_DOMAINS)[number]

export type DomainTier = "performance" | "knowledge"

export interface DomainKpiDefinition {
  id: string
  label: string
  description: string
  unit?: string
  higherIsBetter?: boolean
}

export const DOMAIN_KPI_KEYS: Record<PmbokDomain, DomainKpiDefinition[]> = {
  stakeholders: [],
  team: [],
  development_approach: [],
  planning: [],
  project_work: [],
  delivery: [],
  measurement: [],
  uncertainty: [],
  governance: [],
  scope: [],
  schedule: [],
  finance: [],
  resources: [],
  risk: [],
  stakeholders_ops: [],
}

export function getDomainTier(domain: PmbokDomain): DomainTier {
  return PMBOK_PERFORMANCE_DOMAINS.includes(domain as any) ? "performance" : "knowledge"
}

