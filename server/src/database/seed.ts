import bcrypt from "bcryptjs"
import { pool } from "./connection"
import { logger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

async function seedDatabase() {
  try {
    logger.info("Starting database seeding...")

    // Create admin user with fixed UUID
    const adminId = "3a82e0e8-c54d-4f99-b1d7-e651ce101341"
    const adminPassword = await bcrypt.hash("admin123", 12)

    await pool.query(`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions
    `, [
      adminId,
      "admin@adpa.com",
      adminPassword,
      "System Administrator",
      "admin",
      JSON.stringify({
        "users.create": true,
        "users.update": true,
        "users.delete": true,
        "projects.create": true,
        "projects.update": true,
        "projects.delete": true,
        "documents.create": true,
        "documents.update": true,
        "documents.delete": true,
        "templates.create": true,
        "templates.update": true,
        "templates.delete": true,
        "ai.generate": true,
        "ai.configure": true,
        "analytics.system": true,
        "security.view": true,
        "security.manage": true,
        "security.audit": true,
        "integrations.create": true,
        "integrations.update": true,
        "integrations.delete": true,
        "integrations.view": true,
        "integrations.manage": true,
        "integrations.test": true,
        "integrations.sync": true,
        "jobs.stats": true,
        "jobs.admin": true,
      })
    ])

    // Create demo user with fixed UUID
    const userId = "b1f3d2c4-e5a6-4b7c-8d9e-f0a1b2c3d4e5"
    const userPassword = await bcrypt.hash("demo123", 12)

    await pool.query(`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions
    `, [
      userId,
      "demo@adpa.com",
      userPassword,
      "Demo User",
      "user",
      JSON.stringify({
        "projects.create": true,
        "projects.update": true,
        "documents.create": true,
        "documents.update": true,
        "templates.create": true,
        "templates.update": true,
        "ai.generate": true,
      })
    ])

    // Create test user with fixed UUID (for testing integrations)
    const testUserId = "672e6d7b-0655-48eb-b33c-9eb8bcc6f9b8"
    const testPassword = await bcrypt.hash("password123", 12)

    await pool.query(`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions
    `, [
      testUserId,
      "test@example.com",
      testPassword,
      "Test User",
      "admin",
      JSON.stringify({
        "jobs.admin": true,
        "jobs.stats": true,
        "ai.generate": true,
        "ai.configure": true,
        "users.create": true,
        "users.delete": true,
        "users.update": true,
        "security.view": true,
        "security.audit": true,
        "projects.create": true,
        "projects.delete": true,
        "projects.update": true,
        "security.manage": true,
        "analytics.system": true,
        "documents.create": true,
        "documents.delete": true,
        "documents.update": true,
        "templates.create": true,
        "templates.delete": true,
        "templates.update": true,
        "integrations.read": true,
        "integrations.sync": true,
        "integrations.test": true,
        "integrations.create": true,
        "integrations.delete": true,
        "integrations.manage": true,
        "integrations.update": true
      })
    ])

    // Create sample AI providers
    const openaiId = "f1e2d3c4-b5a6-4978-8c9d-e0f1a2b3c4d5"

    // Check if OpenAI provider exists
    const openaiExists = await pool.query("SELECT id FROM ai_providers WHERE name = $1", ["OpenAI GPT"])
    if (openaiExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        openaiId,
        "OpenAI GPT",
        "openai",
        Buffer.from("your-openai-api-key").toString("base64"),
        JSON.stringify({
          organization: "",
          baseURL: "https://api.openai.com/v1",
        }),
        false // Disabled by default until real API key is provided
      ])
    }

    const googleId = "a2b3c4d5-e6f7-4890-9abc-def123456789"

    // Check if Google provider exists
    const googleExists = await pool.query("SELECT id FROM ai_providers WHERE name = $1", ["Google Gemini"])
    if (googleExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        googleId,
        "Google Gemini",
        "google",
        Buffer.from("your-google-api-key").toString("base64"),
        JSON.stringify({}),
        false // Disabled by default until real API key is provided
      ])
    }

    // Create sample templates
    const togafTemplateId = "c1d2e3f4-a5b6-4789-8cde-f012345678ab"

    // Check if TOGAF template exists
    const togafExists = await pool.query("SELECT id FROM templates WHERE name = $1", ["TOGAF Business Architecture Document"])
    if (togafExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        togafTemplateId,
      "TOGAF Business Architecture Document",
      "Standard template for TOGAF business architecture documentation",
      "TOGAF",
      "Business Architecture",
      JSON.stringify({
        sections: [
          {
            title: "Executive Summary",
            content: "{{executive_summary}}",
            required: true
          },
          {
            title: "Business Goals and Objectives",
            content: "{{business_goals}}",
            required: true
          },
          {
            title: "Current State Architecture",
            content: "{{current_state}}",
            required: false
          },
          {
            title: "Future State Architecture",
            content: "{{future_state}}",
            required: true
          },
          {
            title: "Gap Analysis",
            content: "{{gap_analysis}}",
            required: true
          },
          {
            title: "Implementation Roadmap",
            content: "{{roadmap}}",
            required: true
          }
        ]
      }),
      JSON.stringify([
        {
          name: "executive_summary",
          type: "text",
          required: true,
          description: "High-level summary of the business architecture"
        },
        {
          name: "business_goals",
          type: "text",
          required: true,
          description: "Key business goals and objectives"
        },
        {
          name: "current_state",
          type: "text",
          required: false,
          description: "Description of current business architecture"
        },
        {
          name: "future_state",
          type: "text",
          required: true,
          description: "Description of target business architecture"
        },
        {
          name: "gap_analysis",
          type: "text",
          required: true,
          description: "Analysis of gaps between current and future state"
        },
        {
          name: "roadmap",
          type: "text",
          required: true,
          description: "Implementation roadmap and timeline"
        }
      ]),
      true,
      adminId
    ])
    }

    const sabsaTemplateId = "d2e3f4a5-b6c7-4890-9def-012345678abc"

    // Check if SABSA template exists
    const sabsaExists = await pool.query("SELECT id FROM templates WHERE name = $1", ["SABSA Security Architecture Framework"])
    if (sabsaExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        sabsaTemplateId,
      "SABSA Security Architecture Framework",
      "Template for SABSA security architecture documentation",
      "SABSA",
      "Security Architecture",
      JSON.stringify({
        sections: [
          {
            title: "Business Requirements",
            content: "{{business_requirements}}",
            required: true
          },
          {
            title: "Risk Assessment",
            content: "{{risk_assessment}}",
            required: true
          },
          {
            title: "Security Architecture",
            content: "{{security_architecture}}",
            required: true
          },
          {
            title: "Implementation Plan",
            content: "{{implementation_plan}}",
            required: true
          }
        ]
      }),
      JSON.stringify([
        {
          name: "business_requirements",
          type: "text",
          required: true,
          description: "Business security requirements"
        },
        {
          name: "risk_assessment",
          type: "text",
          required: true,
          description: "Security risk assessment and analysis"
        },
        {
          name: "security_architecture",
          type: "text",
          required: true,
          description: "Detailed security architecture design"
        },
        {
          name: "implementation_plan",
          type: "text",
          required: true,
          description: "Security implementation plan and timeline"
        }
      ]),
      true,
      adminId
    ])
    }

    // Create sample project
    const projectId = "e3f4a5b6-c7d8-4901-adef-123456789bcd"

    // Check if project exists
    const projectExists = await pool.query("SELECT id FROM projects WHERE name = $1", ["Digital Transformation Initiative"])
    if (projectExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO projects (id, name, description, framework, status, priority, owner_id, team_members)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        projectId,
      "Digital Transformation Initiative",
      "Enterprise-wide digital transformation project using TOGAF framework",
      "TOGAF",
      "active",
      "high",
      adminId,
      JSON.stringify([userId])
    ])
    }

    // Create sample document
    const documentId = "f4a5b6c7-d8e9-4012-bcde-23456789abcd"

    // Get the actual project ID (in case it already existed)
    const actualProject = await pool.query("SELECT id FROM projects WHERE name = $1", ["Digital Transformation Initiative"])
    if (actualProject.rows.length === 0) {
      logger.warn("Project not found, skipping document creation")
      return
    }
    const actualProjectId = actualProject.rows[0].id

    // Get the actual template ID (in case it already existed)
    const actualTemplate = await pool.query("SELECT id FROM templates WHERE name = $1", ["TOGAF Business Architecture Document"])
    const actualTemplateId = actualTemplate.rows.length > 0 ? actualTemplate.rows[0].id : null

    // Check if document exists
    const documentExists = await pool.query("SELECT id FROM documents WHERE project_id = $1 AND name = $2", [actualProjectId, "Business Architecture Overview"])
    if (documentExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO documents (id, project_id, name, content, template_id, status, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        documentId,
        actualProjectId,
      "Business Architecture Overview",
      JSON.stringify({
        executive_summary: "This document outlines the business architecture for our digital transformation initiative.",
        business_goals: "Improve operational efficiency, enhance customer experience, and reduce costs.",
        current_state: "Legacy systems with manual processes and limited integration.",
        future_state: "Integrated digital platform with automated workflows and real-time analytics.",
        gap_analysis: "Key gaps include system integration, process automation, and data analytics capabilities.",
        roadmap: "Phase 1: Assessment (Q1), Phase 2: Design (Q2), Phase 3: Implementation (Q3-Q4)"
      }),
      actualTemplateId,
      "draft",
      adminId,
      adminId
    ])
    }

    logger.info("Database seeding completed successfully")
    logger.info("Demo accounts created:")
    logger.info("  Admin: admin@adpa.com / admin123")
    logger.info("  User:  demo@adpa.com / demo123")
    logger.info("  Test:  test@example.com / password123")

  } catch (error) {
    logger.error("Seeding failed:", error)
    throw error
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info("Seeding completed")
      process.exit(0)
    })
    .catch((error) => {
      logger.error("Seeding failed:", error)
      process.exit(1)
    })
}

export { seedDatabase }
