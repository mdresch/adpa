# DRACO Template Auditing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement database-integrated automated auditing for document templates, checking compliance with frameworks (TOGAF, SABSA, PMBOK) and logical resilience using parallel LLM agents. Establish a feedback loop triggering a template audit if a generated document fails its DRACO review.

**Architecture:** 
1. Add a database migration for `template_audits` history.
2. Develop a background `TemplateAuditService` using `aiService` to evaluate templates asynchronously.
3. Integrate triggers within the `DocumentTemplateService` lifecycle and the DRACO document review completion hook.
4. Expose the audit records via an API endpoint.

**Tech Stack:** TypeScript, Node.js, Express, PostgreSQL, Drizzle ORM / pg, tsx.

---

### Task 1: Database Migration for Template Audits Table

**Files:**
- Create: `server/migrations/411_create_template_audits_table.sql`

- [ ] **Step 1: Write the migration SQL script**
  Create file `server/migrations/411_create_template_audits_table.sql` with the following content:
  ```sql
  -- Migration: Create template audits table for background template reviews
  CREATE TABLE IF NOT EXISTS template_audits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      template_version INTEGER NOT NULL DEFAULT 1,
      status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
      trigger_type VARCHAR(50) NOT NULL DEFAULT 'lifecycle', -- 'lifecycle', 'manual', 'document_failure'
      
      -- Overall Scores & Verdict
      overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
      governance_score INTEGER CHECK (governance_score >= 0 AND governance_score <= 100),
      resilience_score INTEGER CHECK (resilience_score >= 0 AND resilience_score <= 100),
      verdict VARCHAR(50), -- 'pass', 'flagged', 'fail'
      
      -- Governance Evaluator Results
      governance_findings JSONB DEFAULT '[]',
      governance_recommendations JSONB DEFAULT '[]',
      compliance_gaps JSONB DEFAULT '[]',
      
      -- Counterfactual Challenger Results
      challenger_findings JSONB DEFAULT '[]',
      challenger_recommendations JSONB DEFAULT '[]',
      challenged_assumptions JSONB DEFAULT '[]',
      logical_vulnerabilities JSONB DEFAULT '[]',
      
      -- Metadata & Timestamps
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP WITH TIME ZONE
  );

  CREATE INDEX IF NOT EXISTS idx_template_audits_template_id ON template_audits(template_id);
  ```

- [ ] **Step 2: Run the migration and check schema**
  Run: `cd server && npm run migrate`
  Expected: Successful execution output printing `✅ Successfully executed: 411_create_template_audits_table.sql`.

- [ ] **Step 3: Commit migration**
  Run: `git add server/migrations/411_create_template_audits_table.sql`
  Run: `git commit -m "migration: create template_audits table"`

---

### Task 2: Implement Template Audit Service

**Files:**
- Create: `server/src/services/templateAuditService.ts`
- Create: `server/src/__tests__/templateAuditService.test.ts`

