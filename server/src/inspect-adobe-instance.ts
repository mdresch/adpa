import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

const serverEnvPath = path.join(process.cwd(), 'server', '.env')
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath })
} else {
  dotenv.config()
}

import { adobePdfService } from './services/adobePdfService'

// Access private fields via any for debugging
const cfg = (adobePdfService as any).config
console.log('Adobe wrapper config:', {
  enabled: cfg.enabled,
  clientId: cfg.clientId,
  clientSecretSet: !!cfg.clientSecret,
  organizationId: cfg.organizationId,
  accountId: cfg.accountId,
  privateKeyLength: cfg.privateKey ? cfg.privateKey.length : 0,
  outputDirectory: cfg.outputDirectory,
  tempDirectory: cfg.tempDirectory
})

export {}
