import express from "express"
import { pool } from "../database/connection"
import { authenticateToken, requireRole } from "../middleware/auth"
import { logger } from "../utils/logger"
import crypto from "crypto"

const router = express.Router()

// Encryption helpers
const ALGORITHM = 'aes-256-cbc'
let ENCRYPTION_KEY: string | null = null
let KEK: string | null = null // Key Encryption Key

// Initialize KEK (Key Encryption Key) - used to encrypt the master encryption key
async function initializeKEK(): Promise<string> {
  // Priority 1: Environment variable (PRODUCTION - recommended)
  if (process.env.ENCRYPTION_KEK) {
    logger.info('✅ Using ENCRYPTION_KEK from environment variable (secure)')
    return process.env.ENCRYPTION_KEK
  }

  // Priority 2: Load from database (DEVELOPMENT fallback)
  try {
    const result = await pool.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'kek_master' LIMIT 1`
    )

    if (result.rows.length > 0 && result.rows[0].setting_value) {
      logger.warn('⚠️  Using KEK from database (development only). Set ENCRYPTION_KEK env var for production!')
      return result.rows[0].setting_value
    }

    // Priority 3: Generate new KEK and persist (DEVELOPMENT only)
    const newKEK = crypto.randomBytes(32).toString('hex')
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, is_encrypted, updated_by)
       VALUES ('kek_master', $1, false, 'system')
       ON CONFLICT (setting_key) DO NOTHING`,
      [newKEK]
    )
    
    logger.warn('⚠️  Generated new KEK and persisted to database (development only)')
    logger.warn('🔐 For production, set ENCRYPTION_KEK environment variable!')
    return newKEK
  } catch (error) {
    logger.error('❌ Failed to initialize KEK from database:', error)
    logger.error('🚨 CRITICAL: Using temporary KEK. All encrypted data will be lost on restart!')
    return crypto.randomBytes(32).toString('hex')
  }
}

// Get KEK (lazy initialization)
async function getKEK(): Promise<string> {
  if (!KEK) {
    KEK = await initializeKEK()
  }
  return KEK
}

// Encrypt data with a key using AES-256-CBC
function encryptWithKey(text: string, key: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key.slice(0, 32)), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

// Decrypt data with a key using AES-256-CBC
function decryptWithKey(text: string, key: string): string {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encryptedText = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key.slice(0, 32)), iv)
  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

// Initialize encryption key - load from database (encrypted with KEK) or generate new one
async function initializeEncryptionKey(): Promise<string> {
  const kek = await getKEK()

  try {
    // Try to load encrypted master key from database
    const result = await pool.query(
      `SELECT setting_value, is_encrypted FROM system_settings WHERE setting_key = 'master_encryption_key' LIMIT 1`
    )

    if (result.rows.length > 0 && result.rows[0].setting_value) {
      const storedValue = result.rows[0].setting_value
      const isEncrypted = result.rows[0].is_encrypted

      if (isEncrypted) {
        // Decrypt the master key using KEK (envelope encryption)
        try {
          const masterKey = decryptWithKey(storedValue, kek)
          logger.info('✅ Loaded and decrypted master encryption key from database')
          return masterKey
        } catch (decryptError) {
          logger.error('❌ Failed to decrypt master encryption key. KEK may have changed!', decryptError)
          throw new Error('KEK mismatch - cannot decrypt master key')
        }
      } else {
        // Legacy: unencrypted master key - encrypt it now
        logger.warn('⚠️  Found unencrypted master key. Encrypting it now with KEK...')
        const encryptedMasterKey = encryptWithKey(storedValue, kek)
        
        await pool.query(
          `UPDATE system_settings 
           SET setting_value = $1, is_encrypted = true, updated_at = CURRENT_TIMESTAMP 
           WHERE setting_key = 'master_encryption_key'`,
          [encryptedMasterKey]
        )
        
        logger.info('✅ Master key encrypted and updated in database')
        return storedValue // Return the original plaintext key
      }
    }

    // No master key found - generate a new one and encrypt it with KEK
    const newMasterKey = crypto.randomBytes(32).toString('hex')
    const encryptedMasterKey = encryptWithKey(newMasterKey, kek)
    
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, is_encrypted, updated_by)
       VALUES ('master_encryption_key', $1, true, 'system')
       ON CONFLICT (setting_key) DO NOTHING`,
      [encryptedMasterKey]
    )
    
    logger.info('✅ Generated new master encryption key and encrypted it with KEK')
    return newMasterKey
  } catch (error) {
    logger.error('❌ Failed to initialize encryption key from database:', error)
    logger.error('🚨 CRITICAL: Using temporary encryption key. Data encrypted in this session will be lost on restart!')
    return crypto.randomBytes(32).toString('hex')
  }
}

// Get encryption key (lazy initialization)
async function getEncryptionKey(): Promise<string> {
  if (!ENCRYPTION_KEY) {
    ENCRYPTION_KEY = await initializeEncryptionKey()
  }
  return ENCRYPTION_KEY
}

async function encrypt(text: string): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key.slice(0, 32)), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

async function decrypt(text: string): Promise<string> {
  const key = await getEncryptionKey()
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encryptedText = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key.slice(0, 32)), iv)
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
          apiKey = await decrypt(apiKey)
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
    const encryptedKey = await encrypt(api_key)

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
        apiKey = await decrypt(apiKey)
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

