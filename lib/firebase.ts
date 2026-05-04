import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  connectAuthEmulator, 
  initializeAuth, 
  browserLocalPersistence, 
  browserPopupRedirectResolver, 
  browserSessionPersistence,
  indexedDBLocalPersistence,
  Auth
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase with safety for build-time (Vercel/Static Prerendering)
const hasFirebaseConfig = !!firebaseConfig.apiKey;

export const app: FirebaseApp = (hasFirebaseConfig 
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : {} as any) as FirebaseApp;

export const auth: Auth = (() => {
  if (!hasFirebaseConfig) return {} as any;
  
  if (typeof window !== "undefined") {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  }
  return getAuth(app);
})() as Auth;

// Auth emulator: opt-in only. Unconditional dev wiring caused connection refused
// when NEXT_PUBLIC_FIREBASE_* pointed at a real project but nothing listened on :9099.
const useAuthEmulator =
  process.env.NEXT_PUBLIC_FIREBASE_USE_AUTH_EMULATOR === "true" ||
  process.env.NEXT_PUBLIC_FIREBASE_USE_AUTH_EMULATOR === "1";

if (
  hasFirebaseConfig &&
  useAuthEmulator &&
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined"
) {
  const authEmulatorHost =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";
  const hasConnectedEmulator = Boolean((auth as Auth & { emulatorConfig?: unknown }).emulatorConfig);

  if (!hasConnectedEmulator) {
    console.log(`Connecting Firebase Auth to emulator at ${authEmulatorHost}`);
    connectAuthEmulator(auth, `http://${authEmulatorHost}`, { disableWarnings: true });
  }
}
