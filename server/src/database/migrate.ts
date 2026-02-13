import dotenv from "dotenv"
dotenv.config()

import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { connectDatabase, getDatabasePool } from "./connection"
import { logger } from "../utils/logger"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigrations() {
  try {
    logger.info("Starting database migrations...")

    // Ensure DB connection is established
    await connectDatabase()
    const pool = getDatabasePool()

    // Read and execute schema.sql
    const schemaPath = join(__dirname, "schema.sql")
    const schema = readFileSync(schemaPath, "utf-8")

    // Execute the entire schema as one statement to handle functions properly
    try {
      await pool.query(schema)
      logger.info("Schema executed successfully")
    } catch (error) {
      // If there's an error, try to execute statement by statement for better error handling
      if (error instanceof Error && !error.message.includes("already exists")) {
        logger.warn("Full schema execution failed, trying statement by statement...")

        // Split by semicolon but be careful with functions
        const statements = schema
          .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // Split on semicolons not inside quotes
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith("--"))

        for (const statement of statements) {
          try {
            if (statement.trim()) {
              await pool.query(statement)
              logger.info(`Executed: ${statement.substring(0, 50)}...`)
            }
          } catch (stmtError) {
            // Ignore "already exists" errors
            if (stmtError instanceof Error && stmtError.message.includes("already exists")) {
              logger.info(`Skipped (already exists): ${statement.substring(0, 50)}...`)
            } else {
              logger.error(`Failed to execute statement: ${statement.substring(0, 100)}...`)
              throw stmtError
            }
          }
        }
      } else {
        logger.info("Schema already exists, skipping...")
      }
    }

    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Record this migration
    await pool.query(
      "INSERT INTO migrations (name) VALUES ($1) ON CONFLICT DO NOTHING",
      ["initial_schema"]
    )

    // Run SharePoint fields migration
    try {
      const sharepointMigrationPath = join(__dirname, "migrations", "add_sharepoint_fields.sql")
      const sharepointMigration = readFileSync(sharepointMigrationPath, "utf-8")

      // Check if this migration has already been run
      const migrationCheck = await pool.query(
        "SELECT id FROM migrations WHERE name = $1",
        ["add_sharepoint_fields"]
      )

      if (migrationCheck.rows.length === 0) {
        await pool.query(sharepointMigration)
        await pool.query(
          "INSERT INTO migrations (name) VALUES ($1)",
          ["add_sharepoint_fields"]
        )
        logger.info("SharePoint fields migration completed")
      } else {
        logger.info("SharePoint fields migration already applied")
      }
    } catch (error) {
      logger.warn("SharePoint migration failed (may already be applied):", error)
    }

    // Run Confluence fields migration
    try {
      const confluenceMigrationPath = join(__dirname, "migrations", "add_confluence_fields.sql")
      const confluenceMigration = readFileSync(confluenceMigrationPath, "utf-8")

      // Check if this migration has already been run
      const confluenceMigrationCheck = await pool.query(
        "SELECT id FROM migrations WHERE name = $1",
        ["add_confluence_fields"]
      )

      if (confluenceMigrationCheck.rows.length === 0) {
        await pool.query(confluenceMigration)
        await pool.query(
          "INSERT INTO migrations (name) VALUES ($1)",
          ["add_confluence_fields"]
        )
        logger.info("Confluence fields migration completed")
      } else {
        logger.info("Confluence fields migration already applied")
      }
    } catch (error) {
      logger.warn("Confluence migration failed (may already be applied):", error)
    }

    // Run templates soft-delete fields migration
    try {
      const templatesMigrationPath = join(__dirname, "migrations", "add_template_soft_delete_fields.sql")
      const templatesMigration = readFileSync(templatesMigrationPath, "utf-8")

      const templatesMigrationCheck = await pool.query(
        "SELECT id FROM migrations WHERE name = $1",
        ["add_template_soft_delete_fields"]
      )

      if (templatesMigrationCheck.rows.length === 0) {
        await pool.query(templatesMigration)
        await pool.query(
          "INSERT INTO migrations (name) VALUES ($1)",
          ["add_template_soft_delete_fields"]
        )
        logger.info("Templates soft-delete migration completed")
      } else {
        logger.info("Templates soft-delete migration already applied")
      }
    } catch (error) {
      logger.warn("Templates soft-delete migration failed (may already be applied):", error)
    }

    // Run stakeholders migration
    try {
      const stakeholdersMigrationPath = join(__dirname, "migrations", "007_stakeholders.sql")
      const stakeholdersMigration = readFileSync(stakeholdersMigrationPath, "utf-8")

      const stakeholdersMigrationCheck = await pool.query(
        "SELECT id FROM migrations WHERE name = $1",
        ["007_stakeholders"]
      )

      if (stakeholdersMigrationCheck.rows.length === 0) {
        await pool.query(stakeholdersMigration)
        await pool.query(
          "INSERT INTO migrations (name) VALUES ($1)",
          ["007_stakeholders"]
        )
        logger.info("Stakeholders migration completed")
      } else {
        logger.info("Stakeholders migration already applied")
      }
    } catch (error) {
      logger.warn("Stakeholders migration failed (may already be applied):", error)
    }

    // Run template AI enhancements migration
    try {
      const aiEnhancementsMigrationPath = join(__dirname, "..", "..", "migrations", "add_template_ai_enhancements.sql")
      const aiEnhancementsMigration = readFileSync(aiEnhancementsMigrationPath, "utf-8")

      const aiEnhancementsMigrationCheck = await pool.query(
        "SELECT id FROM migrations WHERE name = $1",
        ["add_template_ai_enhancements"]
      )

      if (aiEnhancementsMigrationCheck.rows.length === 0) {
        await pool.query(aiEnhancementsMigration)
        await pool.query(
          "INSERT INTO migrations (name) VALUES ($1)",
          ["add_template_ai_enhancements"]
        )
        logger.info("Template AI enhancements migration completed")
      } else {
        logger.info("Template AI enhancements migration already applied")
      }
    } catch (error) {
      logger.warn("Template AI enhancements migration failed (may already be applied):", error)
    }

    // Run template paragraphs migration
    try {
      const templateParagraphsMigrationPath = join(__dirname, "..", "..", "migrations", "add_template_paragraphs.sql")
      const templateParagraphsMigration = readFileSync(templateParagraphsMigrationPath, "utf-8")

      const templateParagraphsMigrationCheck = await pool.query(
        "SELECT id FROM migrations WHERE name = $1",
        ["add_template_paragraphs"]
      )

      if (templateParagraphsMigrationCheck.rows.length === 0) {
        await pool.query(templateParagraphsMigration)
        await pool.query(
          "INSERT INTO migrations (name) VALUES ($1)",
          ["add_template_paragraphs"]
        )
        logger.info("Template paragraphs migration completed")
      } else {
        logger.info("Template paragraphs migration already applied")
      }
    } catch (error) {
      logger.warn("Template paragraphs migration failed (may already be applied):", error)
    }

    // Run project_integrations migration (WA-94)
    try {
      const projIntMigrationPath = join(__dirname, "migrations", "032_project_integrations.sql")
      const projIntMigration = readFileSync(projIntMigrationPath, "utf-8")

      const projIntMigrationCheck = await pool.query(
        "SELECT id FROM migrations WHERE name = $1",
        ["032_project_integrations"]
      )

      if (projIntMigrationCheck.rows.length === 0) {
        await pool.query(projIntMigration)
        await pool.query(
          "INSERT INTO migrations (name) VALUES ($1)",
          ["032_project_integrations"]
        )
        logger.info("project_integrations migration completed")
      } else {
        logger.info("project_integrations migration already applied")
      }
    } catch (error) {
      logger.warn("project_integrations migration failed (may already be applied):", error)
    }

    // Run documents.confluence_page_url migration (WA-92)
    try {
      const migPath = join(__dirname, "migrations", "033_documents_confluence_url.sql")
      const migSql = readFileSync(migPath, "utf-8")
      const migCheck = await pool.query("SELECT id FROM migrations WHERE name = $1", ["033_documents_confluence_url"])
      if (migCheck.rows.length === 0) {
        await pool.query(migSql)
        await pool.query("INSERT INTO migrations (name) VALUES ($1)", ["033_documents_confluence_url"])
        logger.info("documents.confluence_page_url migration completed")
      } else {
        logger.info("documents.confluence_page_url migration already applied")
      }
    } catch (error) {
      logger.warn("documents.confluence_page_url migration failed (may already be applied):", error)
    }

    // Run file_assets migration
    try {
      const migPath = join(__dirname, "migrations", "040_file_assets.sql")
      const migSql = readFileSync(migPath, "utf-8")
      const migCheck = await pool.query("SELECT id FROM migrations WHERE name = $1", ["040_file_assets"])
      if (migCheck.rows.length === 0) {
        await pool.query(migSql)
        await pool.query("INSERT INTO migrations (name) VALUES ($1)", ["040_file_assets"])
        logger.info("file_assets migration completed")
      } else {
        logger.info("file_assets migration already applied")
      }
    } catch (error) {
      logger.warn("file_assets migration failed (may already be applied):", error)
    }

    logger.info("Database migrations completed successfully")
  } catch (error) {
    logger.error("Migration failed:", error)
    throw error
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Migrations completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Migration failed:", error)
      process.exit(1)
    })
}

export { runMigrations }
