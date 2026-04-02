import { Dependency } from "../dependencyGraph"
import { logger } from "../../utils/logger"
import * as admin from 'firebase-admin'

/**
 * Firebase Auth dependency for the startup graph.
 * Ensures the Firebase Admin SDK is correctly initialized and reachable.
 */
export const firebaseAuthDependency: Dependency = {
  name: "Firebase Auth Provider",
  critical: process.env.NODE_ENV !== "development",
  timeout: 10000,
  init: async () => {
    logger.info("🔐 Validating Firebase Auth connectivity...")
    
    if (!admin.apps.length) {
      throw new Error("Firebase Admin SDK not initialized. Check FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID.")
    }

    try {
      // Perform a simple check to verify connectivity to Firebase servers
      // We'll just list the first user or check project settings if possible
      // listing 0 users is a safe way to check if the SDK is authorized
      await admin.auth().listUsers(1);
      logger.info("✅ Firebase Auth connectivity verified.")
    } catch (error: any) {
      logger.error("❌ Firebase Auth connectivity check failed:", error.message)
      throw new Error(`Firebase Auth unreachable: ${error.message}`)
    }
  },
  validate: async () => {
    return admin.apps.length > 0
  },
}
