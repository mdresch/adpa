// Process Flow Types
// Extracted from app/process-flow/page.tsx for better maintainability

export interface Template {
  id: string
  name: string
  description?: string
  framework?: string
  content?: string
  status?: string
  health_rating?: string
  last_validated?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  framework?: string
  document_count?: number
}

export interface AIProvider {
  id: string
  name: string
  type: string
  enabled: boolean
  models?: string[]
}

export interface ProcessingStep {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  metadata?: {
    documents?: any[]
    compressedCount?: number
    originalTokens?: number
    compressedTokens?: number
    tokensSaved?: number
    [key: string]: any
  }
  result?: {
    description?: string
    tokens?: number
    startTime?: string
    endTime?: string
    contextAdded?: string
  }
}

export interface WorkflowConfig {
  compressionLevel: number
  priorityStrategy: string
  maxDocuments: number
  includeStakeholders: boolean
  contextOptimization: {
    enabled: boolean
    redundancyRemoval: boolean
    semanticCompression: boolean
    adaptiveSampling: boolean
  }
}

export interface DocumentPriority {
  id: string
  title: string
  relevanceScore: number
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  estimatedTokens: number
  lifecyclePhase?: string
  reason?: string
}

export interface ContentBlock {
  id: string
  type: 'introduction' | 'analysis' | 'recommendations' | 'conclusion' | 'custom'
  title: string
  description: string
  wordCount: number
  priority: 'high' | 'medium' | 'low'
  required: boolean
  order: number
}

export interface Stakeholder {
  id: string
  name: string | null
  email: string | null
  role: string
  department: string | null
  stakeholder_type: string
  stakeholder_category: string
  power_level?: number
  interest_level?: number
}

export interface ContextWindowAnalysis {
  templateTokens: number
  metadataTokens: number
  stakeholderTokens: number
  documentTokens: number
  aiResponseTokens: number
  totalTokens: number
  contextWindow: number
  utilizationPercentage: number
}

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'failed'

export type PriorityStrategy = 
  | 'lifecycle'
  | 'relevance'
  | 'manual'
  | 'token-optimized'
  | 'time-based'

// Status configuration types
export interface StatusConfig {
  emoji: string
  label: string
  color: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
}

export type HealthRating = 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement'

export interface HealthConfig {
  color: string
  bgColor: string
  icon: string
}

