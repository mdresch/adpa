/**
 * Context Access Control Types
 * Defines TypeScript interfaces and types for role-based access control
 */

export interface RoleManager {
  createRole(role: Role): Promise<Role>
  updateRole(roleId: string, updates: Partial<Role>): Promise<Role>
  deleteRole(roleId: string): Promise<void>
  getRole(roleId: string): Promise<Role | null>
  listRoles(filters?: any): Promise<Role[]>
  assignRole(userId: string, roleId: string, contextId?: string): Promise<void>
  removeRole(userId: string, roleId: string, contextId?: string): Promise<void>
}

export interface PermissionManager {
  createPermission(permission: CreatePermissionRequest): Promise<Permission>
  updatePermission(permissionId: string, updates: Partial<Permission>): Promise<Permission>
  deletePermission(permissionId: string): Promise<void>
  getPermission(permissionId: string): Promise<Permission | null>
  listPermissions(filters?: PermissionFilters): Promise<Permission[]>
}

export interface SecurityManager {
  validateContextAccess(userId: string, contextId: string): Promise<ValidationResult>
  setContextSecurityLevel(contextId: string, level: SecurityLevel): Promise<void>
  getContextSecurityLevel(contextId: string): Promise<SecurityLevel>
  monitorSecurityIncidents(): Promise<SecurityIncident[]>
}

export interface AuditManager {
  logAccessAttempt(attempt: AccessAttempt): Promise<void>
  getAccessLogs(filters?: AccessLogFilters): Promise<AccessLog[]>
  generateAccessReport(timeframe: string): Promise<AccessReport>
}

export interface ContextAccessControlManager {
  // Access control
  checkAccess(userId: string, contextId: string, action: AccessAction): Promise<AccessDecision>
  checkBatchAccess(userId: string, contextIds: string[], action: AccessAction): Promise<AccessDecision[]>
  grantAccess(userId: string, contextId: string, permissions: Permission[]): Promise<void>
  revokeAccess(userId: string, contextId: string, permissions: Permission[]): Promise<void>
  updateAccess(userId: string, contextId: string, permissions: Permission[]): Promise<void>
  
  // Role management
  assignRole(userId: string, roleId: string, contextId?: string): Promise<void>
  removeRole(userId: string, roleId: string, contextId?: string): Promise<void>
  getUserRoles(userId: string, contextId?: string): Promise<UserRole[]>
  getRolePermissions(roleId: string): Promise<Permission[]>
  
  // Permission management
  createPermission(permission: CreatePermissionRequest): Promise<Permission>
  updatePermission(permissionId: string, updates: Partial<Permission>): Promise<Permission>
  deletePermission(permissionId: string): Promise<void>
  listPermissions(filters?: PermissionFilters): Promise<Permission[]>
  
  // Context security
  setContextSecurityLevel(contextId: string, securityLevel: SecurityLevel): Promise<void>
  getContextSecurityLevel(contextId: string): Promise<SecurityLevel>
  validateContextAccess(userId: string, contextId: string): Promise<ValidationResult>
  
  // Audit and monitoring
  logAccessAttempt(accessAttempt: AccessAttempt): Promise<void>
  getAccessLogs(filters?: AccessLogFilters): Promise<AccessLog[]>
  generateAccessReport(timeframe: string): Promise<AccessReport>
  monitorAccessPatterns(): Promise<AccessPatternAnalysis>
}

export interface AccessDecision {
  allowed: boolean
  reason: string
  required_permissions: Permission[]
  user_permissions: Permission[]
  missing_permissions: Permission[]
  context_security_level: SecurityLevel
  user_security_clearance: SecurityLevel
  access_level: AccessLevel
  restrictions: AccessRestriction[]
  metadata: AccessDecisionMetadata
}

export interface AccessDecisionMetadata {
  decision_id: string
  decision_time: Date
  decision_duration: number
  evaluation_steps: EvaluationStep[]
  risk_assessment: RiskAssessment
  compliance_check: ComplianceCheck
  audit_trail: AuditTrailEntry[]
}

export interface EvaluationStep {
  step_name: string
  step_type: 'role_check' | 'permission_check' | 'security_check' | 'context_check' | 'policy_check'
  result: boolean
  details: string
  duration: number
  metadata: Record<string, any>
}

export interface RiskAssessment {
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_factors: RiskFactor[]
  risk_score: number
  mitigation_strategies: MitigationStrategy[]
  monitoring_requirements: MonitoringRequirement[]
}