- [ ] **Step 1: Write templateAuditService.ts**
  Create file `server/src/services/templateAuditService.ts` containing the prompt construction, LLM calls, and verdict calculation logic:
  ```typescript
  import { pool } from '../database/connection'
  import { aiService } from './aiService'
  import { logger } from '../utils/logger'
  import { v4 as uuidv4 } from 'uuid'

  export interface AuditTriggerInput {
    templateId: string
    triggerType: 'lifecycle' | 'manual' | 'document_failure'
    documentFailureContext?: any
  }

  export class TemplateAuditService {
    async createPendingAudit(templateId: string, triggerType: string, version: number = 1): Promise<string> {
      const id = uuidv4()
      await pool.query(
        `INSERT INTO template_audits (id, template_id, template_version, status, trigger_type)
         VALUES ($1, $2, $3, 'pending', $4)`,
        [id, templateId, version, triggerType]
      )
      return id
    }

    async runAudit(auditId: string, templateData: any, docFailureContext?: any) {
      const startTime = new Date()
      logger.info(`[TEMPLATE-AUDIT] Running audit ${auditId} for template ${templateData.id}`)
      
      try {
        const framework = templateData.framework || 'Custom'
        const templateName = templateData.name
        const templateDesc = templateData.description || ''
        const systemPrompt = templateData.system_prompt || ''
        const paragraphs = JSON.stringify(templateData.template_paragraphs || [])

        // 1. Governance Evaluator call
        const govPrompt = this.buildGovernancePrompt(framework, templateName, templateDesc, systemPrompt, paragraphs)
        const govPromise = aiService.generateWithFallback({
          provider: 'google', // Default provider
          prompt: govPrompt,
          temperature: 0.2,
          max_tokens: 3000,
          aiCallType: 'draco_governance_evaluation'
        })

        // 2. Counterfactual Challenger call
        const chalPrompt = this.buildChallengerPrompt(framework, templateName, templateDesc, systemPrompt, paragraphs)
        const chalPromise = aiService.generateWithFallback({
          provider: 'openai', // Default provider
          prompt: chalPrompt,
          temperature: 0.4,
          max_tokens: 3500,
          aiCallType: 'draco_counterfactual_challenge'
        })

        const [govResult, chalResult] = await Promise.all([govPromise, chalPromise])
        const govData = this.parseAIJson(govResult.content)
        const chalData = this.parseAIJson(chalResult.content)

        const govScore = this.safeNum(govData.score, 70)
        const chalScore = this.safeNum(chalData.score, 70)
        const overallScore = Math.round((govScore + chalScore) / 2)

        // Calculate verdict
        let verdict: 'pass' | 'flagged' | 'fail' = 'pass'
        const hasCriticalGap = (govData.compliance_gaps || []).some((gap: any) => gap.severity === 'critical')
        const hasHighVulnerability = (chalData.logical_vulnerabilities || []).some((vuln: any) => vuln.severity === 'high' || vuln.severity === 'critical')
        const hasMajorGap = (govData.compliance_gaps || []).some((gap: any) => gap.severity === 'major')
        const hasMediumVulnerability = (chalData.logical_vulnerabilities || []).some((vuln: any) => vuln.severity === 'medium')

        if (overallScore < 60 || hasCriticalGap || hasHighVulnerability) {
          verdict = 'fail'
        } else if (overallScore < 75 || hasMajorGap || hasMediumVulnerability) {
          verdict = 'flagged'
        }

        await pool.query(
          `UPDATE template_audits
           SET status = 'completed',
               overall_score = $1,
               governance_score = $2,
               resilience_score = $3,
               verdict = $4,
               governance_findings = $5,
               governance_recommendations = $6,
               compliance_gaps = $7,
               challenger_findings = $8,
               challenger_recommendations = $9,
               challenged_assumptions = $10,
               logical_vulnerabilities = $11,
               completed_at = NOW()
           WHERE id = $12`,
          [
            overallScore,
            govScore,
            chalScore,
            verdict,
            JSON.stringify(govData.findings || []),
            JSON.stringify(govData.recommendations || []),
            JSON.stringify(govData.compliance_gaps || []),
            JSON.stringify(chalData.findings || []),
            JSON.stringify(chalData.recommendations || []),
            JSON.stringify(chalData.challenged_assumptions || []),
            JSON.stringify(chalData.logical_vulnerabilities || []),
            auditId
          ]
        )
        logger.info(`[TEMPLATE-AUDIT] Completed audit ${auditId} with verdict ${verdict} (Score: ${overallScore})`)
      } catch (err: any) {
        logger.error(`[TEMPLATE-AUDIT] Audit failed for id ${auditId}`, { error: err.message })
        await pool.query(
          `UPDATE template_audits
           SET status = 'failed', error_message = $1, completed_at = NOW()
           WHERE id = $2`,
          [err.message || String(err), auditId]
        )
      }
    }

    private buildGovernancePrompt(framework: string, name: string, desc: string, systemPrompt: string, paragraphs: string): string {
      return `You are the Governance Evaluator on the DRACO Template Audit Board.
