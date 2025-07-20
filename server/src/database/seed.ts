import bcrypt from "bcryptjs"
import { pool } from "./connection"
import { logger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

async function seedDatabase() {
  try {
    logger.info("Starting database seeding...")

    // Create admin user
    const adminId = uuidv4()
    const adminPassword = await bcrypt.hash("admin123", 12)
    
    await pool.query(`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
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
        "integrations.test": true,
        "integrations.sync": true,
        "jobs.stats": true,
        "jobs.admin": true,
      })
    ])

    // Create demo user
    const userId = uuidv4()
    const userPassword = await bcrypt.hash("demo123", 12)
    
    await pool.query(`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
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

    // Create sample AI providers
    const openaiId = uuidv4()
    await pool.query(`
      INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
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

    const googleId = uuidv4()
    await pool.query(`
      INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [
      googleId,
      "Google Gemini",
      "google",
      Buffer.from("your-google-api-key").toString("base64"),
      JSON.stringify({}),
      false // Disabled by default until real API key is provided
    ])

    // Create sample templates
    const togafTemplateId = uuidv4()
    await pool.query(`
      INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT DO NOTHING
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

    const sabsaTemplateId = uuidv4()
    await pool.query(`
      INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT DO NOTHING
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

    // Create sample project
    const projectId = uuidv4()
    await pool.query(`
      INSERT INTO projects (id, name, description, framework, status, priority, owner_id, team_members)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
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

    // Create sample document
    const documentId = uuidv4()
    await pool.query(`
      INSERT INTO documents (id, project_id, name, content, template_id, status, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
    `, [
      documentId,
      projectId,
      "Business Architecture Overview",
      JSON.stringify({
        executive_summary: "This document outlines the business architecture for our digital transformation initiative.",
        business_goals: "Improve operational efficiency, enhance customer experience, and reduce costs.",
        current_state: "Legacy systems with manual processes and limited integration.",
        future_state: "Integrated digital platform with automated workflows and real-time analytics.",
        gap_analysis: "Key gaps include system integration, process automation, and data analytics capabilities.",
        roadmap: "Phase 1: Assessment (Q1), Phase 2: Design (Q2), Phase 3: Implementation (Q3-Q4)"
      }),
      togafTemplateId,
      "draft",
      adminId,
      adminId
    ])

    logger.info("Database seeding completed successfully")
    logger.info("Demo accounts created:")
    logger.info("  Admin: admin@adpa.com / admin123")
    logger.info("  User:  demo@adpa.com / demo123")

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
