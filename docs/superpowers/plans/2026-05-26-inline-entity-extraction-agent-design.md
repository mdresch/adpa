# Inline Entity-Tagging & Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the document generation pipeline so that the drafting LLM outputs entities inline using a markdown H8 syntax (`######## EntityType: {json}`). The system will parse these tags, write them to the entity database tables, and strip the H8 tags to save a clean markdown document.

**Architecture:**
1. **Prompt Injection**: In `DocumentGenerationService.ts`, update the drafting prompt instructions to ask the LLM to suffix the section text with `######## entity_type: json_data` block for any stakeholders, risks, milestones, etc. referenced.
2. **Regex Parser & Stripper**: Implement a helper function `extractAndStripInlineEntities(markdown: string)` that extracts the entity JSONs, resolves their types, and strips the lines from the final text.
3. **Database Writer**: For each extracted entity type, invoke the established `saveSingleEntityType` helper.

**Tech Stack:** TypeScript, Node.js/Express, PostgreSQL, RegExp.

---

## Proposed Changes

### Component 1: Inline Parser & Database Writer

#### [NEW] [inlineEntityParserService.ts](file:///f:/Source/Repos/adpa/server/src/services/inlineEntityParserService.ts)
A service to parse `######## type: json` structures, strip them from the markdown, and save entities to their respective tables.

### Component 2: Prompt and Drafting Hook

#### [MODIFY] [documentGenerationService.ts](file:///f:/Source/Repos/adpa/server/src/services/documentGenerationService.ts)
Update `draftSection` prompt construction to append H8 syntax instructions, and hook the parser to clean the section text and save entities during drafting.

---

## Tasks

### Task 1: Create the Inline Entity Parser Service

**Files:**
- Create: `server/src/services/inlineEntityParserService.ts`
- Test: `server/src/__tests__/services/inlineSectionExtractionService.test.ts`

- [ ] **Step 1: Write the inlineEntityParserService.ts**
  Create `server/src/services/inlineEntityParserService.ts` to parse the H8 tags:

  ```typescript
  import { logger } from '../utils/logger'
  import { saveSingleEntityType } from './extraction/ExtractionOrchestrator'

  export interface ParseAndProcessResult {
    cleanedMarkdown: string
    extractedCount: number
  }

  export class InlineEntityParserService {
    /**
     * Parse H8 tags from markdown, save them to the database, and return clean markdown
     */
    static async parseAndProcess(params: {
      projectId: string
      userId: string
      markdown: string
    }): Promise<ParseAndProcessResult> {
      const { projectId, userId, markdown } = params
      const lines = markdown.split('\n')
      const cleanedLines: string[] = []
      let extractedCount = 0

      // Group entities by type
      const entitiesByType: Record<string, any[]> = {}

      // Regex matching H8 entity tags: ######## entity_type: { ... }
      const h8Regex = /^########\s+([a-zA-Z0-9_.-]+)\s*:\s*(\{.*\})\s*$/

      for (const line of lines) {
        const match = line.trim().match(h8Regex)
        if (match) {
          const entityType = match[1].toLowerCase()
          const jsonStr = match[2]
          try {
            const entityData = JSON.parse(jsonStr)
            if (!entitiesByType[entityType]) {
              entitiesByType[entityType] = []
            }
            entitiesByType[entityType].push(entityData)
            extractedCount++
          } catch (err) {
            logger.warn(`[INLINE-PARSER] Failed to parse entity JSON on line: "${line}"`, err)
          }
        } else {
          cleanedLines.push(line)
        }
      }

      // Write all parsed entities to the database
      for (const [entityType, entities] of Object.entries(entitiesByType)) {
        if (entities.length > 0) {
          try {
            logger.info(`[INLINE-PARSER] Saving ${entities.length} inline-extracted "${entityType}" entities to database...`)
            await saveSingleEntityType(projectId, userId, entityType, entities)
          } catch (dbErr) {
            logger.error(`[INLINE-PARSER] Failed to save inline entities of type "${entityType}":`, dbErr)
          }
        }
      }

      return {
        cleanedMarkdown: cleanedLines.join('\n').trim(),
        extractedCount
      }
    }
  }
  ```

