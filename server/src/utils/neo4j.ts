/**
 * Neo4j graph database connection and health utilities.
 * Connection is optional: if NEO4J_URI is not set, all functions treat Neo4j as unavailable.
 */

import neo4j, { type Driver } from "neo4j-driver"
import { logger } from "./logger"
import CircuitBreaker from "./circuitBreaker"

const NEO4J_URI = process.env.NEO4J_URI || process.env.NEO4J_URL || ""
const NEO4J_USER = process.env.NEO4J_CLIENT_NAME || process.env.CLIENT_NAME || process.env.NEO4J_CLIENT_ID || process.env.CLIENT_ID || process.env.NEO4J_USERNAME || process.env.NEO4J_USER || "neo4j"
const NEO4J_PASSWORD = process.env.NEO4J_CLIENT_SECRET || process.env.CLIENT_SECRET || process.env.NEO4J_PASSWORD || ""

let driver: Driver | null = null
const neo4jBreaker = new CircuitBreaker(3, 30000)

export function isNeo4jConfigured(): boolean {
  if (!NEO4J_URI) return false
  
  // Prevent local fallback in production
  if (process.env.NODE_ENV === "production" && NEO4J_URI.includes("localhost")) {
    return false
  }
  
  return true
}

export function getNeo4jDriver(): Driver | null {
  if (!isNeo4jConfigured()) return null
  if (neo4jBreaker.isOpen()) {
    logger.warn("[Neo4j] Circuit open - driver not returned")
    return null
  }
  return driver
}

export function getNeo4jCircuitState(): string {
  if (!isNeo4jConfigured()) return "disabled"
  try {
    return neo4jBreaker.getState()
  } catch {
    return "unknown"
  }
}

/** Default database name for sessions (e.g. "neo4j"). Use when calling driver.session({ database }). */
export function getNeo4jDatabase(): string {
  return process.env.NEO4J_DATABASE || "neo4j"
}

/**
 * Connect to Neo4j when NEO4J_URI is set.
 * Does nothing when not configured.
 * Throws on connection failure when configured.
 */
export async function connectNeo4j(): Promise<void> {
  if (!NEO4J_URI) {
    logger.info("[Neo4j] NEO4J_URI not set - Neo4j disabled")
    return
  }

  if (neo4jBreaker.isOpen()) {
    logger.warn("[Neo4j] Circuit open - skipping connect")
    return
  }

  logger.warn("[Neo4j] Attempting connection", {
    uri: NEO4J_URI.replace(/:[^:@]+@/, ":***@"),
    userKey: process.env.NEO4J_CLIENT_NAME ? 'NEO4J_CLIENT_NAME' : (process.env.NEO4J_CLIENT_ID ? 'NEO4J_CLIENT_ID' : (process.env.NEO4J_USERNAME ? 'NEO4J_USERNAME' : 'default')),
    userLength: NEO4J_USER.length,
    passLength: NEO4J_PASSWORD.length
  })

  // Aura instances may need longer to become ready after creation
  const timeoutMs = Number(process.env.NEO4J_CONNECT_TIMEOUT_MS) || 15000
  try {
    const auth = NEO4J_PASSWORD
      ? neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
      : (neo4j.auth as any).none()

    driver = neo4j.driver(NEO4J_URI, auth, {
      maxConnectionLifetime: 3 * 60 * 60 * 1000,
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: timeoutMs,
    })

    await Promise.race([
      driver.verifyConnectivity(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Neo4j connectivity timeout")), timeoutMs)
      ),
    ])

    neo4jBreaker.recordSuccess()
    logger.info("[Neo4j] Connected successfully", {
      uri: NEO4J_URI.replace(/:[^:@]+@/, ":***@"),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error("[Neo4j] Connection failed", { uri: NEO4J_URI.replace(/:[^:@]+@/, ":***@"), error: msg })
    neo4jBreaker.recordFailure()
    if (driver) {
      await driver.close().catch(() => { })
      driver = null
    }
    throw err
  }
}

/**
 * Close the Neo4j driver. No-op when not configured or not connected.
 */
export async function disconnectNeo4j(): Promise<void> {
  if (!driver) return
  try {
    await driver.close()
    logger.info("[Neo4j] Disconnected")
  } catch (err) {
    logger.error("[Neo4j] Disconnect error", { error: err })
  } finally {
    driver = null
  }
}
