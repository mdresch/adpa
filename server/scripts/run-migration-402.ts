/**
 * Run Migration 402: Create work_items table
 *
 * Usage:
 *   npm run migrate:402
 */

import dotenv from "dotenv"
import { readFileSync } from "fs"
import { join } from "path"
import { connectDatabase, getDatabasePool } from "../src/database/connection"
import { logger } from "../src/utils/logger"

if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function runMigration() {
  try {
    logger.info("Connecting to database...")
    await connectDatabase()
    logger.info("Database connected")
  } catch (err) {
    logger.error("Failed to connect to database", err)
    throw err
  }

  const pool = getDatabasePool()
  const client = await pool.connect()

  try {
    const migrationPath = join(__dirname, "../migrations/402_create_work_items_table.sql")
    const migrationSQL = readFileSync(migrationPath, "utf-8")

    logger.info(`Running migration 402 from ${migrationPath}`)

    await client.query("BEGIN")
    await client.query(migrationSQL)
    await client.query("COMMIT")

    logger.info("Migration 402 executed successfully")
  } catch (err) {
    await client.query("ROLLBACK")
    logger.error("Migration 402 failed", err)
    throw err
  } finally {
    client.release()
  }
}

runMigration()
  .then(() => {
    logger.info("Migration 402 complete")
    process.exit(0)
  })
  .catch((err) => {
    logger.error("Migration 402 errored", err)
    process.exit(1)
  })
