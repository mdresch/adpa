/**
 * Context Repository Types
 * Defines TypeScript interfaces and types for the context repository system
 */

export interface ProjectContext {
  project_id: string
  name: string
  description?: string
  status: string
  priority: string
  owner_id: string
  owner_name?: string
  team_members: string[]
  start_date?: Date
  end_date?: Date
  budget?: number
  metadata?: Record<string, any>
  stakeholders: Stakeholder[]
  requirements: Requirement[]
  constraints: Constraint[]
  timeline: Timeline
  risks: Risk[]
  success_criteria: SuccessCriteria[]
  created_at: Date
  updated_at: Date
}

export interface Stakeholder {
  id: string
  name: string
  role: string
  email?: string
  phone?: string
  organization?: string
  influence_level: 'high' | 'medium' | 'low'
  interest_level: 'high' | 'medium' | 'low'
  responsibilities: string[]
  expectations: string[]
  communication_preferences: string[]
  availability: Record<string, any>
  metadata?: Record<string, any>
}

export interface Requirement {
  id: string
  name: string
  description: string
  type: 'functional' | 'non_functional' | 'business' | 'technical'
  priority: 'high' | 'medium' | 'low'
  status: 'draft' | 'approved' | 'implemented' | 'verified'
  source: string
  acceptance_criteria: string[]
  dependencies: string[]
  risks: string[]
  metadata?: Record<string, any>
}

export interface Constraint {
  id: string
  name: string
  description: string
  type: 'budget' | 'time' | 'resource' | 'technical' | 'regulatory' | 'business'
  impact: 'high' | 'medium' | 'low'
  mitigation_strategy?: string
  metadata?: Record<string, any>
}

export interface Timeline {
  start_date: Date
  end_date: Date
  duration_days: number
  milestones: Milestone[]
  phases: Phase[]
  dependencies: string[]
  critical_path: string[]
}

export interface Milestone {
  id: string
  name: string
  description: string
  date: Date
  status: 'planned' | 'in_progress' | 'completed' | 'delayed'
  dependencies: string[]
  deliverables: string[]
  success_criteria: string[]
}

export interface Phase {
  id: string
  name: string
  description: string
  start_date: Date
  end_date: Date
  status: 'planned' | 'in_progress' | 'completed'
  deliverables: string[]
  team_members: string[]
}

export interface Risk {
  id: string
  name: string
  description: string
  category: string
  probability: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  risk_level: 'high' | 'medium' | 'low'
  mitigation_strategy?: string
  contingency_plan?: string
  owner: string
  status: 'identified' | 'mitigated' | 'accepted' | 'transferred'
  metadata?: Record<string, any>
}

export interface SuccessCriteria {
  id: string
  name: string
  description: string
  type: 'quantitative' | 'qualitative'
  measurement_method: string
  target_value?: number
  current_value?: number
  status: 'not_met' | 'partially_met' | 'met' | 'exceeded'
  metadata?: Record<string, any>
}

export interface UserProfile {
  user_id: string
  email: string
  name: string
  role: string
  avatar_url?: string
  is_active: boolean
  last_login?: Date
  created_at: Date
  updated_at: Date
  preferences: UserPreferences
  expertise: UserExpertise
  writing_style: WritingStyle
  domain_knowledge: DomainKnowledge
  collaboration_preferences: CollaborationPreferences
  metadata?: Record<string, any>
}

export interface UserPreferences {
  language: string
  timezone: string
  date_format: string
  number_format: string
  theme: 'light' | 'dark' | 'auto'
  notifications: NotificationPreferences
  accessibility: AccessibilityPreferences
  privacy: PrivacyPreferences
}

export interface UserExpertise {
  level: 'junior' | 'intermediate' | 'senior' | 'expert'
  domains: string[]
  certifications: string[]
  experience_years: number
  methodologies: string[]
  tools: string[]
  languages: string[]
  specializations: string[]
}

export interface WritingStyle {
  tone: 'formal' | 'casual' | 'professional' | 'technical'
  formality: 'very_formal' | 'formal' | 'casual' | 'very_casual'
  length_preference: 'brief' | 'detailed' | 'comprehensive'
  structure_preference: 'structured' | 'narrative' | 'bullet_points'
  terminology_preference: 'standard' | 'technical' | 'business' | 'custom'
  audience_awareness: 'high' | 'medium' | 'low'
}

export interface DomainKnowledge {
  industries: string[]
  technologies: string[]
  frameworks: string[]
  tools: string[]
  standards: string[]
  regulations: string[]
  best_practices: string[]
  common_patterns: string[]
}

export interface CollaborationPreferences {
  communication_style: 'direct' | 'diplomatic' | 'collaborative' | 'analytical'
  feedback_preference: 'constructive' | 'direct' | 'gentle' | 'detailed'
  meeting_preference: 'structured' | 'informal' | 'virtual' | 'in_person'
  collaboration_tools: string[]
  availability: AvailabilitySchedule
  working_hours: WorkingHours
}

export interface DocumentHistory {
  document_id: string
  name: string
  content: string
  template_id: string
  template_name?: string
  framework: string
  category: string
  project_id?: string
  project_name?: string
  created_by: string
  created_by_name?: string
  created_at: Date
  updated_at: Date
  version: number
  status: string
  quality_score?: number
  metadata?: Record<string, any>
  tags: string[]
  similar_documents: string[]
  usage_patterns: UsagePattern[]
  quality_metrics: QualityMetrics
}

