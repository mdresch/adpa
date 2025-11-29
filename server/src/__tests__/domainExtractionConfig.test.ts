import { DOMAIN_EXTRACTION_CONFIGS, getDomainExtractionConfig, listDomainExtractionConfigs } from '@/modules/context'
import { 
  PMBOK_DOMAINS, 
  PMBOK_PERFORMANCE_DOMAINS, 
  PMBOK_KNOWLEDGE_DOMAINS,
  type PmbokDomain,
  getDomainTier 
} from '@/types/pmbok'

describe('domainExtractionConfig', () => {
  it('exposes a config for every PMBOK domain (15 total)', () => {
    const configs = listDomainExtractionConfigs()
    expect(configs).toHaveLength(PMBOK_DOMAINS.length)
    expect(configs).toHaveLength(15) // 8 performance + 7 knowledge

    PMBOK_DOMAINS.forEach((domain) => {
      const config = DOMAIN_EXTRACTION_CONFIGS[domain]
      expect(config).toBeDefined()
      expect(config.domain).toBe(domain)
      expect(config.tier).toBeDefined()
      expect(['performance', 'knowledge']).toContain(config.tier)
      expect(config.entityTypes.length).toBeGreaterThan(0)
      expect(config.prompt).toMatch(/Markdown/i)
    })
  })

  it('has correct tier for performance domains', () => {
    PMBOK_PERFORMANCE_DOMAINS.forEach((domain) => {
      const config = DOMAIN_EXTRACTION_CONFIGS[domain]
      expect(config.tier).toBe('performance')
      expect(getDomainTier(domain)).toBe('performance')
    })
  })

  it('has correct tier for knowledge domains', () => {
    PMBOK_KNOWLEDGE_DOMAINS.forEach((domain) => {
      const config = DOMAIN_EXTRACTION_CONFIGS[domain]
      expect(config.tier).toBe('knowledge')
      expect(getDomainTier(domain)).toBe('knowledge')
    })
  })

  it('returns the matching config via helper', () => {
    const domain: PmbokDomain = 'stakeholders'
    const config = getDomainExtractionConfig(domain)
    expect(config.title).toContain('Stakeholders')
    expect(config.tier).toBe('performance')
    expect(config.requiredDocuments.length).toBeGreaterThan(0)
  })

  it('returns correct config for knowledge domain', () => {
    const domain: PmbokDomain = 'governance'
    const config = getDomainExtractionConfig(domain)
    expect(config.title).toContain('Governance')
    expect(config.tier).toBe('knowledge')
    expect(config.entityTypes).toContain('governance_decisions')
  })

  it('throws for unknown domains', () => {
    expect(() => getDomainExtractionConfig('unknown-domain' as PmbokDomain)).toThrow()
  })

  it('all domains have KPI definitions', () => {
    PMBOK_DOMAINS.forEach((domain) => {
      const config = DOMAIN_EXTRACTION_CONFIGS[domain]
      expect(config.kpis).toBeDefined()
      expect(Array.isArray(config.kpis)).toBe(true)
      expect(config.kpis.length).toBeGreaterThan(0)
    })
  })

  it('all domains have recommended providers', () => {
    PMBOK_DOMAINS.forEach((domain) => {
      const config = DOMAIN_EXTRACTION_CONFIGS[domain]
      expect(config.recommendedProviders).toBeDefined()
      expect(config.recommendedProviders.length).toBeGreaterThan(0)
    })
  })
})

