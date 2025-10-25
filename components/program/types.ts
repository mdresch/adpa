/**
 * Program Metrics Types
 * Defines the structure for program health metrics and dashboard data
 */

export interface BudgetMetrics {
  planned: number;
  actual: number;
  forecast: number;
  variance: number;
  timeline: BudgetTimelineEntry[];
}

export interface BudgetTimelineEntry {
  month: string;
  planned: number;
  actual: number;
  forecast?: number;
}

export interface ProjectStatusBreakdown {
  green: number;
  amber: number;
  red: number;
}

export interface StatusMetrics {
  total: number;
  breakdown: ProjectStatusBreakdown;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  probability: number; // 0-100%
  impact: number; // Dollar amount
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface Milestone {
  id: string;
  name: string;
  plannedDate: string;
  actualDate?: string;
  status: 'completed' | 'on-track' | 'overdue';
}

export interface ProgramMetrics {
  budget: BudgetMetrics;
  status: StatusMetrics;
  risks: Risk[];
  milestones: Milestone[];
}
