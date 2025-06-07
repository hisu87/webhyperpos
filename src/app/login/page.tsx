
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase'; // Import db
import { GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'; // Import Firestore functions
import type { User as AppUser } from '@/lib/types'; // Import your User type
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome, Loader2, LogIn } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { APP_NAME } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result: UserCredential = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      if (firebaseUser) {
        // 1. Save/Update user in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
          // New user, create document
          const newUser: AppUser = {
            id: firebaseUser.uid,
            firebaseUid: firebaseUser.uid,
            displayName: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            role: 'customer', // Default role for new sign-ups
            active: true,
            createdAt: serverTimestamp() as unknown as Date, // Cast needed for serverTimestamp
            updatedAt: serverTimestamp() as unknown as Date, // Cast needed for serverTimestamp
            // tenantId, branchId, username can be set later through a profile completion step
          };
          await setDoc(userRef, newUser);
          toast({
            title: "Welcome!",
            description: "Your account has been created.",
          });
        } else {
          // Existing user, potentially update fields like photoURL or last login
          // For now, we'll just acknowledge they exist
          await setDoc(userRef, { 
            photoURL: firebaseUser.photoURL || docSnap.data()?.photoURL,
            displayName: firebaseUser.displayName || docSnap.data()?.displayName,
            email: firebaseUser.email || docSnap.data()?.email, // Keep existing email if new one is null
            updatedAt: serverTimestamp() 
          }, { merge: true });
        }

        // 2. Set user information in a cookie (simplified example)
        const cookieData = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        };
        // Set cookie to expire in 1 day
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 1);
        document.cookie = `coffeeos_user_info=${JSON.stringify(cookieData)}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
        
        toast({
          title: "Sign In Successful",
          description: `Welcome back, ${firebaseUser.displayName || 'User'}!`,
        });
        router.push('/dashboard/menu');
      }
    } catch (error: any) {
      console.error('Error during Google sign-in:', error);
      toast({
        title: "Sign In Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="absolute inset-0 z-0 opacity-10">
         <Image 
          src="https://placehold.co/1920x1080.png"
          alt="Abstract background" 
          layout="fill" 
          objectFit="cover"
          data-ai-hint="coffee beans"
        />
      </div>
      <Card className="w-full max-w-md shadow-2xl z-10">
        <CardHeader className="text-center">
           <div className="mx-auto mb-4 inline-block rounded-full bg-primary p-3">
            <LogIn className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">{`Sign in to ${APP_NAME}`}</CardTitle>
          <CardDescription className="text-muted-foreground">
            Access your dashboard by signing in with your Google account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleGoogleSignIn} 
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90" 
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Signing In...' : 'Sign In with Google'}
          </Button>
        </CardContent>
         <CardFooter className="flex flex-col items-center pt-4 text-xs text-muted-foreground">
            <p>By signing in, you agree to our Terms of Service.</p>
          </CardFooter>
      </Card>
       <footer className="mt-8 text-center text-sm text-muted-foreground z-10">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
      </footer>
    </div>
  );
}

    