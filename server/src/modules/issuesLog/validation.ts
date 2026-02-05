/**
 * Issues Log Validation
 * Purpose: Input validation for issues tracking
 * Domain: Project Work Performance Domain, Uncertainty Domain
 * Created: February 4, 2026
 */

import Joi from 'joi';
import { Issue, IssueFilters, IssueUpdate } from './types';

// Joi schema for issue validation
const issueSchema = Joi.object({
  id: Joi.string().uuid().optional(),
  project_id: Joi.string().uuid().optional(),
  
  // Issue details
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().min(10).max(5000).required(),
  category: Joi.string().valid('technical', 'resource', 'schedule', 'communication', 'quality', 'external', 'scope', 'budget', 'other').required(),
  
  // Severity & Impact
  priority: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
  impact: Joi.string().max(2000).optional(),
  affected_areas: Joi.array().items(Joi.string().min(2).max(50)).default([]),
  
  // People
  raised_by: Joi.string().uuid().optional(),
  assigned_to: Joi.string().uuid().optional(),
  escalated_to: Joi.string().uuid().optional(),
  
  // Status tracking
  status: Joi.string().valid('open', 'acknowledged', 'in_progress', 'blocked', 'resolved', 'closed').default('open'),
  
  // Resolution
  resolution: Joi.string().max(2000).optional(),
  workaround: Joi.string().max(2000).optional(),
  root_cause: Joi.string().max(2000).optional(),
  
  // Dates
  date_raised: Joi.date().optional(),
  target_resolution_date: Joi.date().optional(),
  date_resolved: Joi.date().optional(),
  date_closed: Joi.date().optional(),
  
  // Related entities
  related_risk_id: Joi.string().uuid().optional(),
  related_milestone_id: Joi.string().uuid().optional(),
  related_deliverable_id: Joi.string().uuid().optional(),
  
  // Metadata
  source_document_id: Joi.string().uuid().optional(),
  notes: Joi.string().max(1000).optional(),
  
  // Timestamps (auto-managed)
  created_at: Joi.date().optional(),
  updated_at: Joi.date().optional()
});

// Joi schema for issue update validation
const issueUpdateSchema = Joi.object({
  title: Joi.string().min(5).max(200).optional(),
  description: Joi.string().min(10).max(5000).optional(),
  category: Joi.string().valid('technical', 'resource', 'schedule', 'communication', 'quality', 'external', 'scope', 'budget', 'other').optional(),
  priority: Joi.string().valid('critical', 'high', 'medium', 'low').optional(),
  impact: Joi.string().max(2000).optional(),
  affected_areas: Joi.array().items(Joi.string().min(2).max(50)).optional(),
  assigned_to: Joi.string().uuid().optional(),
  escalated_to: Joi.string().uuid().optional(),
  status: Joi.string().valid('open', 'acknowledged', 'in_progress', 'blocked', 'resolved', 'closed').optional(),
  resolution: Joi.string().max(2000).optional(),
  workaround: Joi.string().max(2000).optional(),
  root_cause: Joi.string().max(2000).optional(),
  target_resolution_date: Joi.date().optional(),
  notes: Joi.string().max(1000).optional()
});

// Joi schema for issue filters validation
const issueFiltersSchema = Joi.object({
  project_id: Joi.string().uuid().optional(),
  status: Joi.alternatives().try(
    Joi.string().valid('open', 'acknowledged', 'in_progress', 'blocked', 'resolved', 'closed'),
    Joi.array().items(Joi.string().valid('open', 'acknowledged', 'in_progress', 'blocked', 'resolved', 'closed'))
  ).optional(),
  priority: Joi.alternatives().try(
    Joi.string().valid('critical', 'high', 'medium', 'low'),
    Joi.array().items(Joi.string().valid('critical', 'high', 'medium', 'low'))
  ).optional(),
  category: Joi.alternatives().try(
    Joi.string().valid('technical', 'resource', 'schedule', 'communication', 'quality', 'external', 'scope', 'budget', 'other'),
    Joi.array().items(Joi.string().valid('technical', 'resource', 'schedule', 'communication', 'quality', 'external', 'scope', 'budget', 'other'))
  ).optional(),
  assigned_to: Joi.string().uuid().optional(),
  raised_by: Joi.string().uuid().optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional()
});

/**
 * Validate issue data
 */
export function validateIssue(data: Partial<Issue>): Issue {
  const { value, error } = issueSchema.validate(data, {
    abortEarly: false,
    convert: true
  });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Issue validation failed: ${errorMessage}`);
  }
  
  return value as Issue;
}

/**
 * Validate issue update data
 */
export function validateIssueUpdate(data: Partial<IssueUpdate>): IssueUpdate {
  const { value, error } = issueUpdateSchema.validate(data, {
    abortEarly: false,
    convert: true
  });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Issue update validation failed: ${errorMessage}`);
  }
  
  return value as IssueUpdate;
}

/**
 * Validate issue filters
 */
export function validateIssueFilters(filters: any): IssueFilters {
  const { value, error } = issueFiltersSchema.validate(filters, {
    abortEarly: false,
    convert: true
  });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Issue filters validation failed: ${errorMessage}`);
  }
  
  return value;
}