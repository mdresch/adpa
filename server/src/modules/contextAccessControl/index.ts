/**
 * Context Access Control Module
 * Exports all context access control components and types
 */

export { ContextAccessControlManager } from './contextAccessControlManager'
export { AccessControlEngine } from './services/accessControlEngine'
export { RoleManager } from './services/roleManager'
export { PermissionManager } from './services/permissionManager'
export { SecurityManager } from './services/securityManager'
export { AuditManager } from './services/auditManager'

export type {
  // Core service types
  ContextAccessControlManager as IContextAccessControlManager,
  AccessControlEngine as IAccessControlEngine,
  RoleManager as IRoleManager,
  PermissionManager as IPermissionManager,
  SecurityManager as ISecurityManager,
  AuditManager as IAuditManager,

  // Main access control types
  AccessDecision,
  AccessDecisionMetadata,
  EvaluationStep,
  RiskAssessment,
  RiskFactor,
  MitigationStrategy,
  MonitoringRequirement,
  AlertCondition,
  ComplianceCheck,
  ComplianceViolation,
  ComplianceRecommendation,
  AuditRequirement,
  AuditTrailEntry,

  // Access control types
  AccessAction,
  Permission,
  ResourceType,
  PermissionCondition,
  ConditionType,
  PermissionConstraint,
  ConstraintType,
  PermissionMetadata,
  NotificationSettings,
  NotificationChannel,
  CreatePermissionRequest,
  PermissionFilters,

  // Role management types
  UserRole,
  UserRoleMetadata,
  Role,
  RoleType,
  RoleConstraint,
  RoleMetadata,

  // Security types
  SecurityLevel,
  AccessLevel,
  AccessRestriction,
  RestrictionType,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SecurityCheck,
  ValidationRecommendation,

  // Audit and monitoring types
  AccessAttempt,
  AccessAttemptMetadata,
  AccessLog,
  AccessLogFilters,
  AccessReport,
  AccessByUser,
  AccessByContext,
  AccessByAction,
  SecurityIncident,
  AccessReportRecommendation,
  AccessTrend,
  TrendDataPoint,
  AccessForecast,
  ForecastFactor,
  AccessPatternAnalysis,
  AccessPattern,
  AccessAnomaly,
  RiskIndicator,
  PatternRecommendation,

  // Security policy types
  SecurityPolicy,
  SecurityPolicyType,
  SecurityRule,
  SecurityCondition,
  SecurityAction,
  SecurityActionType,
  NotificationConfig,
  NotificationCondition,
  EscalationConfig,
  EscalationLevel,
  EscalationTrigger,
  EscalationAction,
  ViolationAction,
  ViolationActionType,
  SecurityPolicyMetadata,

  // Configuration types
  AccessControlConfig,
  PasswordPolicy,
  AccessControlService
} from './types'

