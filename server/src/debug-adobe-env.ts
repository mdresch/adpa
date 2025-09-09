import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load server/.env if present
const serverEnvPath = path.join(process.cwd(), 'server', '.env')
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath })
} else {
  dotenv.config()
}

console.log('ADOBE_PDF_ENABLED=', process.env.ADOBE_PDF_ENABLED)
console.log('ADOBE_CLIENT_ID=', process.env.ADOBE_CLIENT_ID)
console.log('ADOBE_CLIENT_SECRET=', process.env.ADOBE_CLIENT_SECRET ? '[SET]' : '[MISSING]')
console.log('ADOBE_ORGANIZATION_ID=', process.env.ADOBE_ORGANIZATION_ID)
console.log('ADOBE_ACCOUNT_ID=', process.env.ADOBE_ACCOUNT_ID)
console.log('ADOBE_PRIVATE_KEY=', process.env.ADOBE_PRIVATE_KEY ? '[SET]' : '[MISSING]')

// Print lengths to detect accidental truncation
console.log('CLIENT_ID_LENGTH=', process.env.ADOBE_CLIENT_ID?.length)
console.log('CLIENT_SECRET_LENGTH=', process.env.ADOBE_CLIENT_SECRET?.length)
console.log('PRIVATE_KEY_LENGTH=', process.env.ADOBE_PRIVATE_KEY?.length)

export {}