export interface UsagePattern {
  pattern_type: 'section_structure' | 'content_style' | 'variable_usage' | 'formatting'
  pattern_data: Record<string, any>
  frequency: number
  confidence: number
  examples: string[]
}

export interface QualityMetrics {
  completeness_score: number
  clarity_score: number
  accuracy_score: number
  consistency_score: number
  overall_score: number
  assessment_date: Date
  assessor: string
  feedback: string[]
}

export interface ContextRepository {
  projectContext: ProjectContextStore
  userProfiles: UserProfileStore
  documentHistory: DocumentHistoryStore
}

export interface ProjectContextStore {
  getProject(projectId: string): Promise<ProjectContext | null>
  getProjectStakeholders(projectId: string): Promise<Stakeholder[]>
  getProjectRequirements(projectId: string): Promise<Requirement[]>
  getProjectConstraints(projectId: string): Promise<Constraint[]>
  getProjectTimeline(projectId: string): Promise<Timeline | null>
  getProjectRisks(projectId: string): Promise<Risk[]>
  getProjectSuccessCriteria(projectId: string): Promise<SuccessCriteria[]>
  searchProjects(query: string, filters?: ProjectFilters): Promise<ProjectContext[]>
  getSimilarProjects(project: ProjectContext, limit?: number): Promise<ProjectContext[]>
}

export interface UserProfileStore {
  getUserProfile(userId: string): Promise<UserProfile | null>
  getUserPreferences(userId: string): Promise<UserPreferences | null>
  getUserExpertise(userId: string): Promise<UserExpertise | null>
  getUserWritingStyle(userId: string): Promise<WritingStyle | null>
  getUserDomainKnowledge(userId: string): Promise<DomainKnowledge | null>
  getUserCollaborationPreferences(userId: string): Promise<CollaborationPreferences | null>
  updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile>
  searchUsers(query: string, filters?: UserFilters): Promise<UserProfile[]>
  getUsersByExpertise(domain: string, level?: string): Promise<UserProfile[]>
}

export interface DocumentHistoryStore {
  getDocumentHistory(documentId: string): Promise<DocumentHistory | null>
  getSimilarDocuments(templateId: string, projectId?: string, limit?: number): Promise<DocumentHistory[]>
  getDocumentsByFramework(framework: string, limit?: number): Promise<DocumentHistory[]>
  getDocumentsByCategory(category: string, limit?: number): Promise<DocumentHistory[]>
  getDocumentsByUser(userId: string, limit?: number): Promise<DocumentHistory[]>
  getDocumentsByProject(projectId: string, limit?: number): Promise<DocumentHistory[]>
  searchDocuments(query: string, filters?: DocumentFilters): Promise<DocumentHistory[]>
  getDocumentPatterns(framework: string, category?: string): Promise<UsagePattern[]>
  getBestPractices(framework: string, category?: string): Promise<BestPractice[]>
  getQualityTrends(timeframe: string): Promise<QualityTrend[]>
}

export interface ProjectFilters {
  status?: string[]
  priority?: string[]
  framework?: string[]
  owner_id?: string
  team_member_id?: string
  start_date_from?: Date
  start_date_to?: Date
  end_date_from?: Date
  end_date_to?: Date
  budget_min?: number
  budget_max?: number
}

export interface UserFilters {
  role?: string[]
  expertise_level?: string[]
  domains?: string[]
  certifications?: string[]
  is_active?: boolean
  last_login_from?: Date
  last_login_to?: Date
}

export interface DocumentFilters {
  framework?: string[]
  category?: string[]
  template_id?: string
  project_id?: string
  created_by?: string
  status?: string[]
  quality_score_min?: number
  quality_score_max?: number
  created_from?: Date
  created_to?: Date
  updated_from?: Date
  updated_to?: Date
}

export interface BestPractice {
  id: string
  name: string
  description: string
  framework: string
  category: string
  practice_type: 'structure' | 'content' | 'process' | 'quality'
  effectiveness_score: number
  usage_frequency: number
  examples: string[]
  implementation_guidance: string
  success_metrics: string[]
  metadata?: Record<string, any>
}

export interface QualityTrend {
  timeframe: string
  average_quality_score: number
  trend_direction: 'improving' | 'declining' | 'stable'
  data_points: number
  framework_breakdown: Record<string, number>
  category_breakdown: Record<string, number>
  common_issues: string[]
  improvement_areas: string[]
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
  in_app: boolean
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly'
  categories: string[]
}

export interface AccessibilityPreferences {
  font_size: 'small' | 'medium' | 'large'
  color_scheme: 'default' | 'high_contrast' | 'color_blind_friendly'
  screen_reader: boolean
  keyboard_navigation: boolean
  reduced_motion: boolean
}

export interface PrivacyPreferences {
  profile_visibility: 'public' | 'team' | 'private'
  data_sharing: boolean
  analytics_opt_in: boolean
  marketing_opt_in: boolean
  third_party_sharing: boolean
}

export interface AvailabilitySchedule {
  timezone: string
  working_days: string[]
  working_hours: WorkingHours
  holidays: Date[]
  vacation_dates: Date[]
  busy_periods: Date[]
}

export interface WorkingHours {
  start_time: string
  end_time: string
  break_start?: string
  break_end?: string
  flexible_hours: boolean
  timezone: string
}
