/**
 * Playbook Constants
 * Centralized constants for playbook operations (shared between frontend and backend)
 */

// System user GUID for automated operations
export const SYSTEM_USER_GUID = '00000000-0000-0000-0000-000000000000'

// Confidence scoring weights (total should equal 100)
export const CONFIDENCE_WEIGHTS = {
    CATEGORY_MATCH: 40,    // 40% weight for category matching
    PRIORITY_MATCH: 25,   // 25% weight for priority matching
    SUCCESS_RATE: 20,      // 20% weight for historical success rate
    RECENCY: 15           // 15% weight for recency and relevance
} as const

// Default confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
    HIGH: 80,      // High confidence threshold
    MEDIUM: 60,    // Medium confidence threshold
    AUTO_ASSIGN: 75 // Default auto-assignment threshold
} as const

// Playbook matching scores
export const MATCH_SCORES = {
    CATEGORY_EXACT: 2,    // Points for exact category match
    RISK_CATEGORY: 1,    // Points for risk category match
    SEVERITY_LEVEL: 1,   // Points for severity level match
    PRIORITY_LEVEL: 1    // Points for priority level match
} as const

// Step types
export const STEP_TYPES = {
    ACTION: 'action',
    APPROVAL: 'approval',
    NOTIFICATION: 'notification',
    ESCALATION: 'escalation',
    DOCUMENTATION: 'documentation',
    WAIT: 'wait'
} as const

// Execution statuses
export const EXECUTION_STATUSES = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    FAILED: 'failed'
} as const

// Trigger types
export const TRIGGER_TYPES = {
    AUTO: 'auto',
    MANUAL: 'manual',
    THRESHOLD: 'threshold'
} as const

// Playbook categories
export const PLAYBOOK_CATEGORIES = {
    RISK: 'risk',
    INCIDENT: 'incident',
    ESCALATION: 'escalation',
    RESOLUTION: 'resolution'
} as const
