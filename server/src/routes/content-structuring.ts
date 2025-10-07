import express from "express"
import Joi from "joi"
import { authenticateToken } from "../middleware/auth"
import { validate } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { contentStructuringService } from "../services/contentStructuringService"

const router = express.Router()

// Validation schemas
const analyzeContentSchema = Joi.object({
  content: Joi.string().required().min(1),
  projectId: Joi.string().uuid().optional()
})

const replaceVariablesSchema = Joi.object({
  content: Joi.string().required().min(1),
  variables: Joi.object().required(),
  projectId: Joi.string().uuid().optional()
})

const optimizeStructureSchema = Joi.object({
  content: Joi.string().required().min(1),
  projectId: Joi.string().uuid().optional()
})

/**
 * Analyze content structure and extract variables
 */
router.post("/analyze", authenticateToken, validate(analyzeContentSchema), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { content, projectId } = req.body
    const userId = (req as any).user.id

    log.info("Analyzing content structure", { 
      contentLength: content.length, 
      projectId, 
      userId 
    })

    const structure = await contentStructuringService.analyzeContent(content, projectId)

    res.json({
      success: true,
      data: structure
    })
  } catch (error) {
    log.error("Content analysis failed", { error })
    res.status(500).json({ 
      success: false, 
      error: "Failed to analyze content structure" 
    })
  }
})

/**
 * Replace variables in content with actual values
 */
router.post("/replace-variables", authenticateToken, validate(replaceVariablesSchema), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { content, variables, projectId } = req.body
    const userId = (req as any).user.id

    log.info("Replacing variables in content", { 
      contentLength: content.length, 
      variableCount: Object.keys(variables).length,
      projectId, 
      userId 
    })

    const processedContent = await contentStructuringService.replaceVariables(content, variables, projectId)

    res.json({
      success: true,
      data: {
        originalContent: content,
        processedContent,
        variablesUsed: Object.keys(variables),
        replacementCount: this.countReplacements(content, processedContent)
      }
    })
  } catch (error) {
    log.error("Variable replacement failed", { error })
    res.status(500).json({ 
      success: false, 
      error: "Failed to replace variables in content" 
    })
  }
})

/**
 * Optimize content structure
 */
router.post("/optimize", authenticateToken, validate(optimizeStructureSchema), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { content, projectId } = req.body
    const userId = (req as any).user.id

    log.info("Optimizing content structure", { 
      contentLength: content.length, 
      projectId, 
      userId 
    })

    const optimizedContent = await contentStructuringService.optimizeContentStructure(content, projectId)

    res.json({
      success: true,
      data: {
        originalContent: content,
        optimizedContent,
        improvements: this.calculateImprovements(content, optimizedContent)
      }
    })
  } catch (error) {
    log.error("Content optimization failed", { error })
    res.status(500).json({ 
      success: false, 
      error: "Failed to optimize content structure" 
    })
  }
})

/**
 * Get available variables for a project
 */
router.get("/variables/:projectId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params
    const userId = (req as any).user.id

    log.info("Getting available variables", { projectId, userId })

    // Get project context to show available variables
    const projectContext = await contentStructuringService['getProjectContext'](projectId)
    const systemContext = contentStructuringService['getSystemContext']()
    const userContext = contentStructuringService['getUserContext']()

    const availableVariables = {
      project: this.flattenObject(projectContext, 'project'),
      system: this.flattenObject(systemContext, 'system'),
      user: this.flattenObject(userContext, 'user')
    }

    res.json({
      success: true,
      data: availableVariables
    })
  } catch (error) {
    log.error("Failed to get available variables", { error })
    res.status(500).json({ 
      success: false, 
      error: "Failed to get available variables" 
    })
  }
})

/**
 * Validate variable values
 */
router.post("/validate-variables", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { variables } = req.body
    const userId = (req as any).user.id

    log.info("Validating variables", { 
      variableCount: Object.keys(variables).length, 
      userId 
    })

    const validationResults = await this.validateVariables(variables)

    res.json({
      success: true,
      data: validationResults
    })
  } catch (error) {
    log.error("Variable validation failed", { error })
    res.status(500).json({ 
      success: false, 
      error: "Failed to validate variables" 
    })
  }
})

/**
 * Count variable replacements
 */
