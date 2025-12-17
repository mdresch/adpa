import type { Request, Response, NextFunction } from "express"
import Joi from "joi"
import { logger } from "../utils/logger"

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Debug: Log the schema being used
    logger.info("Using validation schema:", { 
      schemaKeys: Object.keys(schema.describe().keys || {}),
      bodyKeys: Object.keys(req.body || {})
    })
    
    const { error } = schema.validate(req.body, { abortEarly: false })
    
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }))
      
      logger.warn("Validation error:", { 
        errors, 
        body: req.body,
        schemaKeys: Object.keys(schema.describe().keys || {})
      })
      
      return res.status(400).json({
        success: false,
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: errors,
        },
        details: errors, // Keep for backward compatibility
      })
    }
    
    next()
  }
}

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query, { abortEarly: false })
    
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }))
      
      logger.warn("Query validation error:", { errors, query: req.query })
      
      return res.status(400).json({
        error: "Query validation failed",
        details: errors,
      })
    }
    
    next()
  }
}

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params, { abortEarly: false })
    
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }))
      
      logger.warn("Params validation error:", { errors, params: req.params })
      
      return res.status(400).json({
        error: "Parameter validation failed",
        details: errors,
      })
    }
    
    next()
  }
}

// Common validation schemas
export const schemas = {
  uuid: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)")).required(),
  name: Joi.string().min(2).max(100).required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),

  // Project schemas
  createProject: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    description: Joi.string().max(3000).optional(),
    framework: Joi.string().valid("TOGAF", "SABSA", "COBIT", "ITIL", "Custom", "BABOK", "PMBOK", "PMBOK 7", "DMBOK").required(),
    priority: Joi.string().valid("low", "medium", "high", "critical").default("medium"),
    start_date: Joi.date().optional(),
    end_date: Joi.date().greater(Joi.ref("start_date")).optional(),
    budget: Joi.number().positive().optional(),
    team_members: Joi.array().items(Joi.string().uuid()).default([]),
  }),
  
  updateProject: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    description: Joi.string().max(3000).optional(),
    framework: Joi.string().valid("TOGAF", "SABSA", "COBIT", "ITIL", "Custom").optional(),
    status: Joi.string().valid("active", "inactive", "completed", "archived").optional(),
    priority: Joi.string().valid("low", "medium", "high", "critical").optional(),
    start_date: Joi.date().optional(),
    end_date: Joi.date().optional(),
    budget: Joi.number().positive().optional(),
    team_members: Joi.array().items(Joi.string().uuid()).optional(),
  }),
  
  // User schemas
  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)")).required(),
    name: Joi.string().min(2).max(100).required(),
    role: Joi.string().valid("super_admin", "admin", "manager", "user", "viewer", "ccb").default("user"),
    companyName: Joi.string().max(255).allow('', null).optional(),
    company_id: Joi.string().uuid().allow(null, '').optional(),
  }),
  
  updateUser: Joi.object({
    email: Joi.string().email().optional(),
    name: Joi.string().min(2).max(100).optional(),
    role: Joi.string().valid("super_admin", "admin", "manager", "user", "viewer", "ccb").optional(),
    is_active: Joi.boolean().optional(),
    permissions: Joi.object().optional(),
    companyName: Joi.string().max(255).allow('', null).optional(),
    company_id: Joi.string().uuid().allow(null, '').optional(),
  }),
  
  // Document schemas
  createDocument: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    content: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),  // Accept Markdown string or object
    template_id: Joi.string().uuid().optional(),
    status: Joi.string().valid("draft", "review", "approved", "published").default("draft"),
    generation_metadata: Joi.object().optional(),  // Allow generation metadata
  }).unknown(true),  // Allow additional fields for future extensibility
  
  updateDocument: Joi.object().keys({
    name: Joi.string().min(1).max(255).allow("").optional(),
    content: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),  // Accept Markdown string or object
    status: Joi.string().valid("draft", "review", "approved", "published").allow("").optional(),
    tags: Joi.array().items(Joi.string().allow("")).optional(),
    template_id: Joi.string().uuid().allow("").optional(),
    metadata: Joi.object().optional(),
  }).unknown(true),
  
  // AI schemas
  aiGenerate: Joi.object({
    prompt: Joi.string().min(10).max(50000).required(),  // Support very comprehensive prompts
    provider: Joi.string().required(),  // Allow any provider name - AI Gateway handles validation
    model: Joi.string().optional(),
    temperature: Joi.number().min(0).max(2).default(0.7),
    max_tokens: Joi.number().min(1).max(16000).default(8000),  // Support long documents (16K tokens)
    template_id: Joi.string().uuid().optional(),
    variables: Joi.object().optional(),
    // Metadata fields for tracking and context
    project_id: Joi.string().uuid().optional(),
    project_name: Joi.string().optional(),
    template_name: Joi.string().optional(),
    framework: Joi.string().optional(),
    document_id: Joi.string().uuid().optional(),
    document_ids: Joi.array().items(Joi.string().uuid()).optional(),
    include_integrations: Joi.boolean().optional(),
    custom_context: Joi.string().optional(),
  }).unknown(true),  // Allow additional fields for future extensibility
  
  // Template schemas
  createTemplate: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    description: Joi.string().max(1000).optional(),
    framework: Joi.string().valid("TOGAF", "SABSA", "COBIT", "ITIL", "Custom", "BABOK", "BABOK v3", "PMBOK", "PMBOK 7", "DMBOK", "DMBOK 2.0").required(),
    category: Joi.string().max(100).optional(),
    content: Joi.object().required(),
    variables: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid("text", "number", "date", "boolean", "select").required(),
      required: Joi.boolean().default(false),
      default: Joi.any().optional(),
      options: Joi.array().when("type", { is: "select", then: Joi.required() }),
    })).default([]),
    is_public: Joi.boolean().default(false),
    template_scope: Joi.string().valid("standard", "company", "user").default("user"),
    company_id: Joi.string().uuid().allow(null, '').optional(),
    system_prompt: Joi.string().max(5000).optional(),
    template_paragraphs: Joi.array().items(Joi.object({
      section_name: Joi.string().required(),
      section_type: Joi.string().valid("header", "paragraph", "list", "table", "code_block", "summary", "conclusion").required(),
      description: Joi.string().required(),
      required: Joi.boolean().default(true),
      order: Joi.number().integer().min(1).required(),
      prompt_guidance: Joi.string().max(1000).optional(),
    })).optional(),
  }),
}