- [ ] **Step 2: Create unit tests**
  Write tests verifying that H8 lines are correctly parsed, grouped, and stripped from the markdown input.

- [ ] **Step 3: Run the test**
  Run: `cd server && npx jest --testPathPattern="inlineEntityParser" --no-coverage`
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add server/src/services/inlineEntityParserService.ts
  git commit -m "feat: add inline entity parser service and tests"
  ```

---

### Task 2: Inject Prompts and Parser Hook in DocumentGenerationService

**Files:**
- Modify: `server/src/services/documentGenerationService.ts`

- [ ] **Step 1: Update draftSection prompt instructions**
  Modify `draftSection` in `server/src/services/documentGenerationService.ts` to instruct the LLM to output entities as H8 tags.

  Target:
  ```typescript
      sectionPrompt += `\n---\n\n`
      sectionPrompt += `Output ONLY the Markdown for your assigned section. Start your output exactly with: ${params.task.heading}`
  ```

  Replacement:
  ```typescript
      sectionPrompt += `\n---\n\n`
      sectionPrompt += `Output the Markdown for your assigned section starting exactly with ${params.task.heading}.`
      sectionPrompt += `\n\nAdditionally, at the very end of your output, list any key entities (stakeholders, risks, milestones, budget baselines, cost estimates, deliverables) mentioned or defined in this section using the markdown H8 bracket format:\n`
      sectionPrompt += `######## entity_type: {"attribute1": "value1", ...}\n`
      sectionPrompt += `Use valid JSON for the entity attributes. Example:\n`
      sectionPrompt += `######## stakeholders: {"name": "Project Sponsor", "role": "Funder", "influence_level": 5}\n`
  ```

- [ ] **Step 2: Hook parser in generateDocument mapping loop**
  Call the parser right after prose drafting returns, stripping the tags before assembly.

  Target:
  ```typescript
      // Draft sections with bounded parallelism to avoid provider quota floods.
      const draftedSections = await this.mapWithConcurrency(generationPlan.sections, draftConcurrency, (sectionTask, index) => {
        return this.draftSection({
          task: sectionTask,
          order: index,
          project,
          gkgContext: gkg_context_snapshot,
          contextItems: customContextItems,
          jobId: request.jobId,
          provider: request.provider,
          model: request.model,
          temperature: request.temperature,
          projectId: request.projectId,
          userId: request.userId,
          templateId: request.templateId,
        })
      })
  ```

  Replacement:
  ```typescript
      // Lazy import the parser service
      const { InlineEntityParserService } = await import('./inlineEntityParserService')

      // Draft sections with bounded parallelism to avoid provider quota floods.
      const draftedSections = await this.mapWithConcurrency(generationPlan.sections, draftConcurrency, async (sectionTask, index) => {
        const sectionProse = await this.draftSection({
          task: sectionTask,
          order: index,
          project,
          gkgContext: gkg_context_snapshot,
          contextItems: customContextItems,
          jobId: request.jobId,
          provider: request.provider,
          model: request.model,
          temperature: request.temperature,
          projectId: request.projectId,
          userId: request.userId,
          templateId: request.templateId,
        })

        // Parse entities and strip H8 tags from the section markdown
        const parseResult = await InlineEntityParserService.parseAndProcess({
          projectId: request.projectId,
          userId: request.userId,
          markdown: sectionProse.markdown
        }).catch(err => {
          logger.error(`Inline entity parsing failed for section "${sectionTask.heading}":`, err)
          return { cleanedMarkdown: sectionProse.markdown, extractedCount: 0 }
        })

        return {
          ...sectionProse,
          markdown: parseResult.cleanedMarkdown
        }
      })
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add server/src/services/documentGenerationService.ts
  git commit -m "feat: instruct LLM to tag entities as H8 and parse them during drafting"
  ```