function countReplacements(original: string, processed: string): number {
  const originalVariables = (original.match(/\{\{[^}]+\}\}/g) || []).length
  const remainingVariables = (processed.match(/\{\{[^}]+\}\}/g) || []).length
  return originalVariables - remainingVariables
}

/**
 * Calculate content improvements
 */
function calculateImprovements(original: string, optimized: string): any {
  const originalLines = original.split('\n').length
  const optimizedLines = optimized.split('\n').length
  
  const originalWords = original.split(/\s+/).length
  const optimizedWords = optimized.split(/\s+/).length

  return {
    lineCountChange: optimizedLines - originalLines,
    wordCountChange: optimizedWords - originalWords,
    hasTableOfContents: optimized.includes('# Table of Contents'),
    hasIntroduction: optimized.toLowerCase().includes('introduction'),
    hasConclusion: optimized.toLowerCase().includes('conclusion'),
    structureImprovements: [
      'Added table of contents for better navigation',
      'Enhanced section organization',
      'Improved content flow and readability'
    ]
  }
}

/**
 * Flatten object for variable display
 */
function flattenObject(obj: any, prefix: string): any {
  const flattened: any = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = `${prefix}.${key}`
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(flattened, this.flattenObject(value, fullKey))
    } else {
      flattened[fullKey] = {
        value,
        type: typeof value,
        description: `Variable for ${key}`
      }
    }
  }
  
  return flattened
}

/**
 * Validate variable values
 */
async function validateVariables(variables: Record<string, any>): Promise<any> {
  const results: any = {
    valid: [],
    invalid: [],
    warnings: []
  }

  for (const [name, value] of Object.entries(variables)) {
    const validation = this.validateSingleVariable(name, value)
    
    if (validation.isValid) {
      results.valid.push({ name, value, ...validation })
    } else {
      results.invalid.push({ name, value, ...validation })
    }
    
    if (validation.warnings.length > 0) {
      results.warnings.push({ name, warnings: validation.warnings })
    }
  }

  return results
}

/**
 * Validate a single variable
 */
function validateSingleVariable(name: string, value: any): any {
  const result = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[]
  }

  // Type validation
  const type = this.inferVariableType(name)
  
  switch (type) {
    case 'text':
      if (typeof value !== 'string') {
        result.isValid = false
        result.errors.push('Value must be a string')
      }
      break
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        result.isValid = false
        result.errors.push('Value must be a number')
      }
      break
    case 'boolean':
      if (typeof value !== 'boolean') {
        result.isValid = false
        result.errors.push('Value must be a boolean')
      }
      break
    case 'date':
      if (!(value instanceof Date) && isNaN(Date.parse(value))) {
        result.isValid = false
        result.errors.push('Value must be a valid date')
      }
      break
  }

  // Pattern validation
  if (name.toLowerCase().includes('email') && typeof value === 'string') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(value)) {
      result.isValid = false
      result.errors.push('Invalid email format')
    }
  }

  if (name.toLowerCase().includes('url') && typeof value === 'string') {
    const urlPattern = /^https?:\/\/./
    if (!urlPattern.test(value)) {
      result.isValid = false
      result.errors.push('Invalid URL format')
    }
  }

  // Length validation
  if (typeof value === 'string') {
    if (value.length === 0 && this.isVariableRequired(name)) {
      result.isValid = false
      result.errors.push('Required variable cannot be empty')
    }
    
    if (value.length > 1000) {
      result.warnings.push('Value is very long, consider shortening')
    }
  }

  return result
}

/**
 * Infer variable type from name
 */
function inferVariableType(name: string): string {
  const lowerName = name.toLowerCase()
  
  if (lowerName.includes('date') || lowerName.includes('time')) return 'date'
  if (lowerName.includes('count') || lowerName.includes('number')) return 'number'
  if (lowerName.includes('is') || lowerName.includes('has')) return 'boolean'
  if (lowerName.includes('list') || lowerName.includes('array')) return 'array'
  if (lowerName.includes('config') || lowerName.includes('settings')) return 'object'
  
  return 'text'
}

/**
 * Check if variable is required
 */
function isVariableRequired(name: string): boolean {
  const requiredPatterns = ['title', 'name', 'id', 'key', 'primary']
  const lowerName = name.toLowerCase()
  return requiredPatterns.some(pattern => lowerName.includes(pattern))
}

export default router
