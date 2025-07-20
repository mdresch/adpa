import type { Request, Response, NextFunction } from "express"
import Joi from "joi"
import { logger } from "../utils/logger"

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false })
    
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }))
      
      logger.warn("Validation error:", { errors, body: req.body })
      
      return res.status(400).json({
        error: "Validation failed",
        details: errors,
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
    description: Joi.string().max(1000).optional(),
    framework: Joi.string().valid("TOGAF", "SABSA", "COBIT", "ITIL", "Custom").required(),
    priority: Joi.string().valid("low", "medium", "high", "critical").default("medium"),
    start_date: Joi.date().optional(),
    end_date: Joi.date().greater(Joi.ref("start_date")).optional(),
    budget: Joi.number().positive().optional(),
    team_members: Joi.array().items(Joi.string().uuid()).default([]),
  }),
  
  updateProject: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    description: Joi.string().max(1000).optional(),
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
    email: schemas.email,
    password: schemas.password,
    name: schemas.name,
    role: Joi.string().valid("admin", "manager", "user", "viewer").default("user"),
  }),
  
  updateUser: Joi.object({
    email: Joi.string().email().optional(),
    name: Joi.string().min(2).max(100).optional(),
    role: Joi.string().valid("admin", "manager", "user", "viewer").optional(),
    is_active: Joi.boolean().optional(),
    permissions: Joi.object().optional(),
  }),
  
  // Document schemas
  createDocument: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    content: Joi.object().optional(),
    template_id: Joi.string().uuid().optional(),
    status: Joi.string().valid("draft", "review", "approved", "published").default("draft"),
  }),
  
  updateDocument: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    content: Joi.object().optional(),
    status: Joi.string().valid("draft", "review", "approved", "published").optional(),
  }),
  
  // AI schemas
  aiGenerate: Joi.object({
    prompt: Joi.string().min(10).max(5000).required(),
    provider: Joi.string().valid("openai", "google", "azure").required(),
    model: Joi.string().optional(),
    temperature: Joi.number().min(0).max(2).default(0.7),
    max_tokens: Joi.number().min(1).max(4000).default(1000),
    template_id: Joi.string().uuid().optional(),
    variables: Joi.object().optional(),
  }),
  
  // Template schemas
  createTemplate: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    description: Joi.string().max(1000).optional(),
    framework: Joi.string().valid("TOGAF", "SABSA", "COBIT", "ITIL", "Custom").required(),
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
  }),
}
