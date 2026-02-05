/**
 * Dual-Write Persistence Layer
 * 
 * Coordinates writes to both Supabase and Appwrite databases simultaneously
 * Provides performance comparison and fallback mechanisms
 */

import type { PoolClient } from 'pg'
import { logger } from '../../../utils/logger'
import type { PersistenceResult } from '../base/Persistence'

// Import Supabase save functions
import { saveStakeholders } from '../entities/stakeholders/saveStakeholders'
import { saveRequirements } from '../entities/requirements/saveRequirements'
import { saveRisks } from '../entities/risks/saveRisks'

// Import Appwrite save functions
import { 
    saveStakeholdersToAppwrite, 
    saveRequirementsToAppwrite, 
    saveRisksToAppwrite 
} from '../appwrite/AppwritePersistence'

/**
 * Dual-write result with performance metrics
 */
export interface DualWriteResult extends PersistenceResult {
    /** Supabase persistence result */
    supabase: PersistenceResult
    /** Appwrite persistence result */
    appwrite: PersistenceResult
    /** Supabase execution time (ms) */
    supabaseTime: number
    /** Appwrite execution time (ms) */
    appwriteTime: number
    /** Performance comparison */
    performanceComparison: {
        faster: 'supabase' | 'appwrite' | 'equal'
        speedDifference: number // percentage difference
    }
}

/**
 * Execute dual-write for stakeholders
 */
export async function saveStakeholdersDual(
    client: PoolClient,
    projectId: string,
    userId: string,
    stakeholders: any[]
): Promise<DualWriteResult> {
    const startTime = Date.now()
    
    logger.info(`[DUAL-WRITE] Starting dual-write for ${stakeholders.length} stakeholders`)

    // Execute Supabase write
    const supabaseStart = Date.now()
    const supabase = await saveStakeholders(client, projectId, userId, stakeholders)
    const supabaseTime = Date.now() - supabaseStart

    // Execute Appwrite write
    const appwriteStart = Date.now()
    const appwrite = await saveStakeholdersToAppwrite(projectId, userId, stakeholders)
    const appwriteTime = Date.now() - appwriteStart

    // Calculate performance comparison
    const performanceComparison = calculatePerformanceComparison(supabaseTime, appwriteTime)

    const totalTime = Date.now() - startTime
    const combinedResult: DualWriteResult = {
        saved: supabase.saved + appwrite.saved,
        skipped: supabase.skipped + appwrite.skipped,
        failed: supabase.failed + appwrite.failed,
        supabase,
        appwrite,
        supabaseTime,
        appwriteTime,
        performanceComparison
    }

    logger.info(`[DUAL-WRITE] Stakeholders complete in ${totalTime}ms:`, {
        total: combinedResult.saved,
        supabase: `${supabase.saved} saved in ${supabaseTime}ms`,
        appwrite: `${appwrite.saved} saved in ${appwriteTime}ms`,
        faster: performanceComparison.faster,
        speedDifference: `${performanceComparison.speedDifference}%`
    })

    return combinedResult
}

/**
 * Execute dual-write for requirements
 */
export async function saveRequirementsDual(
    client: PoolClient,
    projectId: string,
    userId: string,
    requirements: any[]
): Promise<DualWriteResult> {
    const startTime = Date.now()
    
    logger.info(`[DUAL-WRITE] Starting dual-write for ${requirements.length} requirements`)

    // Execute Supabase write
    const supabaseStart = Date.now()
    const supabase = await saveRequirements(client, projectId, userId, requirements)
    const supabaseTime = Date.now() - supabaseStart

    // Execute Appwrite write
    const appwriteStart = Date.now()
    const appwrite = await saveRequirementsToAppwrite(projectId, userId, requirements)
    const appwriteTime = Date.now() - appwriteStart

    // Calculate performance comparison
    const performanceComparison = calculatePerformanceComparison(supabaseTime, appwriteTime)

    const totalTime = Date.now() - startTime
    const combinedResult: DualWriteResult = {
        saved: supabase.saved + appwrite.saved,
        skipped: supabase.skipped + appwrite.skipped,
        failed: supabase.failed + appwrite.failed,
        supabase,
        appwrite,
        supabaseTime,
        appwriteTime,
        performanceComparison
    }

    logger.info(`[DUAL-WRITE] Requirements complete in ${totalTime}ms:`, {
        total: combinedResult.saved,
        supabase: `${supabase.saved} saved in ${supabaseTime}ms`,
        appwrite: `${appwrite.saved} saved in ${appwriteTime}ms`,
        faster: performanceComparison.faster,
        speedDifference: `${performanceComparison.speedDifference}%`
    })

    return combinedResult
}

