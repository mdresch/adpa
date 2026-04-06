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

// Connect to emulator in development
if (hasFirebaseConfig && process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";
  console.log(`🔌 Connecting Firebase Auth to emulator at ${authEmulatorHost}`);
  connectAuthEmulator(auth, `http://${authEmulatorHost}`);
}
