import dotenv from "dotenv"
dotenv.config()

import { Pool } from "pg"
import { logger } from "../utils/logger"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set")
}

// For Neon database, use explicit configuration to avoid URL parsing issues
const pool = new Pool({
  host: "ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech",
  port: 5432,
  database: "adpa_db",
  user: "neondb_owner",
  password: "npg_6H1YnZiDleEV",
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export async function connectDatabase() {
  try {
    const client = await pool.connect()
    await client.query("SELECT NOW()")
    client.release()
    logger.info("Database connection established")
  } catch (error) {
    logger.error("Database connection failed:", error)
    throw error
  }
}

export { pool }
