/**
 * Extract Technologies
 * 
 * Extracts technologies from project documents across different architectural layers.
 * Includes frontend, backend, database, infrastructure, devops, testing, and monitoring technologies.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { Technology } from './types'

/**
 * Extract technologies from documents
 */
export async function extractTechnologies(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<Technology>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-TECHNOLOGIES] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'technologies',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-TECHNOLOGIES] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validTechnologies: Technology[] = []
      cached.forEach((tech: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          tech,
          context,
          'TECHNOLOGIES',
          tech.name || 'Unnamed Technology'
        )
        
        if (resolution.resolved) {
          validTechnologies.push(tech as Technology)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validTechnologies.length

      return {
        entities: validTechnologies,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validTechnologies.length,
          finalCount: validTechnologies.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-TECHNOLOGIES] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build detailed prompt for technology extraction
    const jsonStructure = `{
  "technologies": [
    {
      "name": "Technology name (e.g., React, PostgreSQL, AWS)",
      "category": "frontend|backend|database|infrastructure|devops|testing|monitoring|other",
      "description": "What this technology does in the project",
      "version": "Version number or range (e.g., 18.3, 15.x, latest)",
      "purpose": "Why this technology was chosen for the project",
      "license": "License type (MIT, Apache 2.0, BSD, Proprietary, Commercial, Open Source)",
      "vendor": "Provider (AWS, Microsoft, Google, HashiCorp, Open Source Community, etc.)",
      "deployment_environment": "Where deployed (production, staging, development, all, cloud, on-premises)",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Extract ALL technologies mentioned in documents (aim for 20-40 technologies)',
      'Classify each technology into the correct category',
      'Extract version numbers when explicitly mentioned (use "latest" or version range if unclear)',
      'Infer purpose from context if not explicitly stated',
      'For open-source: use "Open Source" as vendor',
      'For cloud services: use cloud provider as vendor (AWS, Azure, GCP)',
      'Extract both primary and supporting technologies (databases, caches, queues, monitoring, etc.)'
    ]

    // Build a more detailed prompt for technologies
    const documentContext = context.documentContext
    const documentList = context.documents.map(d => `- ${d.title}`).join('\n')
    
    const prompt = `You are a **Technology Architect** tasked with extracting and structuring technology recommendations from project documentation to populate a **Technical Architecture Baseline** (PMBOK 7 - Technical Performance Domain).

CONTEXT:
This extraction will populate the **Technical Baseline → Architecture** component of the project baseline, categorizing the technology stack by architectural layer.

${documentContext}

EXTRACTION INSTRUCTIONS:

Extract ALL technologies mentioned across these layers:

1. **Frontend Layer (Presentation Tier)**:
   - UI Frameworks: React, Vue, Angular, Next.js, Svelte
   - Component Libraries: Tailwind CSS, Material-UI, Chakra UI, Radix UI
   - State Management: Redux, Zustand, MobX, Recoil
   - Build Tools: Webpack, Vite, Turbopack

2. **Backend Layer (Business Logic Tier)**:
   - Runtimes: Node.js, Python, Java, Go, .NET
   - Frameworks: Express, NestJS, Django, Spring Boot, FastAPI
   - API Standards: REST, GraphQL, gRPC, WebSocket

3. **Data Layer (Persistence Tier)**:
   - Databases: PostgreSQL, MySQL, MongoDB, Cassandra, DynamoDB
   - Caching: Redis, Memcached, Elasticache
   - Search: Elasticsearch, Algolia, Typesense
   - Message Queues: RabbitMQ, Kafka, AWS SQS, Bull/Redis

4. **Infrastructure Layer (Platform & Hosting)**:
   - Cloud Providers: AWS, Azure, GCP, DigitalOcean
   - Containerization: Docker, Podman
   - Orchestration: Kubernetes, Docker Swarm, ECS, AKS
   - Load Balancers: Nginx, HAProxy, AWS ALB, Cloudflare

5. **DevOps & CI/CD Layer**:
   - Version Control: Git, GitHub, GitLab, Bitbucket
   - CI/CD: GitHub Actions, GitLab CI, Jenkins, CircleCI
   - IaC: Terraform, Pulumi, CloudFormation, Ansible
   - Artifact Repos: Docker Hub, NPM, PyPI, Nexus

6. **Testing & Quality Layer**:
   - Unit Testing: Jest, Pytest, JUnit, Mocha
   - Integration Testing: Supertest, Postman, RestAssured
   - E2E Testing: Cypress, Playwright, Selenium, Puppeteer
   - Code Quality: SonarQube, ESLint, Prettier, CodeClimate

7. **Monitoring & Observability Layer**:
   - APM: Datadog, New Relic, Dynatrace, AppDynamics
   - Logging: ELK Stack, Splunk, Loki, CloudWatch
   - Metrics: Prometheus, Grafana, InfluxDB
   - Error Tracking: Sentry, Rollbar, Bugsnag

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

OUTPUT FORMAT:
${jsonStructure}

CRITICAL RULES:
- Extract ALL technologies mentioned in documents (aim for 20-40 technologies)
- Classify each technology into the correct category
- Extract version numbers when explicitly mentioned (use "latest" or version range if unclear)
- Infer purpose from context if not explicitly stated
- For open-source: use "Open Source" as vendor
- For cloud services: use cloud provider as vendor (AWS, Azure, GCP)
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown formatting, no explanations, no comments
- If a technology serves multiple purposes, include it in the most relevant category
- Extract both primary and supporting technologies (databases, caches, queues, monitoring, etc.)

QUALITY CHECKLIST:
✓ At least 3-5 frontend technologies
✓ At least 3-5 backend technologies
✓ At least 2-3 databases/data stores
✓ At least 2-3 infrastructure technologies
✓ DevOps, testing, and monitoring tools included
✓ Version numbers extracted when available
✓ License information included when mentioned
✓ Deployment environment specified

Return pure JSON only.`

    // Call AI with fallback - use 10000 max_tokens for large technology extractions
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 10000 // Increased from 2000 to handle very large technology extractions
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawTechnologies = parsed.technologies || []
    totalExtracted = rawTechnologies.length

    // Deduplicate within batch
    const deduplicatedTechnologies = deduplicateTechnologiesBatch(rawTechnologies)
    afterDeduplication = deduplicatedTechnologies.length

    // Resolve source_document_id for each technology (STRICT: reject if missing)
    const validTechnologies: Technology[] = []
    
    deduplicatedTechnologies.forEach((tech) => {
      const resolution = resolveSourceDocumentIdStrict(
        tech,
        context,
        'TECHNOLOGIES',
        tech.name || 'Unnamed Technology'
      )
      
      if (resolution.resolved) {
        validTechnologies.push(tech)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validTechnologies.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-TECHNOLOGIES] REJECTED ${rejectedCount} technologies without valid source_document_id (out of ${deduplicatedTechnologies.length} total)`)
    }
    
    logger.info(`[EXTRACTION-TECHNOLOGIES] Extracted ${validTechnologies.length} technologies with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validTechnologies.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'technologies',
        validTechnologies,
        context.provider,
        context.model
      )
    }

    return {
      entities: validTechnologies,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validTechnologies.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-TECHNOLOGIES] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      entities: [],
      rejectedCount: 0,
      skippedCount: 0,
      stats: {
        totalExtracted: 0,
        afterDeduplication: 0,
        afterSourceResolution: 0,
        finalCount: 0,
        cacheHit,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  }
}

/**
 * Deduplicate technologies within the extracted batch only
 */
function deduplicateTechnologiesBatch(technologies: Technology[]): Technology[] {
  // Deduplicate by normalized name
  const uniqueMap = new Map<string, Technology>()
  
  technologies.forEach(tech => {
    const normalizedName = tech.name.toLowerCase().trim()
    if (!uniqueMap.has(normalizedName)) {
      uniqueMap.set(normalizedName, tech)
    } else {
      // Duplicate found - keep first occurrence
      logger.debug(`[EXTRACTION-TECHNOLOGIES] Skipping duplicate technology: "${tech.name}"`)
    }
  })
  
  return Array.from(uniqueMap.values())
}

