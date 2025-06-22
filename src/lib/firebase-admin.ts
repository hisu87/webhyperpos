
import * as admin from 'firebase-admin';

// Ensure this file is not imported in client-side code.
if (typeof window !== 'undefined') {
  throw new Error('Firebase Admin SDK should not be imported in client-side code.');
}

// Check if the SDK has already been initialized
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  // Only attempt to initialize if all required environment variables are present
  if (privateKey && projectId && clientEmail) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization error:', error.message);
    }
  } else {
    // Log a warning if environment variables are missing, but don't crash the server
    console.warn('Firebase Admin SDK environment variables are missing. Admin features will be unavailable.');
  }
}

let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;

// Assign instances only if initialization was successful
if (admin.apps.length > 0) {
  adminAuth = admin.auth();
  adminDb = admin.firestore();
}

export { adminAuth, adminDb };
