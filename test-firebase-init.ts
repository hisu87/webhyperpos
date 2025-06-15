
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { initializeApp, getApps } from 'firebase/app';

// Explicitly load .env file from the project root
const envPath = path.resolve(process.cwd(), '.env');
const dotenvResult = dotenvConfig({ path: envPath });

if (dotenvResult.error) {
  console.error("Error loading .env file:", dotenvResult.error);
  process.exit(1);
}

console.log("Attempting to load environment variables from:", envPath);

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

console.log("NEXT_PUBLIC_FIREBASE_API_KEY:", apiKey ? 'Loaded (value hidden)' : 'NOT LOADED');
console.log("NEXT_PUBLIC_FIREBASE_PROJECT_ID:", projectId);

if (!apiKey || !projectId) {
  console.error("Critical Firebase environment variables (API Key or Project ID) are missing. Check your .env file.");
  process.exit(1);
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId,
};

try {
  if (!getApps().length) {
    console.log("Initializing Firebase app with config:", {
        apiKey: firebaseConfig.apiKey ? 'Exists' : 'MISSING',
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId
    });
    initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully!");
  } else {
    console.log("Firebase app already initialized.");
  }
  // You could add a simple Firestore operation here if needed, like trying to get a document
  // but for now, just initializing the app is enough to test the API key.
} catch (error) {
  console.error("Error initializing Firebase app:", error);
}
