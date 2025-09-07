/**
 * Document Generator Validation
 * Request validation middleware for document generation endpoints
 */

import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { OutputFormat } from './types'

/**
 * Validation schema for document generation request
 */
const documentGenerationSchema = Joi.object({
  template_id: Joi.string().uuid().required().messages({
    'string.empty': 'Template ID is required',
    'string.uuid': 'Template ID must be a valid UUID',
    'any.required': 'Template ID is required'
  }),
  
  data: Joi.object().default({}).messages({
    'object.base': 'Data must be an object'
  }),
  
  output_format: Joi.string().valid(...Object.values(OutputFormat)).required().messages({
    'string.empty': 'Output format is required',
    'any.only': `Output format must be one of: ${Object.values(OutputFormat).join(', ')}`,
    'any.required': 'Output format is required'
  }),
  
  options: Joi.object({
    filename: Joi.string().pattern(/^[a-zA-Z0-9._-]+$/).messages({
      'string.pattern.base': 'Filename can only contain letters, numbers, dots, underscores, and hyphens'
    }),
    
    page_size: Joi.string().valid('A4', 'A3', 'A5', 'Letter', 'Legal', 'Tabloid').messages({
      'any.only': 'Page size must be one of: A4, A3, A5, Letter, Legal, Tabloid'
    }),
    
    orientation: Joi.string().valid('portrait', 'landscape').messages({
      'any.only': 'Orientation must be either portrait or landscape'
    }),
    
    margins: Joi.object({
      top: Joi.string().pattern(/^\d+(\.\d+)?(in|cm|mm|px)$/).messages({
        'string.pattern.base': 'Margin must be a valid CSS measurement (e.g., "1in", "2.5cm")'
      }),
      right: Joi.string().pattern(/^\d+(\.\d+)?(in|cm|mm|px)$/).messages({
        'string.pattern.base': 'Margin must be a valid CSS measurement (e.g., "1in", "2.5cm")'
      }),
      bottom: Joi.string().pattern(/^\d+(\.\d+)?(in|cm|mm|px)$/).messages({
        'string.pattern.base': 'Margin must be a valid CSS measurement (e.g., "1in", "2.5cm")'
      }),
      left: Joi.string().pattern(/^\d+(\.\d+)?(in|cm|mm|px)$/).messages({
        'string.pattern.base': 'Margin must be a valid CSS measurement (e.g., "1in", "2.5cm")'
      })
    }).messages({
      'object.base': 'Margins must be an object with top, right, bottom, left properties'
    }),
    
    include_toc: Joi.boolean().messages({
      'boolean.base': 'Include TOC must be a boolean value'
    }),
    
    include_header: Joi.boolean().messages({
      'boolean.base': 'Include header must be a boolean value'
    }),
    
    include_footer: Joi.boolean().messages({
      'boolean.base': 'Include footer must be a boolean value'
    }),
    
    header_template: Joi.string().when('include_header', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }).messages({
      'string.empty': 'Header template is required when include_header is true',
      'any.required': 'Header template is required when include_header is true'
    }),
    
    footer_template: Joi.string().when('include_footer', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }).messages({
      'string.empty': 'Footer template is required when include_footer is true',
      'any.required': 'Footer template is required when include_footer is true'
    }),
    
    css_styles: Joi.string().messages({
      'string.base': 'CSS styles must be a string'
    }),
    
    quality: Joi.number().min(1).max(100).messages({
      'number.base': 'Quality must be a number',
      'number.min': 'Quality must be at least 1',
      'number.max': 'Quality must be at most 100'
    }),
    
    compress: Joi.boolean().messages({
      'boolean.base': 'Compress must be a boolean value'
    })
  }).optional().messages({
    'object.base': 'Options must be an object'
  })
})

/**
 * Validation schema for generation ID parameter
 */
const generationIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.empty': 'Generation ID is required',
    'string.uuid': 'Generation ID must be a valid UUID',
    'any.required': 'Generation ID is required'
  })
})

/**
 * Validation schema for template data validation request
 */
const templateDataValidationSchema = Joi.object({
  template_id: Joi.string().uuid().required().messages({
    'string.empty': 'Template ID is required',
    'string.uuid': 'Template ID must be a valid UUID',
    'any.required': 'Template ID is required'
  }),
  
  data: Joi.object().required().messages({
    'object.base': 'Data must be an object',
    'any.required': 'Data is required'
  })
})

/**
 * Middleware to validate document generation request
 */
export const validateDocumentGeneration = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = documentGenerationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }))

    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    })
    return
  }

  // Replace request body with validated and sanitized data
  req.body = value
  next()
}

/**
 * Middleware to validate generation ID parameter
 */
export const validateGenerationId = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = generationIdSchema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }))

    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    })
    return
  }

  // Replace request params with validated data
  req.params = value
  next()
}

/**
 * Middleware to validate template data validation request
 */
export const validateTemplateDataValidation = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = templateDataValidationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }))

    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    })
    return
  }

  // Replace request body with validated and sanitized data
  req.body = value
  next()
}

/**
 * Custom validation functions
 */
export const validationHelpers = {
  /**
   * Validate that a string is a valid CSS measurement
   */
  isCSSMeasurement: (value: string): boolean => {
    return /^\d+(\.\d+)?(in|cm|mm|px|pt|pc|em|rem|%)$/.test(value)
  },

  /**
   * Validate that a filename is safe
   */
  isSafeFilename: (filename: string): boolean => {
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false
    }
    
    // Check for valid characters
    return /^[a-zA-Z0-9._-]+$/.test(filename)
  },

  /**
   * Validate that CSS is safe (basic check)
   */
  isSafeCSS: (css: string): boolean => {
    // Basic check for potentially dangerous CSS
    const dangerousPatterns = [
      /javascript:/i,
      /expression\(/i,
      /behavior:/i,
      /@import/i,
      /url\(/i
    ]
    
    return !dangerousPatterns.some(pattern => pattern.test(css))
  },

  /**
   * Sanitize filename
   */
  sanitizeFilename: (filename: string): string => {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
  }
}