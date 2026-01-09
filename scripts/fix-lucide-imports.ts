/**
 * Auto-fix lucide-react icon imports
 * Finds invalid icon imports and replaces them with valid alternatives
 */

import * as fs from 'fs'
import * as path from 'path'
import * as LucideIcons from 'lucide-react'

// Get all valid icon names from lucide-react
const validIcons = new Set(Object.keys(LucideIcons))

// Common icon name mappings (old name -> new name)
const iconMappings: Record<string, string> = {
  'AlertTriangle': 'TriangleAlert',
  'Activity': 'ActivityIcon',
  // Add more mappings as we discover them
}

// Track statistics
const stats = {
  filesScanned: 0,
  filesFixed: 0,
  importsFixed: 0,
  errors: [] as string[]
}

function findClosestMatch(invalidName: string, validNames: Set<string>): string | null {
  // Direct mapping
  if (iconMappings[invalidName]) {
    return iconMappings[invalidName]
  }

  // Check if it exists with Icon suffix
  if (validNames.has(invalidName + 'Icon')) {
    return invalidName + 'Icon'
  }

  // Check without Icon suffix
  if (invalidName.endsWith('Icon') && validNames.has(invalidName.slice(0, -4))) {
    return invalidName.slice(0, -4)
  }

  // Try case variations
  const lowerInvalid = invalidName.toLowerCase()
  for (const valid of validNames) {
    if (valid.toLowerCase() === lowerInvalid) {
      return valid
    }
  }

  return null
}

function fixLucideImports(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    let modified = false
    let newContent = content

    // Match: import { Icon1, Icon2, ... } from 'lucide-react'
    const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"]/g
    
    let match
    while ((match = importRegex.exec(content)) !== null) {
      const fullImport = match[0]
      const iconsString = match[1]
      
      // Split icons and clean them
      const icons = iconsString
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0)
        .map(i => {
          // Handle "as" aliases: Icon as CustomName
          const parts = i.split(/\s+as\s+/)
          return parts[0].trim()
        })

      const invalidIcons: string[] = []
      const replacements: Record<string, string> = {}

      // Check each icon
      for (const icon of icons) {
        if (!validIcons.has(icon)) {
          invalidIcons.push(icon)
          const suggestion = findClosestMatch(icon, validIcons)
          if (suggestion) {
            replacements[icon] = suggestion
          }
        }
      }

      // Apply replacements
      if (Object.keys(replacements).length > 0) {
        let updatedImport = fullImport
        for (const [oldName, newName] of Object.entries(replacements)) {
          // Replace in import statement
          const regex = new RegExp(`\\b${oldName}\\b`, 'g')
          updatedImport = updatedImport.replace(regex, newName)
          
          // Replace in file content (usage)
          newContent = newContent.replace(regex, newName)
          
          stats.importsFixed++
          modified = true
        }

        console.log(`  ✓ Fixed ${Object.keys(replacements).length} imports:`)
        for (const [old, neu] of Object.entries(replacements)) {
          console.log(`    ${old} → ${neu}`)
        }
      }

      // Report unfixable icons
      const unfixable = invalidIcons.filter(i => !replacements[i])
      if (unfixable.length > 0) {
        stats.errors.push(`${filePath}: Cannot auto-fix: ${unfixable.join(', ')}`)
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf-8')
      stats.filesFixed++
      return true
    }

    return false
  } catch (error) {
    stats.errors.push(`${filePath}: ${error}`)
    return false
  }
}

function scanDirectory(dir: string, extensions: string[] = ['.ts', '.tsx']): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // Skip node_modules, .next, etc.
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(entry.name)) {
        scanDirectory(fullPath, extensions)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      if (extensions.includes(ext)) {
        stats.filesScanned++
        const fixed = fixLucideImports(fullPath)
        if (fixed) {
          console.log(`✓ ${fullPath}`)
        }
      }
    }
  }
}

// Main execution
console.log('🔍 Scanning for lucide-react import errors...\n')
console.log(`📦 Found ${validIcons.size} valid lucide icons\n`)

const projectRoot = path.resolve(__dirname, '..')
const dirsToScan = [
  path.join(projectRoot, 'app'),
  path.join(projectRoot, 'components'),
  path.join(projectRoot, 'contexts'),
  path.join(projectRoot, 'hooks'),
  path.join(projectRoot, 'lib')
]

for (const dir of dirsToScan) {
  if (fs.existsSync(dir)) {
    console.log(`\n📂 Scanning ${path.basename(dir)}/...`)
    scanDirectory(dir)
  }
}

console.log('\n' + '='.repeat(60))
console.log('📊 Summary:')
console.log('='.repeat(60))
console.log(`Files scanned: ${stats.filesScanned}`)
console.log(`Files fixed: ${stats.filesFixed}`)
console.log(`Imports fixed: ${stats.importsFixed}`)
console.log(`Errors: ${stats.errors.length}`)

if (stats.errors.length > 0) {
  console.log('\n⚠️  Unfixable imports (manual review needed):')
  stats.errors.forEach(err => console.log(`  ${err}`))
}

console.log('\n✅ Done! Re-run TypeScript check to verify.')
