import express from "express"
import { pool } from "../database/connection"
import { authenticateToken, requireRole } from "../middleware/auth"
import { logger } from "../utils/logger"
import crypto from "crypto"

const router = express.Router()

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const ALGORITHM = 'aes-256-cbc'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decrypt(text: string): string {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encryptedText = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '••••••••'
  return key.slice(0, 4) + '••••••••' + key.slice(-4)
}

// Get AI Gateway settings
router.get("/ai-gateway", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT setting_value, is_encrypted 
       FROM system_settings 
       WHERE setting_key = 'ai_gateway_api_key' 
       LIMIT 1`
    )

    let enabled = false
    let apiKeyMasked = "Not configured"

    if (result.rows.length > 0) {
      const setting = result.rows[0]
      let apiKey = setting.setting_value
      
      if (setting.is_encrypted && apiKey) {
        try {
          apiKey = decrypt(apiKey)
        } catch (error) {
          logger.error('Failed to decrypt AI Gateway API key:', error)
        }
      }

      if (apiKey && apiKey.length > 0) {
        enabled = true
        apiKeyMasked = maskApiKey(apiKey)
      }
    }

    res.json({
      enabled,
      api_key_masked: apiKeyMasked
    })
  } catch (error) {
    logger.error("Failed to get AI Gateway settings:", error)
    res.status(500).json({ error: "Failed to load settings" })
  }
})

// Save AI Gateway settings
router.post("/ai-gateway", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { api_key, enabled } = req.body

    if (!api_key || api_key.length === 0) {
      return res.status(400).json({ error: "API key is required" })
    }

    // Encrypt the API key
    const encryptedKey = encrypt(api_key)

    // Upsert the setting
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, is_encrypted, updated_by)
       VALUES ('ai_gateway_api_key', $1, true, $2)
       ON CONFLICT (setting_key) 
       DO UPDATE SET 
         setting_value = $1,
         is_encrypted = true,
         updated_by = $2,
         updated_at = CURRENT_TIMESTAMP`,
      [encryptedKey, req.user?.id || 'system']
    )

    // Also store the enabled flag
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, is_encrypted, updated_by)
       VALUES ('ai_gateway_enabled', $1, false, $2)
       ON CONFLICT (setting_key) 
       DO UPDATE SET 
         setting_value = $1,
         updated_by = $2,
         updated_at = CURRENT_TIMESTAMP`,
      [enabled.toString(), req.user?.id || 'system']
    )

    logger.info(`AI Gateway settings updated by user ${req.user?.email}`)

    res.json({ 
      message: "AI Gateway settings saved successfully",
      enabled: enabled
    })
  } catch (error) {
    logger.error("Failed to save AI Gateway settings:", error)
    res.status(500).json({ error: "Failed to save settings" })
  }
})

// Helper function to get AI Gateway API key (for use by aiService)
export async function getAIGatewayKey(): Promise<string | null> {
  try {
    const result = await pool.query(
      `SELECT setting_value, is_encrypted 
       FROM system_settings 
       WHERE setting_key = 'ai_gateway_api_key' 
       LIMIT 1`
    )

    if (result.rows.length === 0) {
      return null
    }

    let apiKey = result.rows[0].setting_value
    
    if (result.rows[0].is_encrypted && apiKey) {
      try {
        apiKey = decrypt(apiKey)
      } catch (error) {
        logger.error('Failed to decrypt AI Gateway API key:', error)
        return null
      }
    }

    return apiKey
  } catch (error) {
    logger.error("Failed to retrieve AI Gateway API key:", error)
    return null
  }
}

export default router