export interface RiskFactor {
  factor: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  probability: number
  impact: number
  description: string
  mitigation: string
}

export interface MitigationStrategy {
  strategy: string
  effectiveness: number
  implementation_effort: 'low' | 'medium' | 'high'
  timeframe: string
  dependencies: string[]
}

export interface MonitoringRequirement {
  metric: string
  threshold: number
  frequency: 'real_time' | 'hourly' | 'daily' | 'weekly'
  alert_conditions: AlertCondition[]
}

export interface AlertCondition {
  condition: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  action: string
}

export interface ComplianceCheck {
  compliant: boolean
  compliance_framework: string
  compliance_level: string
  violations: ComplianceViolation[]
  recommendations: ComplianceRecommendation[]
  audit_requirements: AuditRequirement[]
}

export interface ComplianceViolation {
  violation_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  regulation: string
  impact: string
  remediation: string
}

export interface ComplianceRecommendation {
  recommendation: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  implementation: string
  expected_benefit: string
  timeframe: string
}

export interface AuditRequirement {
  requirement: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  scope: string
  documentation: string
}

export interface AuditTrailEntry {
  entry_id: string
  timestamp: Date
  user_id: string
  action: string
  resource: string
  result: 'success' | 'failure' | 'denied'
  details: string
  ip_address: string
  user_agent: string
  session_id: string
  metadata: Record<string, any>
}

export type AccessAction = 
  | 'read'
  | 'write'
  | 'update'
  | 'delete'
  | 'share'
  | 'export'
  | 'import'
  | 'admin'
  | 'audit'

export interface Permission {
  id: string
  name: string
  description: string
  action: AccessAction
  resource_type: ResourceType
  resource_id?: string
  conditions: PermissionCondition[]
  constraints: PermissionConstraint[]
  metadata: PermissionMetadata
  created_at: Date
  updated_at: Date
  created_by: string
}

export type ResourceType = 
  | 'context_item'
  | 'context_bundle'
  | 'context_source'
  | 'template'
  | 'document'
  | 'project'
  | 'user'
  | 'system'
  | 'all'

export interface PermissionCondition {
  condition_type: ConditionType
  field: string
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'greater_than' | 'less_than'
  value: any
  logical_operator?: 'and' | 'or'
  nested_conditions?: PermissionCondition[]
}

export type ConditionType = 
  | 'user_attribute'
  | 'resource_attribute'
  | 'time_based'
  | 'location_based'
  | 'context_based'
  | 'custom'

export interface PermissionConstraint {
  constraint_type: ConstraintType
  constraint_value: any
  enforcement_level: 'strict' | 'warning' | 'informational'
  violation_action: 'deny' | 'warn' | 'log' | 'escalate'
}

export type ConstraintType = 
  | 'time_window'
  | 'ip_range'
  | 'device_type'
  | 'location'
  | 'data_classification'
  | 'usage_limit'
  | 'rate_limit'

export interface PermissionMetadata {
  version: string
  tags: string[]
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  expiration_date?: Date
  auto_revoke: boolean
  notification_settings: NotificationSettings
}

export interface NotificationSettings {
  notify_on_grant: boolean
  notify_on_revoke: boolean
  notify_on_violation: boolean
  notification_channels: NotificationChannel[]
  recipients: string[]
}

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'webhook' | 'sms'

export interface CreatePermissionRequest {
  name: string
  description: string
  action: AccessAction
  resource_type: ResourceType
  resource_id?: string
  conditions: PermissionCondition[]
  constraints: PermissionConstraint[]
  metadata: PermissionMetadata
}

export interface PermissionFilters {
  action?: AccessAction
  resource_type?: ResourceType
  resource_id?: string
  created_by?: string
  tags?: string[]
  category?: string
  priority?: string
  created_after?: Date
  created_before?: Date
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  role_name: string
  role_description: string
  context_id?: string
  context_name?: string
  assigned_at: Date
  assigned_by: string
  expires_at?: Date
  is_active: boolean
  permissions: Permission[]
  metadata: UserRoleMetadata
}

export interface UserRoleMetadata {
  assignment_reason: string
  approval_workflow: string
  review_required: boolean
  next_review_date?: Date
  compliance_notes: string[]
  risk_assessment: string
}

