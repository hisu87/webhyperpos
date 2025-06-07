
import * as admin from 'firebase-admin';

// Ensure this file is not imported in client-side code.
if (typeof window !== 'undefined') {
  throw new Error('Firebase Admin SDK should not be imported in client-side code.');
}

if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set.');
    }
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set.');
    }
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('FIREBASE_CLIENT_EMAIL environment variable is not set.');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // Depending on your error handling strategy, you might want to re-throw the error
    // or ensure the app behaves gracefully if admin features are unavailable.
    // For now, adminAuth and adminDb will be undefined if initialization fails.
  }
}

let adminAuthInstance: admin.auth.Auth | undefined;
let adminDbInstance: admin.firestore.Firestore | undefined;

if (admin.apps.length > 0) {
  adminAuthInstance = admin.auth();
  adminDbInstance = admin.firestore();
} else {
  // Log that instances are not available if init failed and was caught
  console.warn("Firebase Admin SDK not initialized, adminAuth and adminDb will be undefined.");
}


export const adminAuth = adminAuthInstance as admin.auth.Auth; // Cast for usage, will be undefined if init failed
export const adminDb = adminDbInstance as admin.firestore.Firestore; // Cast for usage, will be undefined if init failed
