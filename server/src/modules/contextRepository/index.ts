/**
 * Context Repository Module
 * Exports all context repository components and types
 */

export { ContextRepository } from './contextRepository'
export { ProjectContextStore } from './stores/projectContextStore'
export { UserProfileStore } from './stores/userProfileStore'
export { DocumentHistoryStore } from './stores/documentHistoryStore'

export type {
  // Core types
  ContextRepository as IContextRepository,
  ProjectContextStore as IProjectContextStore,
  UserProfileStore as IUserProfileStore,
  DocumentHistoryStore as IDocumentHistoryStore,

  // Project context types
  ProjectContext,
  Stakeholder,
  Requirement,
  Constraint,
  Timeline,
  Risk,
  SuccessCriteria,
  Milestone,
  Phase,
  ProjectFilters,

  // User profile types
  UserProfile,
  UserPreferences,
  UserExpertise,
  WritingStyle,
  DomainKnowledge,
  CollaborationPreferences,
  NotificationPreferences,
  AccessibilityPreferences,
  PrivacyPreferences,
  AvailabilitySchedule,
  WorkingHours,
  UserFilters,

  // Document history types
  DocumentHistory,
  UsagePattern,
  QualityMetrics,
  BestPractice,
  QualityTrend,
  DocumentFilters
} from './types'
