/**
 * Agent Orchestration Types
 */

import { AgentObservation } from './BaseAgent'
import { ECSResult } from './ecs/ECSTypes'
import { AgentReview } from './ecs/CollaborationTypes'

export type ExecutionMode = 'serial' | 'parallel'

export interface SubGoal {
  id: string
  goal: string
  domain: 'pmbok' | 'discovery' | 'integration' | 'general' | 'rovo' | 'gemini'
  dependsOn?: string[]
  metadata?: Record<string, any>
}

export interface OrchestrationResult {
  success: boolean
  plan: SubGoal[]
  results: Record<string, SubGoalExecutionResult>
  summary: string
  ecsResult?: ECSResult
  executionStats?: {
    totalDurationMs: number
    mode: ExecutionMode
  }
}

export interface SubGoalExecutionResult {
  goalId: string
  success: boolean
  finalAnswer: string
  history: AgentObservation[]
  durationMs: number
  startTime?: string
  endTime?: string
  domain?: string
  metadata?: Record<string, any>
  reviews?: AgentReview[]
}

export interface OrchestrationSummary {
  goal: string
  overallSuccess: boolean
  steps: number
  summary: string
  data: any
}