/**
 * Execute dual-write for risks
 */
export async function saveRisksDual(
    client: PoolClient,
    projectId: string,
    userId: string,
    risks: any[]
): Promise<DualWriteResult> {
    const startTime = Date.now()
    
    logger.info(`[DUAL-WRITE] Starting dual-write for ${risks.length} risks`)

    // Execute Supabase write
    const supabaseStart = Date.now()
    const supabase = await saveRisks(client, projectId, userId, risks)
    const supabaseTime = Date.now() - supabaseStart

    // Execute Appwrite write
    const appwriteStart = Date.now()
    const appwrite = await saveRisksToAppwrite(projectId, userId, risks)
    const appwriteTime = Date.now() - appwriteStart

    // Calculate performance comparison
    const performanceComparison = calculatePerformanceComparison(supabaseTime, appwriteTime)

    const totalTime = Date.now() - startTime
    const combinedResult: DualWriteResult = {
        saved: supabase.saved + appwrite.saved,
        skipped: supabase.skipped + appwrite.skipped,
        failed: supabase.failed + appwrite.failed,
        supabase,
        appwrite,
        supabaseTime,
        appwriteTime,
        performanceComparison
    }

    logger.info(`[DUAL-WRITE] Risks complete in ${totalTime}ms:`, {
        total: combinedResult.saved,
        supabase: `${supabase.saved} saved in ${supabaseTime}ms`,
        appwrite: `${appwrite.saved} saved in ${appwriteTime}ms`,
        faster: performanceComparison.faster,
        speedDifference: `${performanceComparison.speedDifference}%`
    })

    return combinedResult
}

/**
 * Calculate performance comparison between two execution times
 */
function calculatePerformanceComparison(supabaseTime: number, appwriteTime: number): {
    faster: 'supabase' | 'appwrite' | 'equal'
    speedDifference: number
} {
    if (Math.abs(supabaseTime - appwriteTime) < 10) { // Within 10ms = equal
        return {
            faster: 'equal',
            speedDifference: 0
        }
    }

    if (supabaseTime < appwriteTime) {
        const speedDifference = Math.round(((appwriteTime - supabaseTime) / appwriteTime) * 100)
        return {
            faster: 'supabase',
            speedDifference
        }
    } else {
        const speedDifference = Math.round(((supabaseTime - appwriteTime) / supabaseTime) * 100)
        return {
            faster: 'appwrite',
            speedDifference
        }
    }
}

/**
 * Performance statistics for dual-write operations
 */
export interface DualWriteStats {
    totalOperations: number
    totalEntities: number
    averageSupabaseTime: number
    averageAppwriteTime: number
    overallFaster: 'supabase' | 'appwrite' | 'equal'
    averageSpeedDifference: number
}

/**
 * Track performance statistics across multiple dual-write operations
 */
export class DualWritePerformanceTracker {
    private results: DualWriteResult[] = []

    addResult(result: DualWriteResult): void {
        this.results.push(result)
    }

    getStats(): DualWriteStats {
        if (this.results.length === 0) {
            return {
                totalOperations: 0,
                totalEntities: 0,
                averageSupabaseTime: 0,
                averageAppwriteTime: 0,
                overallFaster: 'equal',
                averageSpeedDifference: 0
            }
        }

        const totalOperations = this.results.length
        const totalEntities = this.results.reduce((sum, r) => sum + r.saved, 0)
        const totalSupabaseTime = this.results.reduce((sum, r) => sum + r.supabaseTime, 0)
        const totalAppwriteTime = this.results.reduce((sum, r) => sum + r.appwriteTime, 0)
        
        const averageSupabaseTime = Math.round(totalSupabaseTime / totalOperations)
        const averageAppwriteTime = Math.round(totalAppwriteTime / totalOperations)
        
        const fasterCount = this.results.reduce((count, r) => {
            return r.performanceComparison.faster === 'supabase' ? count + 1 : count
        }, 0)
        
        const overallFaster = fasterCount > totalOperations / 2 ? 'supabase' : 
                            fasterCount < totalOperations / 2 ? 'appwrite' : 'equal'
        
        const averageSpeedDifference = Math.round(
            this.results.reduce((sum, r) => sum + r.performanceComparison.speedDifference, 0) / totalOperations
        )

        return {
            totalOperations,
            totalEntities,
            averageSupabaseTime,
            averageAppwriteTime,
            overallFaster,
            averageSpeedDifference
        }
    }

    reset(): void {
        this.results = []
    }
}

// Global performance tracker instance
export const dualWriteTracker = new DualWritePerformanceTracker()
