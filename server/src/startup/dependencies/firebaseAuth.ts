import { Dependency } from "../dependencyGraph"
import { logger } from "../../utils/logger"
import * as admin from "firebase-admin"

function hasFirebaseAdminCredentials(): boolean {
  return !!(
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL)
  )
}

/**
 * Firebase Auth dependency for the startup graph.
 * Verifies Admin SDK setup; production also pings Identity Toolkit via listUsers.
 */
export const firebaseAuthDependency: Dependency = {
  name: "Firebase Auth Provider",
  critical: process.env.NODE_ENV !== "development",
  timeout: 10000,
  dependsOn: [],
  init: async () => {
    const isDev = process.env.NODE_ENV === "development"

    if (!admin.apps.length) {
      throw new Error(
        "Firebase Admin SDK not initialized. Set FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_BASE64, or FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL in server/.env."
      )
    }

    if (!hasFirebaseAdminCredentials()) {
      const msg =
        "Firebase Admin has no service account in server/.env — Firebase ID token login will fail. " +
        "Use POST /api/v1/auth/demo (JWT) or add FIREBASE_* credentials for Firebase sign-in."
      if (isDev) {
        logger.warn(`⏭️ ${msg}`)
        return
      }
      throw new Error(msg)
    }

    if (isDev) {
      logger.info(
        "✅ Firebase Admin credentials present (skipping Identity Toolkit listUsers check in development)"
      )
      return
    }

    logger.info("🔐 Validating Firebase Auth connectivity (production)...")
    try {
      await admin.auth().listUsers(1)
      logger.info("✅ Firebase Auth connectivity verified.")
    } catch (error: any) {
      logger.error("❌ Firebase Auth connectivity check failed:", error.message)
      throw new Error(`Firebase Auth unreachable: ${error.message}`)
    }
  },
  validate: async () => {
    if (!admin.apps.length) return false
    if (process.env.NODE_ENV === "development" && !hasFirebaseAdminCredentials()) {
      return true
    }
    return true
  },
}
