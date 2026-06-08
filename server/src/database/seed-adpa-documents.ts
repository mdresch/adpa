import db from "../lib/db"
import { readFileSync, readdirSync, statSync } from "fs"
import { join, extname, resolve, sep } from "path"
import { logger } from "../utils/logger"
import { isPathContained } from "../utils/pathSecurity"

// Uses shared DB singleton via `server/src/lib/db.ts`

interface DocumentCategory {
  name: string
  description: string
  framework: string
}

const documentCategories: Record<string, DocumentCategory> = {
  "basic-docs": {
    name: "Basic Documentation",
    description: "Fundamental project documents including business case, user stories, and personas",
    framework: "PMBOK"
  },
  "project-charter": {
    name: "Project Charter",
    description: "Official project authorization and high-level requirements",
    framework: "PMBOK"
  },
  "management-plans": {
    name: "Management Plans",
    description: "Comprehensive project management plans covering all knowledge areas",
    framework: "PMBOK"
  },
  "planning": {
    name: "Project Planning",
    description: "Detailed planning documents including WBS, schedules, and resource estimates",
    framework: "PMBOK"
  },
  "scope-management": {
    name: "Scope Management",
    description: "Scope definition, control, and validation documents",
    framework: "PMBOK"
  },
  "requirements": {
    name: "Requirements Management",
    description: "Requirements collection, analysis, and traceability",
    framework: "BABOK"
  },
  "stakeholder-management": {
    name: "Stakeholder Management",
    description: "Stakeholder identification, analysis, and engagement planning",
    framework: "PMBOK"
  },
  "risk-management": {
    name: "Risk Management",
    description: "Risk identification, analysis, and response planning",
    framework: "PMBOK"
  },
  "quality-assurance": {
    name: "Quality Assurance",
    description: "Testing strategies, test plans, and quality metrics",
    framework: "PMBOK"
  },
  "technical-design": {
    name: "Technical Design",
    description: "System architecture, database design, and technical specifications",
    framework: "CUSTOM"
  },
  "technical-analysis": {
    name: "Technical Analysis",
    description: "Technical risk analysis, compliance considerations, and technology assessments",
    framework: "CUSTOM"
  },
  "strategic-statements": {
    name: "Strategic Statements",
    description: "Mission, vision, values, and strategic business case",
    framework: "CUSTOM"
  },
  "babok": {
    name: "Business Analysis Body of Knowledge",
    description: "BABOK v3 compliant business analysis documentation",
    framework: "BABOK"
  },
  "dmbok": {
    name: "Data Management Body of Knowledge",
    description: "DMBOK 2.0 compliant data management and governance documentation",
    framework: "DMBOK"
  },
  "pmbok": {
    name: "Project Management Body of Knowledge",
    description: "PMBOK 7 compliant project management processes",
    framework: "PMBOK"
  }
}

async function findOrCreateAdpaProject(): Promise<string> {
  try {
    // Check if ADPA project exists
    const existingProject = await db.query(
      "SELECT id FROM projects WHERE name = $1",
      ["ADPA - Advanced Document Processing Automation"]
    )

    if (existingProject.rows.length > 0) {
      logger.info("Found existing ADPA project:", existingProject.rows[0].id)
      return existingProject.rows[0].id
    }

    // Get test user ID for project creation
    const testUser = await db.query(
      "SELECT id FROM users WHERE email = $1",
      ["test@example.com"]
    )

    if (testUser.rows.length === 0) {
      throw new Error("Test user not found. Please run the main seed script first.")
    }

    const userId = testUser.rows[0].id

    // Create ADPA project
    const newProject = await db.query(
      `INSERT INTO projects (
        id, name, description, framework, status, owner_id, created_by,
        team_members, settings, metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) RETURNING id`,
      [
        "ADPA - Advanced Document Processing Automation",
        "Advanced Document Processing & Automation Framework - A comprehensive platform for automating business analysis, project management, and data governance documentation using AI-powered tools and industry-standard frameworks (BABOK v3, PMBOK 7, DMBOK 2.0).",
        "PMBOK", // framework field
        "active",
        userId,
        userId,
        JSON.stringify([{ userId, role: "Project Manager", permissions: ["read", "write", "admin"] }]),
        JSON.stringify({
          methodology: "Agile",
          phase: "Execution",
          priority: "High",
          budget: 500000,
          startDate: "2025-01-01",
          endDate: "2025-12-31"
        }),
        JSON.stringify({
          category: "Strategic Initiative",
          type: "Technology Implementation",
          compliance: ["BABOK v3", "PMBOK 7", "DMBOK 2.0"],
          tags: ["AI", "Automation", "Documentation", "Enterprise"],
          sponsor: "Executive Leadership",
          pmo: "Enterprise PMO"
        })
      ]
    )

    logger.info("Created new ADPA project:", newProject.rows[0].id)
    return newProject.rows[0].id
  } catch (error) {
    logger.error("Failed to find or create ADPA project:", error)
    throw error
  }
}

function getAllMarkdownFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = []
  const items = readdirSync(dir)

  for (const item of items) {
    const rootPath = resolve(dir)
    const fullPath = resolve(dir, item)
    if (!isPathContained(fullPath, rootPath)) {
      continue
    }
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath, baseDir))
    } else if (extname(item) === '.md') {
      files.push(fullPath)
    }
  }

  return files
}

function extractDocumentMetadata(content: string, filePath: string) {
  const lines = content.split('\n')
  let title = ""
  let category = ""
  let framework = ""
  let description = ""
  let generatedDate = ""

  // Extract title (first # heading)
  for (const line of lines) {
    if (line.startsWith('# ') && !title) {
      title = line.substring(2).trim()
      break
    }
  }

  // Extract metadata from header comments
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i]
    if (line.includes('**Category:**')) {
      category = line.split('**Category:**')[1]?.trim() || ""
    }
    if (line.includes('**Generated:**')) {
      generatedDate = line.split('**Generated:**')[1]?.trim() || ""
    }
    if (line.includes('**Description:**')) {
      description = line.split('**Description:**')[1]?.trim() || ""
    }
  }

  // Determine category and framework from file path
  const pathParts = filePath.split('/')
  const categoryFromPath = pathParts.find(part => documentCategories[part])
  
  if (categoryFromPath && documentCategories[categoryFromPath]) {
    category = category || categoryFromPath
    framework = documentCategories[categoryFromPath].framework
  }

  // Fallback title from filename
  if (!title) {
    const filename = filePath.split('/').pop()?.replace('.md', '') || ""
    title = filename.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return {
    title,
    category,
    framework,
    description,
    generatedDate
  }
}

async function seedAdpaDocuments() {
  try {
    logger.info("Starting ADPA documents seeding...")

    // Find or create ADPA project
    const projectId = await findOrCreateAdpaProject()

    // Get generated documents directory
    const documentsDir = join(process.cwd(), "..", "generated-documents")

    logger.info(`Looking for documents in: ${documentsDir}`)

    try {
      const stat = statSync(documentsDir)
      if (!stat.isDirectory()) {
        throw new Error(`Path exists but is not a directory: ${documentsDir}`)
      }
    } catch (error) {
      logger.error(`Generated documents directory not found: ${documentsDir}`)
      logger.error("Error:", error)
      throw new Error(`Generated documents directory not found: ${documentsDir}`)
    }

    // Get all markdown files
    const markdownFiles = getAllMarkdownFiles(documentsDir)
    logger.info(`Found ${markdownFiles.length} markdown files to process`)

    if (markdownFiles.length === 0) {
      logger.warn("No markdown files found. Checking directory contents...")
      try {
        const dirContents = readdirSync(documentsDir)
        logger.info("Directory contents:", dirContents.slice(0, 10)) // Show first 10 items
      } catch (error) {
        logger.error("Failed to read directory contents:", error)
      }
      return
    }

    let successCount = 0
    let skipCount = 0

    for (const filePath of markdownFiles) {
      try {
        // Read file content
        const content = readFileSync(filePath, 'utf-8')
        
        // Extract metadata
        const metadata = extractDocumentMetadata(content, filePath)
        
        // Skip if no meaningful content
        if (content.length < 100) {
          logger.warn(`Skipping short file: ${filePath}`)
          skipCount++
          continue
        }

        // Check if document already exists
        const existingDoc = await db.query(
              "SELECT id FROM documents WHERE name = $1 AND project_id = $2",
              [metadata.title, projectId]
            )

        if (existingDoc.rows.length > 0) {
          logger.info(`Document already exists: ${metadata.title}`)
          skipCount++
          continue
        }

        // Insert document
        await db.query(
          `INSERT INTO documents (
            id, name, content, project_id, framework, status, metadata, created_by, updated_by, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
          )`,
          [
            metadata.title,
            JSON.stringify({ markdown: content }), // Store content as JSON with markdown field
            projectId,
            metadata.framework || "PMBOK",
            "published",
            JSON.stringify({
              category: metadata.category,
              description: metadata.description,
              generatedDate: metadata.generatedDate,
              filePath: filePath.replace(documentsDir, ""),
              source: "adpa-enterprise-framework-automation",
              version: "3.2.0",
              tags: [metadata.framework, metadata.category].filter(Boolean)
            }),
            null, // created_by (system)
            null  // updated_by (system)
          ]
        )

        successCount++
        logger.info(`✅ Imported: ${metadata.title} (${metadata.framework})`)

      } catch (error) {
        logger.error(`Failed to process file ${filePath}:`, error)
      }
    }

    logger.info(`🎉 ADPA documents seeding completed!`)
    logger.info(`📊 Results: ${successCount} imported, ${skipCount} skipped`)
    
  } catch (error) {
    logger.error("Failed to seed ADPA documents:", error)
    throw error
    } finally {
    await db.end()
  }
}

// Run if called directly
if (require.main === module) {
  seedAdpaDocuments()
    .then(() => {
      logger.info("ADPA documents seeding completed successfully")
      process.exit(0)
    })
    .catch((error) => {
      logger.error("ADPA documents seeding failed:", error)
      process.exit(1)
    })
}

export { seedAdpaDocuments }
