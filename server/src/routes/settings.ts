import express from "express"
import { pool } from "../database/connection"
import { authenticateToken, requireRole } from "../middleware/auth"
import { logger } from "../utils/logger"
import crypto from "crypto"

const router = express.Router()

// Encryption helpers
// Upgraded to AES-256-GCM for authenticated encryption (prevents tampering)
// GCM provides both confidentiality AND authenticity
const ALGORITHM = 'aes-256-gcm'
let ENCRYPTION_KEY: string | null = null
let KEK: string | null = null // Key Encryption Key

// Initialize KEK (Key Encryption Key) - used to encrypt the master encryption key
async function initializeKEK(): Promise<string> {
  // Priority 1: Environment variable (PRODUCTION - recommended)
  if (process.env.ENCRYPTION_KEK) {
    logger.info('✅ Using ENCRYPTION_KEK from environment variable (secure)')
    return process.env.ENCRYPTION_KEK
  }

  // SECURITY FIX: Do NOT store KEK in database (defeats envelope encryption!)
  // Storing the encryption key in the same database as encrypted data provides no security benefit
  
  const nodeEnv = process.env.NODE_ENV || 'development'
  
  if (nodeEnv === 'production') {
    // PRODUCTION: KEK is REQUIRED in environment variable
    logger.error('🚨 ========================================')
    logger.error('🚨 CRITICAL SECURITY ERROR')
    logger.error('🚨 ENCRYPTION_KEK environment variable REQUIRED in production')
    logger.error('🚨 Cannot start server without proper encryption key')
    logger.error('🚨 ========================================')
    throw new Error('ENCRYPTION_KEK environment variable must be set in production. See server/docs/ENCRYPTION_KEY_MANAGEMENT.md')
  } else {
    // DEVELOPMENT ONLY: Use known insecure KEK
    // This KEK is publicly visible and should NEVER be used in production
    logger.warn('⚠️  ========================================')
    logger.warn('⚠️  DEVELOPMENT MODE ONLY')
    logger.warn('⚠️  Using INSECURE development KEK')
    logger.warn('⚠️  DO NOT USE IN PRODUCTION!')
    logger.warn('⚠️  Set ENCRYPTION_KEK environment variable for production')
    logger.warn('⚠️  ========================================')
    
    // Known insecure KEK for development convenience
    // Anyone can see this, but that's fine for local development
    // MUST be valid 64-character hex string (32 bytes when decoded)
    const DEV_INSECURE_KEK = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    return DEV_INSECURE_KEK // 64 hex chars = 32 bytes
  }
}

// Get KEK (lazy initialization)
async function getKEK(): Promise<string> {
  if (!KEK) {
    KEK = await initializeKEK()
  }
  return KEK
}

// Encrypt data with a key using AES-256-GCM (authenticated encryption)
function encryptWithKey(text: string, key: string): string {
  const iv = crypto.randomBytes(16)
  // FIXED: Key is hex-encoded (64 chars = 32 bytes), use Buffer.from(key, 'hex')
  const keyBuffer = Buffer.from(key, 'hex')
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)
  
  let encrypted = cipher.update(text, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  
  // Get authentication tag (GCM provides authenticity)
  const authTag = cipher.getAuthTag()
  
  // Return format: iv:ciphertext:authTag
  return iv.toString('hex') + ':' + encrypted.toString('hex') + ':' + authTag.toString('hex')
}

// Decrypt data with a key using AES-256-GCM
function decryptWithKey(text: string, key: string): string {
  const parts = text.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = Buffer.from(parts[1], 'hex')
  const authTag = Buffer.from(parts[2], 'hex')
  
  // FIXED: Key is hex-encoded (64 chars = 32 bytes), use Buffer.from(key, 'hex')
  const keyBuffer = Buffer.from(key, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
  
  // Set authentication tag for verification
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString('utf8')
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
  // FIXED: Use proper hex decoding and GCM mode
  const keyBuffer = Buffer.from(key, 'hex')
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv)
  
  let encrypted = cipher.update(text, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  
  // Get authentication tag (GCM mode)
  const authTag = cipher.getAuthTag()
  
  // Return format: iv:ciphertext:authTag
  return iv.toString('hex') + ':' + encrypted.toString('hex') + ':' + authTag.toString('hex')
}

async function decrypt(text: string): Promise<string> {
  const key = await getEncryptionKey()
  const parts = text.split(':')
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format (expected iv:ciphertext:authTag)')
  }
  
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = Buffer.from(parts[1], 'hex')
  const authTag = Buffer.from(parts[2], 'hex')
  
  // FIXED: Use proper hex decoding and GCM mode
  const keyBuffer = Buffer.from(key, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv)
  
  // Set authentication tag for verification
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString('utf8')
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

