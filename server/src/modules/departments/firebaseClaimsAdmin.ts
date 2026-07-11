/**
 * Real Firebase Admin implementation of ClaimsSyncFirebaseAdmin (ADR-005
 * Phase 0), following the same admin.auth() singleton-access pattern as
 * server/src/middleware/auth.ts's verifyIdToken call. admin.initializeApp()
 * happens once at process startup (server.ts / worker.ts) — this module only
 * ever calls admin.auth(), never re-initializes.
 */
import * as admin from 'firebase-admin';
import { ClaimsSyncFirebaseAdmin } from './departmentClaimsSyncJob';

export const firebaseClaimsAdmin: ClaimsSyncFirebaseAdmin = {
  setCustomUserClaims: (uid, claims) => admin.auth().setCustomUserClaims(uid, claims),
  revokeRefreshTokens: (uid) => admin.auth().revokeRefreshTokens(uid)
};
