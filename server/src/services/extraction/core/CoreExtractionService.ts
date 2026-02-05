/**
 * Core Entities Extraction Service with Dual-Write
 * 
 * Extends the existing extraction service to write core entities
 * to both Supabase and Appwrite databases simultaneously
 */

import { logger } from '../../../utils/logger'
import type { PoolClient } from 'pg'
import { dualWriteTracker } from '../dual/DualWritePersistence'
import { 
    saveStakeholdersDual, 
    saveRequirementsDual, 
    saveRisksDual 
} from '../dual/DualWritePersistence'

// Import existing extraction functions from main service
import { ProjectDataExtractionService } from '../../projectDataExtractionService'

/**
 * Core entity types for dual-write experiment
 */
export const CORE_ENTITY_TYPES = [
    'stakeholders',
    'requirements', 
    'risks'
] as const

export type CoreEntityType = typeof CORE_ENTITY_TYPES[number]

/**
 * Core extraction result with dual-write metrics
 */
export interface CoreExtractionResult {
    entityType: CoreEntityType
    extracted: number
    dualWriteResult: any
    extractionTime: number
}

/**
 * Extract core entities with dual-write to both databases
 */
export async function extractCoreEntitiesDual(
    client: PoolClient,
    projectId: string,
    userId: string,
    documents: any[],
    documentMap: Map<string, any>,
    documentList: any[],
    extractionOptions: any = {}
): Promise<CoreExtractionResult[]> {
    const startTime = Date.now()
    
    logger.info(`[CORE-DUAL] Starting core entities dual-write extraction for project ${projectId}`)
    
    // Create extraction service instance
    const extractionService = new ProjectDataExtractionService()
    
    const results: CoreExtractionResult[] = []

    // Extract each core entity type with dual-write
    for (const entityType of CORE_ENTITY_TYPES) {
        const entityStartTime = Date.now()
        
        try {
            logger.info(`[CORE-DUAL] Extracting ${entityType} with dual-write`)
            
            // Extract entities using existing extraction logic
            let entities: any[] = []
            
            switch (entityType) {
                case 'stakeholders':
                    entities = await (extractionService as any).extractStakeholders(documents, projectId, extractionOptions, documentMap, documentList)
                    break
                case 'requirements':
                    entities = await (extractionService as any).extractRequirements(documents, projectId, extractionOptions, documentMap, documentList)
                    break
                case 'risks':
                    entities = await (extractionService as any).extractRisks(documents, projectId, extractionOptions, documentMap, documentList)
                    break
                default:
                    logger.warn(`[CORE-DUAL] Unknown core entity type: ${entityType}`)
                    continue
            }

            const extractionTime = Date.now() - entityStartTime
            
            if (entities.length === 0) {
                logger.info(`[CORE-DUAL] No ${entityType} extracted`)
                results.push({
                    entityType,
                    extracted: 0,
                    dualWriteResult: null,
                    extractionTime
                })
                continue
            }

            // Perform dual-write
            let dualWriteResult = null
            switch (entityType) {
                case 'stakeholders':
                    dualWriteResult = await saveStakeholdersDual(client, projectId, userId, entities)
                    break
                case 'requirements':
                    dualWriteResult = await saveRequirementsDual(client, projectId, userId, entities)
                    break
                case 'risks':
                    dualWriteResult = await saveRisksDual(client, projectId, userId, entities)
                    break
            }

            // Track performance
            if (dualWriteResult) {
                dualWriteTracker.addResult(dualWriteResult)
            }

            results.push({
                entityType,
                extracted: entities.length,
                dualWriteResult,
                extractionTime
            })

            logger.info(`[CORE-DUAL] ${entityType} complete: ${entities.length} extracted, dual-write executed`)

        } catch (error) {
            logger.error(`[CORE-DUAL] Error processing ${entityType}:`, error)
            
            results.push({
                entityType,
                extracted: 0,
                dualWriteResult: null,
                extractionTime: Date.now() - entityStartTime
            })
        }
    }

    const totalTime = Date.now() - startTime
    const stats = dualWriteTracker.getStats()
    
    logger.info(`[CORE-DUAL] Core entities dual-write extraction complete in ${totalTime}ms:`, {
        entityTypes: CORE_ENTITY_TYPES.length,
        totalExtracted: results.reduce((sum, r) => sum + r.extracted, 0),
        dualWriteStats: stats
    })

    return results
}

