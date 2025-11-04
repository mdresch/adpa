/**
 * Program Components
 * Export all program-related components
 */

export { MetricsDashboard } from './MetricsDashboard';
export { default as FinancialDashboard } from './FinancialDashboard';
export { ProgramProjectsTab } from './ProgramProjectsTab';
export { ProgramRisksTab } from './ProgramRisksTab';
export { ProgramReportsTab } from './ProgramReportsTab';
export type { 
  ProgramMetrics, 
  BudgetMetrics, 
  BudgetTimelineEntry,
  ProjectStatusBreakdown,
  StatusMetrics,
  Risk,
  Milestone
} from './types';
export type {
  FinancialSummary,
  EVMMetrics,
  FinancialAnalysis,
  FinancialDashboardData
} from './FinancialDashboard';
