import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  connectAuthEmulator, 
  initializeAuth, 
  browserLocalPersistence, 
  browserPopupRedirectResolver, 
  browserSessionPersistence,
  indexedDBLocalPersistence
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
let app;
let auth;

const hasFirebaseConfig = !!firebaseConfig.apiKey;

if (hasFirebaseConfig) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  // Use initializeAuth for better control over persistence and resolvers
  // This often resolves the 'RecaptchaConfig' error by ensuring clean initialization
  if (typeof window !== "undefined") {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } else {
    auth = getAuth(app);
  }

  // Connect to emulator in development
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";
    console.log(`🔌 Connecting Firebase Auth to emulator at ${authEmulatorHost}`);
    connectAuthEmulator(auth, `http://${authEmulatorHost}`);
  }
} else {
  console.warn("⚠️ Firebase API Key missing. Skipping initialization (expected during build).");
  app = {} as any;
  auth = {} as any;
}

export { app, auth };