Your role: Rigorously audit this document template's prompt guidance, paragraphs, and structure for compliance with the designated framework: ${framework}.

## Template to Audit:
- Name: ${name}
- Description: ${desc}
- Framework: ${framework}
- System Prompt / Guidance: ${systemPrompt}
- Paragraphs & Outlines:
${paragraphs}

## Framework-Specific Rules to Enforce:
- If PMBOK: Check if the template mandates clear project roles (Sponsor, Project Manager, etc.), explicitly tailors to Predictive vs Adaptive lifecycles, defines structured risk escalation levels, and requests a communications cadence matrix.
- If TOGAF: Check if the template includes Architecture Viewpoints, Gap Analysis procedures, stakeholder concern mappings, and compliance reviews.
- If SABSA: Check if the template mandates explicit Security Requirement Traceability, Risk & Threat Assessments, operational trust models, and security controls.
- Other: Validate against general project management and systems engineering governance best practices.

Respond ONLY with valid JSON matching this structure:
{
  "score": <0-100>,
  "findings": ["<finding 1>"],
  "recommendations": ["<remediation recommendation 1>"],
  "compliance_gaps": [
    {"framework": "${framework}", "requirement": "<missing element>", "gap_description": "<why it's weak>", "severity": "minor|major|critical"}
  ]
}`
    }

    private buildChallengerPrompt(framework: string, name: string, desc: string, systemPrompt: string, paragraphs: string): string {
      return `You are the Counterfactual Challenger on the DRACO Template Audit Board.
Your role: Adversarially stress-test this document template's instructions and prompt guidance. Identify logical loopholes, vague guidelines, and areas where the generating AI could hallucinate, make circular claims, or produce low-quality content.

## Template to Audit:
- Name: ${name}
- Description: ${desc}
- Framework: ${framework}
- System Prompt / Guidance: ${systemPrompt}
- Paragraphs & Outlines:
${paragraphs}

Respond ONLY with valid JSON matching this structure:
{
  "score": <0-100>,
  "findings": ["<loophole 1>"],
  "recommendations": ["<actionable prompt sharpening 1>"],
  "challenged_assumptions": [
    {"assumption": "<weak template assumption>", "counter_argument": "<how generating AI might fail>", "severity": "low|medium|high"}
  ],
  "logical_vulnerabilities": [
    {"location": "<section>", "description": "<vulnerability>", "severity": "low|medium|high", "suggested_fix": "<how to fix>"}
  ]
}`
    }

    private parseAIJson(raw: string): any {
      let cleaned = raw.trim()
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
      cleaned = cleaned.trim()
      try {
        return JSON.parse(cleaned)
      } catch {
        return { score: 70, findings: ['Failed to parse JSON response from LLM'], recommendations: [] }
      }
    }

    private safeNum(val: any, fallback: number): number {
      const n = Number(val)
      return isNaN(n) ? fallback : n
    }
  }

  export const templateAuditService = new TemplateAuditService()
  ```

