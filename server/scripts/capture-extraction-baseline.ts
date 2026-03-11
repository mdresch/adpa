/**
 * Phase 1.3: Baseline Metrics Capture Script
 * 
 * Establishes a performance and quality baseline for the Extraction Service.
 * Measures latency, entity yield (total vs rejected), and cache performance.
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/capture-extraction-baseline.ts <projectId> [entityType]
 */

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { connectDatabase, pool } from '../src/database/connection'
import { extractSingleEntityType, extractSingleEntityTypeDetailed } from '../src/services/extraction/ExtractionOrchestrator'
import { initializeRegistry, extractionRegistry } from '../src/services/extraction/ExtractionRegistry'
import { logger } from '../src/utils/logger'

dotenv.config({ path: '.env' })

interface MetricRecord {
    entityType: string;
    durationMs: number;
    totalExtracted: number;
    rejectedCount: number;
    finalCount: number;
    cacheHit: boolean;
    timestamp: string;
    provider: string;
    model: string;
}

async function runBaseline(projectId: string, targetEntity?: string) {
    try {
        console.log('\n📊 Starting Extraction Performance Baseline Capture\n')
        await connectDatabase()

        // Initialize Registry
        console.log('🔄 Initializing Extraction Registry...')
        await initializeRegistry()
        console.log('✅ Registry initialized\n')

        // Get test user
        const userResult = await pool!.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
        if (userResult.rows.length === 0) {
            throw new Error('No admin user found for testing')
        }
        const userId = userResult.rows[0].id

        // Major entities to baseline
        const baselineEntities = [
            'risks',
            'stakeholders',
            'requirements',
            'milestones',
            'budget_baseline',
            'cost_estimates',
            'action_items',
            'wbs_nodes'
        ]

        const entitiesToTest = targetEntity ? [targetEntity] : baselineEntities
        const results: MetricRecord[] = []
        const startTimeOverall = Date.now()

        console.log(`📋 Baseling ${entitiesToTest.length} entities for project ${projectId}\n`)
        console.log('| Entity Type | Total | Rejected | Final | Duration | Cache |')
        console.log('|-------------|-------|----------|-------|----------|-------|')

        for (const entityType of entitiesToTest) {
            if (!extractionRegistry.hasEntity(entityType)) {
                continue
            }

            try {
                const start = Date.now()
                // We use a dummy orchestrator call or direct extractor?
                // Let's use orchestrator to capture full stack perf (registry, flags, docs fetch)

                // We bypass actual persistence for baseline to focus on EXTRACTION perf
                const contextStartTime = Date.now()

                // We need to get stats back. extractSingleEntityType returns raw entities[].
                // This is a limitation of the current orchestrator export.
                // For baseline, we'll temporarily hack a way or use the internal stats if we can.
                // Actually, let's just measure the duration here.

                const detailedResult = await extractSingleEntityTypeDetailed(
                    projectId,
                    userId,
                    entityType,
                    {
                        aiProvider: process.env.AI_PROVIDER || 'openai',
                        aiModel: process.env.AI_MODEL || 'gpt-4o',
                        // No cache skip flag in orchestrator yet, we should probably add one
                    }
                )
                const duration = detailedResult.stats.durationMs

                // Record metrics
                const record: MetricRecord = {
                    entityType,
                    durationMs: duration,
                    totalExtracted: detailedResult.stats.totalExtracted,
                    rejectedCount: detailedResult.rejectedCount,
                    finalCount: detailedResult.entities.length,
                    cacheHit: detailedResult.stats.cacheHit,
                    timestamp: new Date().toISOString(),
                    provider: detailedResult.stats.provider,
                    model: detailedResult.stats.model
                }

                results.push(record)

                console.log(`| ${entityType.padEnd(12)} | ${detailedResult.stats.totalExtracted.toString().padEnd(5)} | ${detailedResult.rejectedCount.toString().padEnd(8)} | ${detailedResult.entities.length.toString().padEnd(5)} | ${duration.toString().padStart(6)}ms | ${detailedResult.stats.cacheHit ? 'YES' : 'NO'} |`)

            } catch (err: any) {
                console.log(`| ${entityType.padEnd(12)} | ERROR: ${err.message.substring(0, 30)}... |`)
            }
        }

        const totalDuration = Date.now() - startTimeOverall
        console.log(`\n✨ Baseline capture complete in ${totalDuration}ms`)

        // Save to JSON for future comparison
        const outputPath = path.resolve(__dirname, 'data', `baseline-${new Date().toISOString().split('T')[0]}.json`)
        if (!fs.existsSync(path.dirname(outputPath))) {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true })
        }

        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
        console.log(`💾 Results saved to ${outputPath}`)

        process.exit(0)
    } catch (error: any) {
        console.error('\n❌ Fatal Error:', error.message)
        process.exit(1)
    }
}

const projectId = process.argv[2]
const targetEntity = process.argv[3]

if (!projectId) {
    console.error('Usage: npx ts-node -r tsconfig-paths/register scripts/capture-extraction-baseline.ts <projectId> [entityType]')
    process.exit(1)
}

runBaseline(projectId, targetEntity)
