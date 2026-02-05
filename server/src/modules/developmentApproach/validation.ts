/**
 * Development Approach Validation
 * Purpose: Input validation for development approach data
 * Domain: Development Approach & Life Cycle Performance Domain
 * Created: January 15, 2026
 */

import Joi from 'joi';
import { DevelopmentApproach } from './types';

// Joi schema for development approach validation
const developmentApproachSchema = Joi.object({
  id: Joi.string().uuid().optional(),
  project_id: Joi.string().uuid().optional(),
  
  // Approach selection
  approach: Joi.string().valid('predictive', 'adaptive', 'hybrid', 'incremental', 'iterative').required(),
  methodology: Joi.string().valid('waterfall', 'scrum', 'kanban', 'lean', 'safe', 'prince2', 'custom').optional(),
  
  // Justification
  justification: Joi.string().min(50).max(5000).required(),
  
  // Context factors
  uncertainty_level: Joi.string().valid('low', 'medium', 'high').optional(),
  requirements_stability: Joi.string().valid('stable', 'evolving', 'uncertain').optional(),
  stakeholder_engagement_model: Joi.string().valid('periodic', 'continuous').optional(),
  delivery_cadence: Joi.string().valid('single', 'iterative', 'incremental', 'continuous').required(),
  
  // Organizational context
  organizational_maturity: Joi.string().valid('low', 'medium', 'high').optional(),
  team_experience_level: Joi.string().valid('junior', 'mixed', 'senior').optional(),
  regulatory_constraints: Joi.boolean().default(false),
  
  // Tailoring decisions
  tailoring_decisions: Joi.array().items(
    Joi.object({
      area: Joi.string().min(5).max(100).required(),
      standard_process: Joi.string().min(5).max(200).required(),
      tailored_process: Joi.string().min(5).max(200).required(),
      justification: Joi.string().min(10).max(1000).required()
    })
  ).default([]),
  
  // Life cycle configuration
  life_cycle_phases: Joi.array().items(Joi.string().min(2).max(50)).default([]),
  iteration_length: Joi.number().integer().min(1).max(30).optional(),
  iteration_unit: Joi.string().valid('days', 'weeks').optional(),
  
  // Governance
  governance_approach: Joi.string().valid('lightweight', 'standard', 'formal').required(),
  review_gates: Joi.array().items(Joi.string().min(2).max(50)).default([]),
  
  // Metadata
  source_document_id: Joi.string().uuid().optional(),
  defined_by: Joi.string().uuid().optional(),
  approved_by: Joi.string().uuid().optional(),
  effective_date: Joi.date().optional(),
  
  // Timestamps (auto-managed)
  created_at: Joi.date().optional(),
  updated_at: Joi.date().optional()
});

/**
 * Validate development approach data
 */
export function validateDevelopmentApproach(data: Partial<DevelopmentApproach>): DevelopmentApproach {
  const { value, error } = developmentApproachSchema.validate(data, {
    abortEarly: false,
    convert: true
  });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Development approach validation failed: ${errorMessage}`);
  }
  
  return value as DevelopmentApproach;
}

/**
 * Validate development approach filters
 */
export function validateDevelopmentApproachFilters(filters: any): any {
  const filterSchema = Joi.object({
    approach: Joi.string().valid('predictive', 'adaptive', 'hybrid', 'incremental', 'iterative').optional(),
    methodology: Joi.string().valid('waterfall', 'scrum', 'kanban', 'lean', 'safe', 'prince2', 'custom').optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional()
  });
  
  const { value, error } = filterSchema.validate(filters, {
    abortEarly: false,
    convert: true
  });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Filter validation failed: ${errorMessage}`);
  }
  
  return value;
}