- [ ] **Step 2: Create unit test file**
  Create file `server/src/__tests__/templateAuditService.test.ts` to mock AI service and verify scoring and SQL updates:
  ```typescript
  import { templateAuditService } from '../services/templateAuditService'
  import { pool } from '../database/connection'
  import { aiService } from '../services/aiService'

  jest.mock('../database/connection', () => ({
    pool: {
      query: jest.fn().mockResolvedValue({ rows: [] })
    }
  }))

  jest.mock('../services/aiService', () => ({
    aiService: {
      generateWithFallback: jest.fn()
    }
  }))

  describe('TemplateAuditService', () => {
    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should create a pending audit and return the UUID', async () => {
      const spy = jest.spyOn(pool, 'query')
      const auditId = await templateAuditService.createPendingAudit('some-template-id', 'lifecycle')
      expect(auditId).toBeDefined()
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO template_audits'),
        expect.any(Array)
      )
    })

    it('should run audit, call AI services, and save verdict', async () => {
      const mockGenerate = aiService.generateWithFallback as jest.Mock
      mockGenerate.mockImplementation(async ({ aiCallType }) => {
        if (aiCallType === 'draco_governance_evaluation') {
          return { content: JSON.stringify({ score: 85, findings: ['Good structure'], recommendations: [], compliance_gaps: [] }) }
        } else {
          return { content: JSON.stringify({ score: 80, findings: [], recommendations: [], challenged_assumptions: [], logical_vulnerabilities: [] }) }
        }
      })

      const poolSpy = jest.spyOn(pool, 'query')
      const mockTemplate = { id: 'temp-id', name: 'Plan', framework: 'PMBOK' }

      await templateAuditService.runAudit('audit-id', mockTemplate)

      expect(mockGenerate).toHaveBeenCalledTimes(2)
      expect(poolSpy).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE template_audits SET status = \'completed\''),
        expect.arrayContaining([83, 85, 80, 'pass'])
      )
    })
  })
  ```

- [ ] **Step 3: Run the unit test**
  Run: `cd server && npx jest src/__tests__/templateAuditService.test.ts --no-coverage`
  Expected: All tests pass.

- [ ] **Step 4: Commit Service & Tests**
  Run: `git add server/src/services/templateAuditService.ts server/src/__tests__/templateAuditService.test.ts`
  Run: `git commit -m "feat: implement template audit service and unit tests"`

---

### Task 3: Integrate Lifecycle Hooks in DocumentTemplateService

**Files:**
- Modify: `server/src/modules/documentTemplates/service.ts`

- [ ] **Step 1: Add trigger logic in createTemplate and updateTemplate**
  Find the `createTemplate` and `updateTemplate` methods in `server/src/modules/documentTemplates/service.ts`.
  Modify them to:
  1. Trigger audit asynchronously in the background.
  2. Use `setImmediate` so it doesn't block the template response.

  Code changes:
  Import templateAuditService:
  ```typescript
  import { templateAuditService } from '../../services/templateAuditService'
  ```

  Inside `createTemplate`, before returning `result.rows[0]`:
  ```typescript
  const createdTemplate = result.rows[0]
  setImmediate(async () => {
    try {
      const auditId = await templateAuditService.createPendingAudit(createdTemplate.id, 'lifecycle', 1)
      await templateAuditService.runAudit(auditId, createdTemplate)
    } catch (err) {
      logger.error('Background template lifecycle creation audit failed', err)
    }
  })
  ```

  Inside `updateTemplate`, before returning `result.rows[0]`:
  ```typescript
  const updatedTemplate = result.rows[0]
  setImmediate(async () => {
    try {
      const auditId = await templateAuditService.createPendingAudit(updatedTemplate.id, 'lifecycle', 2) // Or increment version if tracked
      await templateAuditService.runAudit(auditId, updatedTemplate)
    } catch (err) {
      logger.error('Background template lifecycle update audit failed', err)
    }
  })
  ```

- [ ] **Step 2: Verify compile & tests**
  Run: `cd server && npx jest src/modules/documentTemplates/__tests__/service.test.ts --no-coverage`
  Expected: Tests pass.

- [ ] **Step 3: Commit Service Modification**
  Run: `git add server/src/modules/documentTemplates/service.ts`
  Run: `git commit -m "feat: trigger background template audits on template create/update"`

---

### Task 4: Integrate Closed-Loop Document Failure Trigger

**Files:**
- Modify: `server/src/routes/documentGeneration.ts`

