/**
 * Multi-Agent Collaboration & Consensus Types
 */

export type ReviewType = 'agreement' | 'contradiction' | 'refinement' | 'supplement'

export interface AgentReview {
  reviewerId: string
  targetId: string
  type: ReviewType
  content: string
  confidenceAdjustment: number // -1.0 to 1.0
  justification: string
}

export interface CollaborationNode {
  id: string
  agentId: string
  output: string
  metadata: any
}

export interface CollaborationEdge {
  fromId: string // Reviewer Node ID
  toId: string   // Target Node ID
  type: ReviewType
  metadata: any
}

export interface CollaborationGraph {
  nodes: CollaborationNode[]
  edges: CollaborationEdge[]
  consensusScore: number // 0.0 to 1.0
}
