/**
 * Document Templates Validation Schemas
 * Joi validation schemas for document template operations
 */

import Joi from 'joi'

// Template variable schema
const templateVariable = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('text', 'number', 'date', 'boolean', 'select').required(),
  required: Joi.boolean().default(false),
  default: Joi.any().optional(),
  options: Joi.array().items(Joi.string()).when('type', { 
    is: 'select', 
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  description: Joi.string().max(500).optional(),
})

export const templateValidationSchemas = {
  templateVariable,

  // Create template request
  createTemplate: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    description: Joi.string().max(1000).optional(),
    framework: Joi.string().valid('TOGAF', 'SABSA', 'COBIT', 'ITIL', 'Custom').required(),
    category: Joi.string().max(100).optional(),
    content: Joi.object().required(),
    variables: Joi.array().items(templateVariable).default([]),
    is_public: Joi.boolean().default(false),
  }),

  // Update template request
  updateTemplate: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    description: Joi.string().max(1000).optional(),
    framework: Joi.string().valid('TOGAF', 'SABSA', 'COBIT', 'ITIL', 'Custom').optional(),
    category: Joi.string().max(100).optional(),
    content: Joi.object().optional(),
    variables: Joi.array().items(templateVariable).optional(),
    is_public: Joi.boolean().optional(),
  }),

  // Clone template request
  cloneTemplate: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    description: Joi.string().max(1000).optional(),
    is_public: Joi.boolean().default(false),
  }),

  // Query parameters for listing templates
  templateListQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    framework: Joi.string().valid('TOGAF', 'SABSA', 'COBIT', 'ITIL', 'Custom').optional(),
    category: Joi.string().max(100).optional(),
    search: Joi.string().max(100).optional(),
    is_public: Joi.boolean().optional(),
  }),

  // UUID parameter validation
  uuidParam: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  // Trash query parameters
  trashQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
}

// Re-export for convenience
export const {
  createTemplate,
  updateTemplate,
  cloneTemplate,
  templateListQuery,
  uuidParam,
  trashQuery,
} = templateValidationSchemas