- [ ] **Step 1: Trigger template audit on document generation DRACO failure**
  Open `server/src/routes/documentGeneration.ts`. Find where `dracoService.runFullReview` is triggered in the background hook (lines ~634-693).
  Modify the async IIFE to schedule an audit if the document DRACO review score is low:

  ```typescript
              log.info('🎯 [DRACO] Triggering DRACO AI Review Board for generated document', {
                documentId,
                documentName: name,
                templateId,
              })

              const projectCtxResult = await pool.query(
                'SELECT * FROM projects WHERE id = $1',
                [projectId]
              )
              const projectCtx = projectCtxResult.rows[0] ?? {}

              const { dracoService } = await import('../services/dracoService')
              const dracoResult = await dracoService.runFullReview({
                documentId,
                content: result.content,
                documentType: name || 'Document',
                projectContext: projectCtx,
                templateId,
                userId: req.user?.id || 'system',
              })

              log.info('🎯 [DRACO] Review Board completed', {
                documentId,
                verdict: dracoResult.verdict,
                overall_score: dracoResult.overall_draco_score,
                mode: dracoResult.mode,
              })

              // 🔄 Closed-loop feedback: Trigger template audit if score is low
              if (templateId && dracoResult.overall_draco_score < 70) {
                // Check if already audited in last 12 hours
                const recentAuditCheck = await pool.query(
                  `SELECT id FROM template_audits
                   WHERE template_id = $1 AND trigger_type = 'document_failure' AND created_at > NOW() - INTERVAL '12 hours'
                   LIMIT 1`,
                  [templateId]
                )
                if (recentAuditCheck.rows.length === 0) {
                  log.info('🎯 [DRACO] Closed-loop: Triggering template audit due to low doc review score', { templateId, docScore: dracoResult.overall_draco_score })
                  const templateResult = await pool.query('SELECT * FROM templates WHERE id = $1', [templateId])
                  if (templateResult.rows.length > 0) {
                    const { templateAuditService } = await import('../services/templateAuditService')
                    const auditId = await templateAuditService.createPendingAudit(templateId, 'document_failure')
                    // Run audit passing failed document context
                    setImmediate(() => {
                      templateAuditService.runAudit(auditId, templateResult.rows[0], {
                        documentId,
                        overall_score: dracoResult.overall_draco_score,
                        findings: dracoResult.evidence_validator?.findings
                      }).catch(err => log.error('Closed loop template audit execution failed', err))
                    })
                  }
                }
              }
  ```

- [ ] **Step 2: Commit Document Generation route**
  Run: `git add server/src/routes/documentGeneration.ts`
  Run: `git commit -m "feat: add closed-loop feedback hook triggering template audit on doc failure"`

---

### Task 5: Add Template Audits API Endpoints

**Files:**
- Modify: `server/src/modules/documentTemplates/routes.ts`
- Modify: `server/src/modules/documentTemplates/controller.ts`

- [ ] **Step 1: Add route definitions**
  Open `server/src/modules/documentTemplates/routes.ts`. Add routes for listing audits and manually triggering audits:
  ```typescript
  // Register the GET audits list route
  router.get("/:id/audits",
    authenticateToken,
    controller.getTemplateAudits.bind(controller)
  )

  // Register the POST trigger audit route
  router.post("/:id/audit",
    authenticateToken,
    controller.triggerTemplateAudit.bind(controller)
  )
  ```

