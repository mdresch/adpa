/**
 * Issues Log Types
 * Purpose: Type definitions for issues tracking
 * Domain: Project Work Performance Domain, Uncertainty Domain
 * Created: February 4, 2026
 */

export interface Issue {
  id: string;
  project_id: string;
  
  // Issue details
  title: string;
  description: string;
  category: 'technical' | 'resource' | 'schedule' | 'communication' | 'quality' | 'external' | 'scope' | 'budget' | 'other';
  
  // Severity & Impact
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact?: string;
  affected_areas?: string[];
  
  // People
  raised_by?: string;
  assigned_to?: string;
  escalated_to?: string;
  
  // Status tracking
  status: 'open' | 'acknowledged' | 'in_progress' | 'blocked' | 'resolved' | 'closed';
  
  // Resolution
  resolution?: string;
  workaround?: string;
  root_cause?: string;
  
  // Dates
  date_raised: Date | string;
  target_resolution_date?: Date | string;
  date_resolved?: Date | string;
  date_closed?: Date | string;
  
  // Related entities
  related_risk_id?: string;
  related_milestone_id?: string;
  related_deliverable_id?: string;
  
  // Metadata
  source_document_id?: string;
  notes?: string;
  
  // Timestamps
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IssueStatusHistory {
  id: string;
  issue_id: string;
  old_status?: string;
  new_status: string;
  changed_by?: string;
  changed_at: Date | string;
  comment?: string;
}

export interface IssueFilters {
  project_id?: string;
  status?: string | string[];
  priority?: string | string[];
  category?: string | string[];
  assigned_to?: string;
  raised_by?: string;
  limit?: number;
  offset?: number;
}

export interface IssueStatistics {
  total_issues: number;
  open_issues: number;
  critical_issues: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
  avg_resolution_time_hours?: number;
}

export interface IssueUpdate {
  title?: string;
  description?: string;
  category?: 'technical' | 'resource' | 'schedule' | 'communication' | 'quality' | 'external' | 'scope' | 'budget' | 'other';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  impact?: string;
  affected_areas?: string[];
  assigned_to?: string;
  escalated_to?: string;
  status?: 'open' | 'acknowledged' | 'in_progress' | 'blocked' | 'resolved' | 'closed';
  resolution?: string;
  workaround?: string;
  root_cause?: string;
  target_resolution_date?: Date | string;
  notes?: string;
}