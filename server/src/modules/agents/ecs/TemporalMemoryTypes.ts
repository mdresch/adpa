/**
 * Temporal Reasoning & State Persistence Types
 */

export interface TemporalEvidenceRecord {
  id: string
  timestamp: string
  agentId: string
  domain: string
  content: any
  weight: number
  consensusScore?: number
  metadata?: any
}

export interface HistoricalConsensusRecord {
  id: string
  goal: string
  timestamp: string
  consensusScore: number
  finalAnswer: string
  evidenceSnapshot: string[] // IDs of evidence records used
}

export interface ProjectTemporalState {
  projectId: string
  evidenceHistory: TemporalEvidenceRecord[]
  consensusHistory: HistoricalConsensusRecord[]
  lastUpdated: string
}

export interface TemporalECSOptions {
  decayHalfLifeDays: number
  reinforcementBonus: number
  conflictPenalty: number
}