export interface AccessControlEngine {
  evaluateAccess(userId: string, contextId: string, action: AccessAction): Promise<AccessDecision>
  evaluateBatchAccess(userId: string, contextIds: string[], action: AccessAction): Promise<AccessDecision[]>
  evaluateRolePermissions(roleId: string, action: AccessAction): Promise<Permission[]>
  evaluateUserPermissions(userId: string, action: AccessAction): Promise<Permission[]>
  validateConstraints(permissions: Permission[], contextId: string): Promise<boolean>
  assessRisk(userId: string, contextId: string, action: AccessAction): Promise<RiskAssessment>
}

export interface ComplianceRequirement {
  id: string
  name: string
  description: string
  framework: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'inactive' | 'deprecated'
  metadata: Record<string, any>
}

export type SecurityLevel = 
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'top_secret'

export type AccessLevel = 
  | 'no_access'
  | 'read_only'
  | 'read_write'
  | 'full_access'
  | 'admin_access'

export interface AccessRestriction {
  restriction_type: RestrictionType
  restriction_value: any
  reason: string
  override_allowed: boolean
  override_approval_required: boolean
}

export type RestrictionType = 
  | 'time_based'
  | 'location_based'
  | 'device_based'
  | 'data_classification'
  | 'usage_limit'
  | 'rate_limit'
  | 'ip_based'
  | 'custom'

export interface ValidationResult {
  valid: boolean
  validation_errors: ValidationError[]
  validation_warnings: ValidationWarning[]
  security_checks: SecurityCheck[]
  compliance_checks: ComplianceCheck[]
  risk_assessment: RiskAssessment
  recommendations: ValidationRecommendation[]
}

export interface ValidationError {
  field: string
  error_code: string
  message: string
  severity: 'error' | 'warning' | 'info'
  remediation: string
}

export interface ValidationWarning {
  field: string
  warning_code: string
  message: string
  impact: string
  recommendation: string
}

export interface SecurityCheck {
  check_type: string
  check_name: string
  result: 'pass' | 'fail' | 'warning'
  details: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  remediation: string
}

export interface ValidationRecommendation {
  type: 'security' | 'compliance' | 'performance' | 'usability'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  implementation: string
  expected_benefit: string
  timeframe: string
}

export interface AccessAttempt {
  attempt_id: string
  user_id: string
  context_id: string
  action: AccessAction
  timestamp: Date
  ip_address: string
  user_agent: string
  session_id: string
  result: 'success' | 'failure' | 'denied'
  reason: string
  duration: number
  metadata: AccessAttemptMetadata
}

export interface AccessAttemptMetadata {
  request_size: number
  response_size: number
  processing_time: number
  cache_hit: boolean
  security_checks_performed: string[]
  compliance_checks_performed: string[]
  risk_assessment_performed: boolean
  audit_trail_generated: boolean
}

export interface AccessLog {
  id: string
  user_id: string
  context_id: string
  action: AccessAction
  timestamp: Date
  ip_address: string
  user_agent: string
  session_id: string
  result: 'success' | 'failure' | 'denied'
  reason: string
  duration: number
  security_level: SecurityLevel
  access_level: AccessLevel
  restrictions_applied: AccessRestriction[]
  metadata: Record<string, any>
}

export interface AccessLogFilters {
  user_id?: string
  context_id?: string
  action?: AccessAction
  result?: 'success' | 'failure' | 'denied'
  security_level?: SecurityLevel
  access_level?: AccessLevel
  timestamp_after?: Date
  timestamp_before?: Date
  ip_address?: string
  session_id?: string
}

export interface AccessReport {
  report_id: string
  generated_at: Date
  timeframe: string
  total_access_attempts: number
  successful_accesses: number
  failed_accesses: number
  denied_accesses: number
  access_by_user: AccessByUser[]
  access_by_context: AccessByContext[]
  access_by_action: AccessByAction[]
  security_incidents: SecurityIncident[]
  compliance_violations: ComplianceViolation[]
  risk_assessment: RiskAssessment
  recommendations: AccessReportRecommendation[]
  trends: AccessTrend[]
}

export interface AccessByUser {
  user_id: string
  username: string
  total_accesses: number
  successful_accesses: number
  failed_accesses: number
  denied_accesses: number
  average_duration: number
  security_level: SecurityLevel
  risk_score: number
}

export interface AccessByContext {
  context_id: string
  context_name: string
  total_accesses: number
  successful_accesses: number
  failed_accesses: number
  denied_accesses: number
  unique_users: number
  security_level: SecurityLevel
  risk_score: number
}

