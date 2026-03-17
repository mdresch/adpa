import { ProjectTemporalState, TemporalEvidenceRecord, HistoricalConsensusRecord } from './TemporalMemoryTypes'
import { logger } from '../../../utils/logger'

/**
 * Temporal Memory Store
 * Manages the persistence of evidence and consensus history across orchestration sessions.
 */
export class TemporalMemoryStore {
  private static instance: TemporalMemoryStore
  private projectStates: Map<string, ProjectTemporalState> = new Map()

  private constructor() {}

  static getInstance(): TemporalMemoryStore {
    if (!TemporalMemoryStore.instance) {
      TemporalMemoryStore.instance = new TemporalMemoryStore()
    }
    return TemporalMemoryStore.instance
  }

  /**
   * Loads the temporal state for a specific project.
   */
  async loadProjectState(projectId: string): Promise<ProjectTemporalState> {
    // In production, this would fetch from 'project_temporal_memory' or similar table
    let state = this.projectStates.get(projectId)
    
    if (!state) {
      state = {
        projectId,
        evidenceHistory: [],
        consensusHistory: [],
        lastUpdated: new Date().toISOString()
      }
      this.projectStates.set(projectId, state)
    }
    
    return state
  }

  /**
   * Saves/Updates evidence and consensus records for a project.
   */
  async saveRun(
    projectId: string, 
    evidence: TemporalEvidenceRecord[], 
    consensus: HistoricalConsensusRecord
  ): Promise<void> {
    const state = await this.loadProjectState(projectId)
    
    // Add new evidence (limit history size if needed)
    state.evidenceHistory.push(...evidence)
    if (state.evidenceHistory.length > 500) {
      state.evidenceHistory = state.evidenceHistory.slice(-500)
    }

    // Add consensus record
    state.consensusHistory.push(consensus)
    if (state.consensusHistory.length > 100) {
      state.consensusHistory = state.consensusHistory.slice(-100)
    }

    state.lastUpdated = new Date().toISOString()
    this.projectStates.set(projectId, state)
    
    logger.info(`[TEMPORAL-MEM] Saved run for project ${projectId}. Total evidence: ${state.evidenceHistory.length}`)
  }

  /**
   * Clears state (primarily for testing)
   */
  clear(): void {
    this.projectStates.clear()
  }
}

export const globalTemporalMemoryStore = TemporalMemoryStore.getInstance()
