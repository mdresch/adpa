import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Firebase configuration
// These values should be provided via environment variables in production (App Hosting)
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
  auth = getAuth(app);

  // Connect to emulator in development
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    // Port 9099 is defined in firebase.json
    const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";
    console.log(`🔌 Connecting Firebase Auth to emulator at ${authEmulatorHost}`);
    connectAuthEmulator(auth, `http://${authEmulatorHost}`);
  }
} else {
  // During build-time on Vercel, we might not have the API keys. 
  // We provide a fallback to prevent the build from crashing.
  // This won't affect the client-side as long as keys are provided in the environment.
  console.warn("⚠️ Firebase API Key missing. Skipping initialization (expected during build).");
  app = {} as any;
  auth = {} as any;
}

export { app, auth };