- [ ] **Step 2: Add controller handlers**
  Open `server/src/modules/documentTemplates/controller.ts`. Implement the retrieval and manual trigger handlers:
  ```typescript
  async getTemplateAudits(req: Request, res: Response) {
    try {
      const { id } = req.params
      const result = await pool.query(
        `SELECT * FROM template_audits WHERE template_id = $1 ORDER BY created_at DESC`,
        [id]
      )
      return res.status(200).json({ audits: result.rows })
    } catch (error) {
      logger.error('Failed to retrieve template audits', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  async triggerTemplateAudit(req: Request, res: Response) {
    try {
      const { id } = req.params
      const templateResult = await pool.query(
        `SELECT * FROM templates WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      )
      if (templateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' })
      }

      const { templateAuditService } = await import('../../services/templateAuditService')
      const auditId = await templateAuditService.createPendingAudit(id, 'manual')
      
      // Run the audit in the background
      setImmediate(async () => {
        try {
          await templateAuditService.runAudit(auditId, templateResult.rows[0])
        } catch (err) {
          logger.error('Manual template audit background run failed', err)
        }
      })

      return res.status(202).json({ message: 'Audit triggered successfully', auditId })
    } catch (error) {
      logger.error('Failed to trigger template audit', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
  ```

- [ ] **Step 3: Run integration check or verify compilation**
  Run: `cd server && npm run dev`
  Verify that the backend compiles without error.

- [ ] **Step 4: Commit API changes**
  Run: `git add server/src/modules/documentTemplates/routes.ts server/src/modules/documentTemplates/controller.ts`
  Run: `git commit -m "feat: expose GET and POST manual trigger endpoints for template audits"`

---

### Task 6: Implement Frontend Template Audits Panel Component

**Files:**
- Create: `components/TemplateAuditsPanel.tsx`

- [ ] **Step 1: Write TemplateAuditsPanel.tsx**
  Create file `components/TemplateAuditsPanel.tsx` to handle listing audits, triggering manual runs, and displaying evaluator/challenger reports:
  ```tsx
  "use client"

  import { useState, useEffect, useCallback } from "react"
  import { Shield, HelpCircle, CheckCircle2, AlertTriangle, XCircle, Play, Loader2 } from "lucide-react"

  interface TemplateAuditsPanelProps {
    templateId: string
  }

  export function TemplateAuditsPanel({ templateId }: TemplateAuditsPanelProps) {
    const [audits, setAudits] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [triggering, setTriggering] = useState(false)
    const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null)

    const fetchAudits = useCallback(async () => {
      try {
        const res = await fetch(`/api/document-templates/${templateId}/audits`)
        if (res.ok) {
          const data = await res.json()
          setAudits(data.audits || [])
        }
      } catch (err) {
        console.error("Failed to fetch audits", err)
      } finally {
        setLoading(false)
      }
    }, [templateId])

    useEffect(() => {
      fetchAudits()
      // Setup polling for pending status
      const interval = setInterval(() => {
        const hasPending = audits.some((a) => a.status === "pending")
        if (hasPending) {
          fetchAudits()
        }
      }, 3000)
      return () => clearInterval(interval)
    }, [fetchAudits, audits])

    const handleTriggerAudit = async () => {
      setTriggering(true)
      try {
        const res = await fetch(`/api/document-templates/${templateId}/audit`, {
          method: "POST",
        })
        if (res.ok) {
          fetchAudits()
        }
      } catch (err) {
        console.error("Failed to trigger audit", err)
      } finally {
        setTriggering(false)
      }
    }

    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      )
    }

    const selectedAudit = audits.find((a) => a.id === selectedAuditId) || audits[0]

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Template Auditing History</h3>
            <p className="text-sm text-muted-foreground">Oversee automatic and manual template quality audit reviews.</p>
          </div>
          <button
            onClick={handleTriggerAudit}
            disabled={triggering || audits.some((a) => a.status === "pending")}
            className="flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
          >
            {triggering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run Audit
          </button>
        </div>

        {audits.length === 0 ? (
          <div className="bg-muted p-8 text-center rounded-xl border">
            <Shield className="h-12 w-12 text-slate-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm text-muted-foreground">No audits have been executed for this template yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Audit list (Left Column) */}
            <div className="md:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {audits.map((a) => {
                const dateStr = new Date(a.created_at).toLocaleString()
                const isActive = selectedAudit?.id === a.id
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAuditId(a.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? "border-purple-600 bg-purple-50/15"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {a.trigger_type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">{dateStr}</span>
                    </div>

                    {a.status === "pending" ? (
                      <div className="flex items-center gap-2 text-amber-600 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Deliberating...</span>
                      </div>
                    ) : a.status === "failed" ? (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <XCircle className="h-4 w-4" />
                        <span>Audit Failed</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {a.verdict === "pass" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : a.verdict === "flagged" ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-semibold text-sm capitalize">{a.verdict}</span>
                        </div>
                        <span className="font-bold text-sm">{a.overall_score}/100</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Audit Details (Right Columns) */}
            <div className="md:col-span-2 space-y-4">
              {selectedAudit?.status === "pending" && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-6 rounded-xl flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
                  <p className="font-semibold text-amber-900 dark:text-amber-100">Audit Board Deliberating</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300 text-center">
                    The Governance Evaluator and Counterfactual Challenger are reviewing the template details. This will take a few moments.
                  </p>
                </div>
              )}

              {selectedAudit?.status === "completed" && (
                <div className="space-y-4">
                  {/* Summary Verdict Banner */}
                  <div className={`p-5 rounded-xl border flex justify-between items-start ${
                    selectedAudit.verdict === 'pass' ? 'border-emerald-500/30 bg-emerald-500/5' :
                    selectedAudit.verdict === 'flagged' ? 'border-amber-500/30 bg-amber-500/5' :
                    'border-red-500/30 bg-red-500/5'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verdict</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          selectedAudit.verdict === 'pass' ? 'bg-emerald-500/20 text-emerald-400' :
                          selectedAudit.verdict === 'flagged' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {selectedAudit.verdict.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-2">
                        {selectedAudit.trigger_type === 'document_failure' ? (
                          <span className="text-red-500 font-semibold">⚠️ Triggered by a document generation failure (overall score was < 70). Prompt refinement is suggested to solve systemic compliance gaps.</span>
                        ) : 'Template structure audit is finished.'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Overall Score</span>
                      <span className="text-3xl font-bold">{selectedAudit.overall_score}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
                    </div>
                  </div>

                  {/* Governance Evaluator findings */}
                  <div className="border rounded-xl p-5 space-y-3 bg-muted/10">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        ⚖ Governance Evaluator Report
                      </h4>
                      <span className="font-bold text-sm text-purple-600">{selectedAudit.governance_score}/100</span>
                    </div>

                    {selectedAudit.compliance_gaps?.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-red-500">Compliance Gaps:</p>
                        {selectedAudit.compliance_gaps.map((g: any, i: number) => (
                          <div key={i} className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-red-500/20 text-red-400 text-[10px] uppercase">{g.severity}</Badge>
                              <span className="font-bold">{g.framework}</span>
                            </div>
                            <p className="text-muted-foreground mt-1"><span className="font-medium text-foreground">Gap:</span> {g.gap_description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 font-medium">✓ No compliance gaps detected for this framework.</p>
                    )}

                    {selectedAudit.governance_recommendations?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2">Recommendations:</p>
                        <ul className="text-xs space-y-1 pl-4 list-disc text-muted-foreground">
                          {selectedAudit.governance_recommendations.map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Counterfactual Challenger findings */}
                  <div className="border rounded-xl p-5 space-y-3 bg-muted/10">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        ⟁ Counterfactual Challenger Report
                      </h4>
                      <span className="font-bold text-sm text-orange-600">{selectedAudit.resilience_score}/100</span>
                    </div>

                    {selectedAudit.logical_vulnerabilities?.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-500">Logical Vulnerabilities:</p>
                        {selectedAudit.logical_vulnerabilities.map((v: any, i: number) => (
                          <div key={i} className="bg-orange-500/5 border border-orange-500/10 p-3 rounded-lg text-xs">
                            <p className="font-semibold">{v.location || 'Prompt Guidance'}</p>
                            <p className="text-muted-foreground mt-1"><span className="font-medium text-foreground">Vulnerability:</span> {v.description}</p>
                            {v.suggested_fix && <p className="text-emerald-500/90 mt-1 font-medium"><span className="text-muted-foreground">Suggested Fix:</span> {v.suggested_fix}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 font-medium">✓ Prompt structure is logically resilient against loopholes.</p>
                    )}

                    {selectedAudit.challenger_recommendations?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2">Recommendations:</p>
                        <ul className="text-xs space-y-1 pl-4 list-disc text-muted-foreground">
                          {selectedAudit.challenger_recommendations.map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
      <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded ${className}`}>
        {children}
      </span>
    )
  }
  ```

- [ ] **Step 2: Commit Frontend Component**
  Run: `git add components/TemplateAuditsPanel.tsx`
  Run: `git commit -m "feat: implement TemplateAuditsPanel React component for template details view"`

---

### Task 7: Integrate TemplateAuditsPanel into Next.js Templates Details Page

**Files:**
- Modify: `app/templates/[id]/page.tsx`

- [ ] **Step 1: Register the new tab trigger and contents**
  Open `app/templates/[id]/page.tsx`. Import the `TemplateAuditsPanel` component:
  ```typescript
  import { TemplateAuditsPanel } from "@/components/TemplateAuditsPanel"
  ```

  Find where the tabs triggers are defined. Increment columns count `grid-cols-5` to `grid-cols-6`, and append the trigger:
  ```typescript
                          <TabsList className="grid w-full grid-cols-6">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="content">Content</TabsTrigger>
                            <TabsTrigger value="variables">Purpose & Profile</TabsTrigger>
                            <TabsTrigger value="gkg">
                              <Network className="h-4 w-4 mr-1" />
                              GKG
                            </TabsTrigger>
                            <TabsTrigger value="recommendations">
                              <Sparkles className="h-4 w-4 mr-1" />
                              Recommendations
                            </TabsTrigger>
                            <TabsTrigger value="audits">
                              <Shield className="h-4 w-4 mr-1" />
                              Audits
                            </TabsTrigger>
                          </TabsList>
  ```

  Find the end of the tabs block (lines ~1248-1251). Insert the `TabsContent` for the audits panel:
  ```typescript
                          <TabsContent value="audits" className="mt-4">
                            <TemplateAuditsPanel templateId={template.id} />
                          </TabsContent>
  ```

- [ ] **Step 2: Verify compile**
  Run: `pnpm build`
  Expected: Successful production build showing that there are no compilation errors in the Next.js pages/components.

- [ ] **Step 3: Commit Template details page changes**
  Run: `git add app/templates/[id]/page.tsx`
  Run: `git commit -m "feat: integrate TemplateAuditsPanel into template details tabs page"`

---

### Task 8: Implement Verification and Audit Walkthrough

- [ ] **Step 1: Create verification script**
  Create file `server/scripts/trigger-template-audit.ts` to allow manual testing:
  ```typescript
  import { pool, connectDatabase } from '../src/database/connection'
  import { templateAuditService } from '../src/services/templateAuditService'

  async function run() {
    await connectDatabase()
    const templates = await pool.query('SELECT * FROM templates LIMIT 1')
    if (templates.rows.length === 0) {
      console.log('No templates to audit.')
      process.exit(0)
    }

    const template = templates.rows[0]
    console.log(`Starting manual audit on template: ${template.name}`)
    const auditId = await templateAuditService.createPendingAudit(template.id, 'manual')
    await templateAuditService.runAudit(auditId, template)
    
    const auditResult = await pool.query('SELECT * FROM template_audits WHERE id = $1', [auditId])
    console.log('Audit completed successfully!', auditResult.rows[0])
    process.exit(0)
  }

  run().catch(err => {
    console.error(err)
    process.exit(1)
  })
  ```

- [ ] **Step 2: Run verification script**
  Run: `cd server && npx tsx scripts/trigger-template-audit.ts`
  Expected: Successful completion, logging overall_score and verdict.

- [ ] **Step 3: Commit verification script**
  Run: `git add server/scripts/trigger-template-audit.ts`
  Run: `git commit -m "test: add verification script for template audits"`

