/**
 * Prompt Assistant API Routes
 * Provides endpoints for AI-powered prompt engineering assistance
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { PromptAssistantService } from '../services/promptAssistantService'
import { logger } from '../utils/logger'

const router = Router()
const promptAssistant = new PromptAssistantService()

/**
 * POST /api/prompt-assistant/suggest
 * Generate AI-powered prompt suggestions
 */
router.post('/suggest', authMiddleware, validate({
  body: {
    templateType: 'string|required',
    methodology: 'string',
    context: 'object|required'
  }
}), async (req, res) => {
  try {
    const suggestion = await promptAssistant.suggestPrompt(req.body)
    res.json({ success: true, data: suggestion })
  } catch (error) {
    logger.error('Error in prompt suggestion', { error, request: req.body })
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate prompt suggestion' 
    })
  }
})

/**
 * POST /api/prompt-assistant/optimize
 * Optimize an existing prompt
 */
router.post('/optimize', authMiddleware, validate({
  body: {
    currentPrompt: 'string|required',
    issues: 'array|required',
    context: 'object|required'
  }
}), async (req, res) => {
  try {
    const optimized = await promptAssistant.optimizePrompt(req.body)
    res.json({ success: true, data: optimized })
  } catch (error) {
    logger.error('Error in prompt optimization', { error, request: req.body })
    res.status(500).json({ 
      success: false, 
      error: 'Failed to optimize prompt' 
    })
  }
})

/**
 * POST /api/prompt-assistant/score
 * Score a prompt on quality dimensions
 */
router.post('/score', authMiddleware, validate({
  body: {
    prompt: 'string|required'
  }
}), async (req, res) => {
  try {
    const score = await promptAssistant.scorePrompt(req.body.prompt)
    res.json({ success: true, data: score })
  } catch (error) {
    logger.error('Error in prompt scoring', { error, request: req.body })
    res.status(500).json({ 
      success: false, 
      error: 'Failed to score prompt' 
    })
  }
})

/**
 * GET /api/prompt-assistant/library
 * Get prompt template library
 */
router.get('/library', authMiddleware, async (req, res) => {
  try {
    const filters = {
      category: req.query.category as string,
      methodology: req.query.methodology as string,
      is_public: req.query.is_public === 'true' ? true : 
                  req.query.is_public === 'false' ? false : undefined
    }
    
    const library = await promptAssistant.getPromptLibrary(filters)
    res.json({ success: true, data: library })
  } catch (error) {
    logger.error('Error fetching prompt library', { error, query: req.query })
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch prompt library' 
    })
  }
})

/**
 * POST /api/prompt-assistant/save
 * Save a prompt template
 */
router.post('/save', authMiddleware, validate({
  body: {
    name: 'string|required',
    description: 'string',
    category: 'string|required',
    methodology: 'string|required',
    system_prompt: 'string|required',
    context_requirements: 'array|required',
    is_public: 'boolean|required'
  }
}), async (req, res) => {
  try {
    const template = {
      ...req.body,
      created_by: req.user.id
    }
    
    const id = await promptAssistant.savePromptTemplate(template)
    res.json({ success: true, data: { id } })
  } catch (error) {
    logger.error('Error saving prompt template', { error, request: req.body })
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save prompt template' 
    })
  }
})

/**
 * POST /api/prompt-assistant/track-performance
 * Track template generation performance
 */
router.post('/track-performance', authMiddleware, validate({
  body: {
    template_id: 'string|required',
    prompt_template_id: 'string',
    generation_id: 'string|required',
    model_used: 'string|required',
    quality_score: 'number|required',
    generation_time: 'number|required',
    cost: 'number|required',
    user_feedback: 'number'
  }
}), async (req, res) => {
  try {
    await promptAssistant.trackPerformance(req.body)
    res.json({ success: true })
  } catch (error) {
    logger.error('Error tracking performance', { error, request: req.body })
    res.status(500).json({ 
      success: false, 
      error: 'Failed to track performance' 
    })
  }
})

export default router
