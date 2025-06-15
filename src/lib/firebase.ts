// src/lib/firebase.ts

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from "firebase/analytics";


// Khai báo các biến nhưng chưa gán giá trị
let firebaseAppInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let firestoreInstance: Firestore | undefined;
let analyticsInstance: Analytics | undefined;


/**
 * Khởi tạo hoặc lấy instance Firebase App hiện có.
 * Hàm này phải được gọi sau khi các biến môi trường được tải.
 */
export function initializeFirebaseClient() {
  if (getApps().length === 0) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error("LỖI: Firebase config thiếu API Key hoặc Project ID. Kiểm tra biến môi trường.");
      // throw new Error("Firebase config incomplete. API Key or Project ID is missing.");
      // For scripts, we might let it proceed and fail at initializeApp to see Firebase's specific error
    }

    try {
      firebaseAppInstance = initializeApp(firebaseConfig);
      console.log("Firebase app đã được khởi tạo.");

      if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
        try {
            analyticsInstance = getAnalytics(firebaseAppInstance);
            console.log("Firebase Analytics đã được khởi tạo.");
        } catch (e) {
            console.warn("Không thể khởi tạo Firebase Analytics:", e);
        }
      }

    } catch (error) {
        console.error("LỖI KHỞI TẠO FIREBASE APP:", error);
        // Throw or handle as appropriate for your application
        // For the seed script, this error would likely be the auth/invalid-api-key if env vars are still an issue
        throw error; 
    }

  } else {
    firebaseAppInstance = getApp();
    console.log("Sử dụng instance Firebase app đã tồn tại.");
    if (typeof window !== 'undefined' && firebaseAppInstance && process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
         try {
            analyticsInstance = getAnalytics(firebaseAppInstance);
         } catch(e) { /* already initialized or not available */ }
    }
  }

  // Ensure instances are only assigned if firebaseAppInstance is valid
  if (firebaseAppInstance) {
    authInstance = getAuth(firebaseAppInstance);
    // Explicitly using "hyper" as the database ID.
    firestoreInstance = getFirestore(firebaseAppInstance, "hyper");
  } else {
    console.error("LỖI: firebaseAppInstance không hợp lệ, không thể lấy Auth và Firestore instances.");
  }
}

// Xuất các instance. Chúng sẽ chỉ được định nghĩa sau khi initializeFirebaseClient() được gọi.
// Using getters to ensure they are accessed after potential initialization
export const app = (): FirebaseApp | undefined => firebaseAppInstance;
export const auth = (): Auth | undefined => authInstance;
export const db = (): Firestore | undefined => firestoreInstance;
export const analytics = (): Analytics | undefined => analyticsInstance;

// For components that need to ensure initialization before use (especially outside Next.js lifecycle like seed scripts)
// You might not directly use these getters in Next.js components if AppLayout or a similar root component calls initializeFirebaseClient once.
// However, the seed script WILL need to call initializeFirebaseClient.
// For Next.js app, you'd typically call initializeFirebaseClient() once in your _app.tsx or a root layout.
// Since this project structure uses RootLayout, it might be a good place for client-side init,
// but for scripts, it's manual.
