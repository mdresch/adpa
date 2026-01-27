import { aiService } from "../../services/aiService"
import { pool } from "../../database/connection"
import { logger } from "../../utils/logger"

export interface CopilotChatRequest {
  prompt: string
  provider?: string
  model?: string
  temperature?: number
  max_tokens?: number
}

export interface CopilotChatResponse {
  content: string
  provider: string
  model: string
}

export class CopilotAdapter {
  constructor() {}

  /**
   * Chat wrapper that forwards to the existing AI service with failover.
   * This serves as a PoC adapter for the Copilot SDK surface.
   */
  async chat(req: CopilotChatRequest): Promise<CopilotChatResponse> {
    const provider = req.provider || 'copilot'

    // Try to load provider API key from DB (if configured)
    let apiKey: string | undefined = process.env.COPILOT_API_KEY
    try {
      // Try to find by provider name or by provider_type (allows storing provider as type 'copilot')
      const r = await pool.query(
        "SELECT api_key_encrypted, configuration, provider_type, name FROM ai_providers WHERE name = $1 OR provider_type = $1 LIMIT 1",
        [provider]
      )
      if (r.rows.length > 0) {
        const row = r.rows[0]
        if (row.api_key_encrypted) {
          try {
            apiKey = Buffer.from(row.api_key_encrypted, 'base64').toString('utf-8')
          } catch (e) {
            apiKey = row.api_key_encrypted
          }
        } else if (row.configuration) {
          try {
            const cfg = typeof row.configuration === 'string' ? JSON.parse(row.configuration) : row.configuration
            apiKey = apiKey || cfg.apiKey || cfg.api_key
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      logger.warn('Failed to load provider config for copilot adapter', e)
    }

    // Attempt to dynamically import the Copilot SDK
    let sdk: any = null
    try {
      // Try common package names
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        sdk = require('@github/copilot-sdk')
      } catch {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          sdk = require('github-copilot-sdk')
        } catch {
          sdk = null
        }
      }
    } catch (e) {
      sdk = null
    }

    if (sdk && apiKey) {
      try {
        // Create client (support several possible SDK shapes)
        let client: any = null
        if (typeof sdk.createCopilotClient === 'function') {
          client = sdk.createCopilotClient({ apiKey })
        } else if (sdk.CopilotClient) {
          client = new sdk.CopilotClient({ apiKey })
        } else if (typeof sdk.default === 'function') {
          client = new sdk.default({ apiKey })
        } else if (typeof sdk === 'function') {
          client = sdk({ apiKey })
        }

        // Best-effort call shapes
        let responseText = ''
        if (client) {
          // If SDK exposes chat.create or chat.completions
          if (client.chat && typeof client.chat.create === 'function') {
            const out = await client.chat.create({
              model: req.model || 'copilot-chat',
              messages: [
                { role: 'user', content: req.prompt }
              ],
              temperature: req.temperature,
              max_tokens: req.max_tokens
            })
            responseText = (out?.choices?.[0]?.message?.content) || out?.text || String(out)
          } else if (typeof client.createChatCompletion === 'function') {
            const out = await client.createChatCompletion({
              model: req.model || 'copilot-chat',
              messages: [
                { role: 'user', content: req.prompt }
              ],
              temperature: req.temperature,
              max_tokens: req.max_tokens
            })
            responseText = out?.choices?.[0]?.message?.content || out?.choices?.[0]?.text || String(out)
          } else if (typeof client.generate === 'function') {
            // Some SDKs use a generic generate API
            const out = await client.generate({
              model: req.model || 'copilot-chat',
              input: req.prompt,
              temperature: req.temperature,
              max_tokens: req.max_tokens
            })
            responseText = out?.text || out?.output?.[0]?.content || String(out)
          } else {
            // Unknown client shape; fall back
            logger.warn('Copilot SDK client has unknown method signatures; falling back to aiService')
            const result = await aiService.generateWithFallback({
              prompt: req.prompt,
              provider: 'openai',
              model: req.model,
              temperature: req.temperature,
              max_tokens: req.max_tokens
            })
            return {
              content: result.content,
              provider: result.providerUsed || 'openai',
              model: result.model || req.model || 'unknown'
            }
          }

          return {
            content: responseText,
            provider: provider,
            model: req.model || 'copilot-chat'
          }
        }
      } catch (e: any) {
        logger.error('Copilot SDK call failed, falling back to aiService', e?.message || e)
        // fall through to aiService fallback
      }
    }

    // Fallback: use existing AI service with failover
    const result = await aiService.generateWithFallback({
      prompt: req.prompt,
      provider: req.provider || 'openai',
      model: req.model,
      temperature: req.temperature,
      max_tokens: req.max_tokens,
    })

    return {
      content: result.content,
      provider: result.providerUsed || (req.provider || 'openai'),
      model: result.model || req.model || 'unknown'
    }
  }
}

export const copilotAdapter = new CopilotAdapter()