export interface AccessByAction {
  action: AccessAction
  total_attempts: number
  successful_attempts: number
  failed_attempts: number
  denied_attempts: number
  average_duration: number
  risk_score: number
}

export interface SecurityIncident {
  incident_id: string
  incident_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detected_at: Date
  user_id: string
  context_id: string
  action: AccessAction
  ip_address: string
  risk_factors: RiskFactor[]
  mitigation_taken: string[]
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  resolution: string
  metadata: Record<string, any>
}

export interface AccessReportRecommendation {
  type: 'security' | 'compliance' | 'performance' | 'usability'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  implementation: string
  expected_benefit: string
  timeframe: string
  resources_required: string[]
  dependencies: string[]
}

export interface AccessTrend {
  metric: string
  timeframe: string
  trend_data: TrendDataPoint[]
  trend_direction: 'increasing' | 'decreasing' | 'stable'
  trend_strength: number
  seasonality: boolean
  forecast: AccessForecast
}

export interface TrendDataPoint {
  timestamp: Date
  value: number
  confidence: number
}

export interface AccessForecast {
  next_value: number
  confidence_interval: [number, number]
  forecast_horizon: number
  accuracy: number
  factors: ForecastFactor[]
}

export interface ForecastFactor {
  factor: string
  impact: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface AccessPatternAnalysis {
  analysis_id: string
  analyzed_at: Date
  timeframe: string
  total_accesses: number
  unique_users: number
  unique_contexts: number
  access_patterns: AccessPattern[]
  anomalies: AccessAnomaly[]
  risk_indicators: RiskIndicator[]
  recommendations: PatternRecommendation[]
  trends: AccessTrend[]
}

export interface AccessPattern {
  pattern_id: string
  pattern_type: string
  pattern_name: string
  description: string
  frequency: number
  confidence: number
  users_affected: number
  contexts_affected: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  metadata: Record<string, any>
}

export interface AccessAnomaly {
  anomaly_id: string
  anomaly_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detected_at: Date
  user_id: string
  context_id: string
  action: AccessAction
  anomaly_score: number
  risk_factors: RiskFactor[]
  investigation_required: boolean
  status: 'new' | 'investigating' | 'resolved' | 'false_positive'
  resolution: string
  metadata: Record<string, any>
}

export interface RiskIndicator {
  indicator_id: string
  indicator_type: string
  indicator_name: string
  description: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  frequency: number
  impact: number
  mitigation_strategies: MitigationStrategy[]
  monitoring_requirements: MonitoringRequirement[]
  metadata: Record<string, any>
}

export interface PatternRecommendation {
  type: 'security' | 'compliance' | 'performance' | 'usability'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  implementation: string
  expected_benefit: string
  timeframe: string
  resources_required: string[]
  dependencies: string[]
}

export interface Role {
  id: string
  name: string
  description: string
  role_type: RoleType
  permissions: Permission[]
  constraints: RoleConstraint[]
  metadata: RoleMetadata
  created_at: Date
  updated_at: Date
  created_by: string
}

export type RoleType = 
  | 'system'
  | 'organization'
  | 'project'
  | 'context'
  | 'custom'

export interface RoleConstraint {
  constraint_type: ConstraintType
  constraint_value: any
  enforcement_level: 'strict' | 'warning' | 'informational'
  violation_action: 'deny' | 'warn' | 'log' | 'escalate'
}

export interface RoleMetadata {
  version: string
  tags: string[]
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  expiration_date?: Date
  auto_revoke: boolean
  notification_settings: NotificationSettings
  compliance_requirements: ComplianceRequirement[]
}

export interface SecurityPolicy {
  policy_id: string
  name: string
  description: string
  policy_type: SecurityPolicyType
  rules: SecurityRule[]
  enforcement_level: 'strict' | 'warning' | 'informational'
  violation_actions: ViolationAction[]
  metadata: SecurityPolicyMetadata
  created_at: Date
  updated_at: Date
  created_by: string
}

export type SecurityPolicyType = 
  | 'access_control'
  | 'data_classification'
  | 'encryption'
  | 'audit'
  | 'compliance'
  | 'incident_response'
  | 'risk_management'

export interface SecurityRule {
  rule_id: string
  rule_name: string
  description: string
  condition: SecurityCondition
  action: SecurityAction
  priority: number
  enabled: boolean
  metadata: Record<string, any>
}

export interface SecurityCondition {
  condition_type: ConditionType
  field: string
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'greater_than' | 'less_than'
  value: any
  logical_operator?: 'and' | 'or'
  nested_conditions?: SecurityCondition[]
}

export interface SecurityAction {
  action_type: SecurityActionType
  parameters: Record<string, any>
  notification?: NotificationConfig
  escalation?: EscalationConfig
}

export type SecurityActionType = 
  | 'allow'
  | 'deny'
  | 'warn'
  | 'log'
  | 'escalate'
  | 'notify'
  | 'quarantine'
  | 'encrypt'
  | 'audit'

export interface NotificationConfig {
  channels: NotificationChannel[]
  recipients: string[]
  template: string
  frequency: 'immediate' | 'daily' | 'weekly'
  conditions: NotificationCondition[]
}

export interface NotificationCondition {
  field: string
  operator: string
  value: any
}

export interface EscalationConfig {
  escalation_levels: EscalationLevel[]
  escalation_triggers: EscalationTrigger[]
  escalation_timeout: number
  escalation_actions: EscalationAction[]
}

export interface EscalationLevel {
  level: number
  recipients: string[]
  channels: NotificationChannel[]
  timeout: number
  actions: EscalationAction[]
}

export interface EscalationTrigger {
  trigger_type: string
  condition: string
  threshold: number
  time_window: number
}

export interface EscalationAction {
  action_type: string
  parameters: Record<string, any>
  notification?: NotificationConfig
}

export interface ViolationAction {
  action_type: ViolationActionType
  parameters: Record<string, any>
  notification?: NotificationConfig
  escalation?: EscalationConfig
}

export type ViolationActionType = 
  | 'deny_access'
  | 'warn_user'
  | 'log_violation'
  | 'escalate_to_admin'
  | 'quarantine_resource'
  | 'notify_security_team'
  | 'trigger_incident_response'

export interface SecurityPolicyMetadata {
  version: string
  tags: string[]
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  expiration_date?: Date
  auto_revoke: boolean
  notification_settings: NotificationSettings
  compliance_requirements: ComplianceRequirement[]
  risk_assessment: RiskAssessment
}

export interface AccessControlConfig {
  enableRoleBasedAccess: boolean
  enableAttributeBasedAccess: boolean
  enableContextBasedAccess: boolean
  enableTimeBasedAccess: boolean
  enableLocationBasedAccess: boolean
  enableDeviceBasedAccess: boolean
  enableAuditLogging: boolean
  enableComplianceChecking: boolean
  enableRiskAssessment: boolean
  enableAnomalyDetection: boolean
  defaultSecurityLevel: SecurityLevel
  defaultAccessLevel: AccessLevel
  sessionTimeout: number
  maxConcurrentSessions: number
  passwordPolicy: PasswordPolicy
  mfaRequired: boolean
  ipWhitelist: string[]
  ipBlacklist: string[]
}

export interface PasswordPolicy {
  minLength: number
  maxLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  preventReuse: number
  expirationDays: number
  lockoutAttempts: number
  lockoutDuration: number
}

export interface AccessControlService {
  // Core access control
  checkAccess(userId: string, contextId: string, action: AccessAction): Promise<AccessDecision>
  grantAccess(userId: string, contextId: string, permissions: Permission[]): Promise<void>
  revokeAccess(userId: string, contextId: string, permissions: Permission[]): Promise<void>
  
  // Role management
  assignRole(userId: string, roleId: string, contextId?: string): Promise<void>
  removeRole(userId: string, roleId: string, contextId?: string): Promise<void>
  getUserRoles(userId: string, contextId?: string): Promise<UserRole[]>
  
  // Permission management
  createPermission(permission: CreatePermissionRequest): Promise<Permission>
  updatePermission(permissionId: string, updates: Partial<Permission>): Promise<Permission>
  deletePermission(permissionId: string): Promise<void>
  
  // Security management
  setContextSecurityLevel(contextId: string, securityLevel: SecurityLevel): Promise<void>
  getContextSecurityLevel(contextId: string): Promise<SecurityLevel>
  
  // Audit and monitoring
  logAccessAttempt(accessAttempt: AccessAttempt): Promise<void>
  getAccessLogs(filters?: AccessLogFilters): Promise<AccessLog[]>
  generateAccessReport(timeframe: string): Promise<AccessReport>
}

