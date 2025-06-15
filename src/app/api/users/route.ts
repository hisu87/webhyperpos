
import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { User as AppUser } from '@/lib/types';
import { z } from 'zod';
import * as admin from 'firebase-admin'; // Import for FieldValue

// Define the expected request body schema according to the new User structure
const createUserSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  username: z.string().optional(), // Was displayName
  role: z.string().optional().default('staff'),
  hashedPinCode: z.string().min(4, { message: "PIN code must be at least 4 digits" }).optional(), // Assuming plain PIN is passed and hashed server-side if needed, or stored as is if hashing is done client-side (not recommended for PINs)
  active: z.boolean().optional().default(true),
  tenantId: z.string().optional(), // Will be stored as tenant: { id: tenantId }
  branchId: z.string().optional(), // Will be stored as branch: { id: branchId, name: branchName }
  branchName: z.string().optional(), // Required if branchId is provided, for denormalization
}).refine(data => {
    // If branchId is provided, branchName must also be provided
    if (data.branchId && !data.branchName) {
        return false;
    }
    return true;
}, {
    message: "branchName is required if branchId is provided",
    path: ["branchName"],
});


export async function POST(request: NextRequest) {
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

    const { email, password, username, role, hashedPinCode, active, tenantId, branchId, branchName } = validation.data;

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: username || email.split('@')[0], // Firebase Auth still uses displayName
      emailVerified: false,
      disabled: false,
    });

    const firestoreUserData: Partial<AppUser> = { // Use Partial as ID is set by doc ref
      firebaseUid: userRecord.uid,
      email: userRecord.email || '',
      username: username || email.split('@')[0],
      role: role,
      active: active,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as any, // Cast to any
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as any, // Cast to any
    };

    if (hashedPinCode) {
      // IMPORTANT: In a real application, if pinCode is sensitive and not already hashed,
      // you should HASH it securely (e.g., using bcrypt) before storing it.
      // Assuming hashedPinCode is already hashed or being stored as provided.
      firestoreUserData.hashedPinCode = hashedPinCode;
    }

    if (tenantId) {
      firestoreUserData.tenant = { id: tenantId };
    }

    if (branchId && branchName) {
      firestoreUserData.branch = { id: branchId, name: branchName };
    }
    
    // Use Firebase Auth UID as the document ID in Firestore
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
          statusCode = 409;
          break;
        case 'auth/invalid-password':
          errorMessage = 'Password must be at least 6 characters long.';
          statusCode = 400;
          break;
        default:
          errorMessage = error.message || 'An unexpected error occurred.';
      }
    }
    
    return NextResponse.json({ error: errorMessage, details: error.code || 'UNKNOWN_ERROR' }, { status: statusCode });
  }
}
