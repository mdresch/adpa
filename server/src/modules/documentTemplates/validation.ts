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
    // Accept common enterprise frameworks plus the domain-specific ones used in the frontend
    framework: Joi.string().valid(
      'TOGAF',
      'SABSA',
      'COBIT',
      'ITIL',
      'Custom',
      'BABOK v3',
      'PMBOK 7',
      'DMBOK 2.0'
    ).required(),
    category: Joi.string().max(100).optional(),
    content: Joi.object().required(),
    variables: Joi.array().items(templateVariable).default([]),
    is_public: Joi.boolean().default(false),
    system_prompt: Joi.string().max(5000).optional(),
    context_injection_config: Joi.object({
      enabled: Joi.boolean().default(false),
      sources: Joi.array().items(Joi.object({
        type: Joi.string().valid('project_data', 'user_preferences', 'document_history', 'external_api', 'database_query', 'file_content').required(),
        source_id: Joi.string().required(),
        source_name: Joi.string().required(),
        query: Joi.string().optional(),
        parameters: Joi.object().optional(),
        weight: Joi.number().min(0).max(1).optional(),
        enabled: Joi.boolean().default(true),
        metadata: Joi.object().optional()
      })).default([]),
      injection_strategy: Joi.string().valid('prepend', 'append', 'interleave', 'structured').default('prepend'),
      max_context_length: Joi.number().integer().min(100).max(50000).default(4000),
      context_priority: Joi.string().valid('high', 'medium', 'low').default('medium'),
      metadata: Joi.object().optional()
    }).optional(),
    prompt_build_up: Joi.object({
      enabled: Joi.boolean().default(false),
      stages: Joi.array().items(Joi.object({
        stage_name: Joi.string().required(),
        stage_type: Joi.string().valid('context_gathering', 'template_processing', 'ai_generation', 'post_processing').required(),
        prompt_template: Joi.string().required(),
        variables: Joi.array().items(Joi.string()).default([]),
        dependencies: Joi.array().items(Joi.string()).optional(),
        order: Joi.number().integer().min(1).required(),
        enabled: Joi.boolean().default(true)
      })).default([]),
      final_format: Joi.string().valid('markdown', 'structured_json', 'plain_text', 'html').default('markdown'),
      include_metadata: Joi.boolean().default(true)
    }).optional(),
    template_paragraphs: Joi.array().items(Joi.object({
      section_name: Joi.string().required(),
      section_type: Joi.string().valid("header", "paragraph", "list", "table", "code_block", "summary", "conclusion").required(),
      description: Joi.string().allow("").optional(),
      required: Joi.boolean().default(true),
      order: Joi.number().integer().min(1).required(),
      prompt_guidance: Joi.string().max(1000).optional(),
    })).optional(),
  }),

  // Update template request
  updateTemplate: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    description: Joi.string().max(1000).optional(),
    framework: Joi.string().valid(
      'TOGAF',
      'SABSA',
      'COBIT',
      'ITIL',
      'Custom',
      'BABOK v3',
      'PMBOK 7',
      'DMBOK 2.0'
    ).optional(),
    category: Joi.string().max(100).optional(),
    content: Joi.object().optional(),
    variables: Joi.array().items(templateVariable).optional(),
    is_public: Joi.boolean().optional(),
    system_prompt: Joi.string().max(5000).optional(),
    context_injection_config: Joi.object({
      enabled: Joi.boolean().default(false),
      sources: Joi.array().items(Joi.object({
        type: Joi.string().valid('project_data', 'user_preferences', 'document_history', 'external_api', 'database_query', 'file_content').required(),
        source_id: Joi.string().required(),
        source_name: Joi.string().required(),
        query: Joi.string().optional(),
        parameters: Joi.object().optional(),
        weight: Joi.number().min(0).max(1).optional(),
        enabled: Joi.boolean().default(true),
        metadata: Joi.object().optional()
      })).default([]),
      injection_strategy: Joi.string().valid('prepend', 'append', 'interleave', 'structured').default('prepend'),
      max_context_length: Joi.number().integer().min(100).max(50000).default(4000),
      context_priority: Joi.string().valid('high', 'medium', 'low').default('medium'),
      metadata: Joi.object().optional()
    }).optional(),
    prompt_build_up: Joi.object({
      enabled: Joi.boolean().default(false),
      stages: Joi.array().items(Joi.object({
        stage_name: Joi.string().required(),
        stage_type: Joi.string().valid('context_gathering', 'template_processing', 'ai_generation', 'post_processing').required(),
        prompt_template: Joi.string().required(),
        variables: Joi.array().items(Joi.string()).default([]),
        dependencies: Joi.array().items(Joi.string()).optional(),
        order: Joi.number().integer().min(1).required(),
        enabled: Joi.boolean().default(true)
      })).default([]),
      final_format: Joi.string().valid('markdown', 'structured_json', 'plain_text', 'html').default('markdown'),
      include_metadata: Joi.boolean().default(true)
    }).optional(),
    template_paragraphs: Joi.array().items(Joi.object({
      section_name: Joi.string().required(),
      section_type: Joi.string().valid("header", "paragraph", "list", "table", "code_block", "summary", "conclusion").required(),
      description: Joi.string().allow("").optional(),
      required: Joi.boolean().default(true),
      order: Joi.number().integer().min(1).required(),
      prompt_guidance: Joi.string().max(1000).optional(),
    })).optional(),
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
    framework: Joi.string().valid(
      'TOGAF',
      'SABSA',
      'COBIT',
      'ITIL',
      'Custom',
      'BABOK v3',
      'PMBOK 7',
      'DMBOK 2.0'
    ).optional(),
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