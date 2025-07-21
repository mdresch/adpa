import { readFileSync } from "fs"
import { join } from "path"
import { pool } from "./connection"
import { logger } from "../utils/logger"

async function runMigrations() {
  try {
    logger.info("Starting database migrations...")

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
      logger.info("Migrations completed")
      process.exit(0)
    })
    .catch((error) => {
      logger.error("Migration failed:", error)
      process.exit(1)
    })
}

export { runMigrations }
