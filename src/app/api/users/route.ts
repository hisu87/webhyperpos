
import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { User as AppUser } from '@/lib/types';
import { z } from 'zod';
import * as admin from 'firebase-admin'; // Import for FieldValue

// Define the expected request body schema
const createUserSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  displayName: z.string().optional(),
  role: z.string().optional().default('staff'), // Default role if not provided
  pinCode: z.string().min(4, { message: "PIN code must be at least 4 digits" }).optional(), // Example: plain PIN
  tenantId: z.string().optional(),
  branchId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Check if Firebase Admin SDK was initialized
  if (!adminAuth || !adminDb) {
    console.error("Firebase Admin SDK not initialized. API cannot function.");
    return NextResponse.json({ error: "Server configuration error, please try again later." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, password, displayName, role, pinCode, tenantId, branchId } = validation.data;

    // Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
      emailVerified: false, // You might want to set this based on your flow
      disabled: false,      // New users are enabled by default
    });

    // Prepare user data for Firestore
    // IMPORTANT: In a real application, if pinCode is sensitive,
    // you should HASH it securely (e.g., using bcrypt) before storing it.
    // For this example, we are storing the provided pinCode directly as hashedPinCode.
    const firestoreUserData: AppUser = {
      id: userRecord.uid, // Use Firebase Auth UID as the document ID and primary ID
      firebaseUid: userRecord.uid,
      email: userRecord.email || '',
      displayName: userRecord.displayName || email.split('@')[0],
      photoURL: userRecord.photoURL || `https://placehold.co/100x100.png?text=${(userRecord.displayName || email.split('@')[0] || 'U').charAt(0).toUpperCase()}`,
      role: role,
      active: true, // New users are active by default
      hashedPinCode: pinCode, // Storing plain PIN as example. HASH IN PRODUCTION!
      tenantId: tenantId,
      branchId: branchId,
      // Firebase Admin SDK uses FieldValue for server timestamps
      createdAt: admin.firestore.FieldValue.serverTimestamp() as unknown as Date,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as unknown as Date,
    };

    // Save additional user details to Firestore, using UID as document ID
    await adminDb.collection('users').doc(userRecord.uid).set(firestoreUserData);

    return NextResponse.json({ message: 'User created successfully', userId: userRecord.uid }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    let errorMessage = 'Failed to create user.';
    let statusCode = 500;

    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-exists':
          errorMessage = 'This email address is already in use.';
          statusCode = 409; // Conflict
          break;
        case 'auth/invalid-password':
          errorMessage = 'Password must be at least 6 characters long.';
          statusCode = 400;
          break;
        // Add other specific Firebase error codes if needed
        default:
          errorMessage = error.message || 'An unexpected error occurred.';
      }
    }
    
    return NextResponse.json({ error: errorMessage, details: error.code || 'UNKNOWN_ERROR' }, { status: statusCode });
  }
}