/**
 * Get performance comparison statistics
 */
export function getCoreDualWriteStats() {
    return dualWriteTracker.getStats()
}

/**
 * Reset performance tracking
 */
export function resetCoreDualWriteStats() {
    dualWriteTracker.reset()
}

/**
 * Generate performance report for core entities dual-write
 */
export function generateCorePerformanceReport(results: CoreExtractionResult[]): string {
    const stats = getCoreDualWriteStats()
    
    let report = `# Core Entities Dual-Write Performance Report\n\n`
    report += `Generated: ${new Date().toISOString()}\n\n`
    
    // Summary
    report += `## Summary\n\n`
    report += `- **Total Operations**: ${stats.totalOperations}\n`
    report += `- **Total Entities**: ${stats.totalEntities}\n`
    report += `- **Overall Faster**: ${stats.overallFaster.toUpperCase()}\n`
    report += `- **Average Speed Difference**: ${stats.averageSpeedDifference}%\n\n`
    
    // Performance comparison
    report += `## Performance Comparison\n\n`
    report += `| Database | Average Time (ms) | Relative Speed |\n`
    report += `|---------|------------------|---------------|\n`
    report += `| Supabase | ${stats.averageSupabaseTime} | ${stats.overallFaster === 'supabase' ? '🚀 Faster' : stats.overallFaster === 'equal' ? '⚖️ Equal' : '🐌 Slower'} |\n`
    report += `| Appwrite | ${stats.averageAppwriteTime} | ${stats.overallFaster === 'appwrite' ? '🚀 Faster' : stats.overallFaster === 'equal' ? '⚖️ Equal' : '🐌 Slower'} |\n\n`
    
    // Entity type breakdown
    report += `## Entity Type Breakdown\n\n`
    for (const result of results) {
        if (result.dualWriteResult) {
            report += `### ${result.entityType.charAt(0).toUpperCase() + result.entityType.slice(1)}\n\n`
            report += `- **Extracted**: ${result.extracted}\n`
            report += `- **Extraction Time**: ${result.extractionTime}ms\n`
            report += `- **Supabase**: ${result.dualWriteResult.supabase.saved} saved in ${result.dualWriteResult.supabaseTime}ms\n`
            report += `- **Appwrite**: ${result.dualWriteResult.appwrite.saved} saved in ${result.dualWriteResult.appwriteTime}ms\n`
            report += `- **Faster**: ${result.dualWriteResult.performanceComparison.faster} (${result.dualWriteResult.performanceComparison.speedDifference}% faster)\n\n`
        }
    }
    
    // Recommendations
    report += `## Recommendations\n\n`
    if (stats.overallFaster === 'supabase') {
        report += `🎯 **Supabase is faster** for core entities by an average of ${stats.averageSpeedDifference}%\n`
        report += `- Consider Supabase for performance-critical applications\n`
        report += `- Use Appwrite if other factors (features, ecosystem) are more important\n`
    } else if (stats.overallFaster === 'appwrite') {
        report += `🎯 **Appwrite is faster** for core entities by an average of ${stats.averageSpeedDifference}%\n`
        report += `- Consider Appwrite for performance-critical applications\n`
        report += `- Use Supabase if other factors (features, ecosystem) are more important\n`
    } else {
        report += `⚖️ **Performance is similar** between databases\n`
        report += `- Choose based on other factors: features, ecosystem, pricing, team expertise\n`
    }
    
    return report
}
