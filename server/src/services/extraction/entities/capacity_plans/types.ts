/**
 * Capacity Plans Entity Types
 */

export interface CapacityPlan {
  team_member: string
  role?: string
  period_start: string
  period_end: string
  available_hours?: number
  allocated_hours?: number
  utilization_percentage?: number
  notes?: string
  source_document?: string
  source_document_id?: string
}

