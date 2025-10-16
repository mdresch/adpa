#!/usr/bin/env tsx
/**
 * Generate a secure Key Encryption Key (KEK) for production use
 * 
 * This script generates a cryptographically secure 32-byte (256-bit) key
 * to be used as the KEK in envelope encryption.
 * 
 * Usage:
 *   npx tsx server/scripts/generate-kek.ts
 * 
 * Or with PowerShell:
 *   pwsh server/scripts/generate-kek.ps1
 */

import crypto from 'crypto'

console.log('\n🔐 KEK (Key Encryption Key) Generator')
console.log('=====================================\n')

// Generate a secure 32-byte (256-bit) random key
const kek = crypto.randomBytes(32).toString('hex')

console.log('Generated KEK (keep this secure!):\n')
console.log(`  ${kek}\n`)

console.log('📝 Setup Instructions:')
console.log('====================\n')

console.log('1. For Railway (Production):')
console.log('   - Go to your Railway project settings')
console.log('   - Navigate to Variables tab')
console.log('   - Add a new variable:')
console.log('     Name:  ENCRYPTION_KEK')
console.log(`     Value: ${kek}\n`)

console.log('2. For Local Development (.env file):')
console.log('   Add this line to server/.env or server/env.local:\n')
console.log(`   ENCRYPTION_KEK=${kek}\n`)

console.log('3. For Docker (docker-compose.yml):')
console.log('   environment:')
console.log(`     - ENCRYPTION_KEK=${kek}\n`)

console.log('⚠️  SECURITY WARNINGS:')
console.log('===================')
console.log('• NEVER commit this key to version control')
console.log('• Store it securely (password manager, secrets vault)')
console.log('• Losing this key means all encrypted data becomes unrecoverable')
console.log('• Rotate this key periodically (requires re-encryption of all data)')
console.log('• For enterprise deployments, use AWS KMS or Azure Key Vault instead\n')

console.log('✅ Next Steps:')
console.log('=============')
console.log('1. Copy the KEK above to your environment configuration')
console.log('2. Restart your backend server')
console.log('3. The system will automatically:')
console.log('   - Use the KEK to encrypt the master encryption key')
console.log('   - Store the encrypted master key in the database')
console.log('   - Decrypt it on startup using the KEK')
console.log('4. Your API keys and sensitive data are now protected with envelope encryption\n')

