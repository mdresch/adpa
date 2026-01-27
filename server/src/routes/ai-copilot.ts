import express from 'express'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { copilotAdapter } from '../modules/ai/copilotAdapter'
import { childLogger } from '../utils/logger'

const router = express.Router()

// Simple chat endpoint for Copilot PoC
router.post('/chat', authenticateToken, requirePermission('ai.generate'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { message, provider, model, temperature, max_tokens } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing `message` in request body' })
    }

    log.info('Copilot PoC chat request', { provider, model, promptLength: message.length })

    const result = await copilotAdapter.chat({
      prompt: message,
      provider,
      model,
      temperature,
      max_tokens,
    })

    res.json({ success: true, data: result })
  } catch (error: any) {
    log.error('Copilot chat failed', { error: error?.message || error })
    res.status(500).json({ error: 'Copilot chat failed', details: error?.message || String(error) })
  }
})

export default router
