
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { initializeFirebaseClient, auth as getAuthInstance, db as getDbInstance } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, UserCredential as FirebaseUserCredential, signInWithEmailAndPassword, User as FirebaseUser, Auth } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chrome, Loader2, LogIn, Mail, UserPlus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { APP_NAME } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true); // Start true to cover initial auth check
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  useEffect(() => {
    // This effect should run only once on mount to initialize Firebase
    try {
      initializeFirebaseClient();
      setFirebaseInitialized(true);
      console.log("LoginPage: Firebase Client Initialized.");
    } catch (error) {
      console.error("LoginPage: Error initializing Firebase Client:", error);
      toast({
        title: "Initialization Error",
        description: "Failed to initialize core services. Please refresh.",
        variant: "destructive",
      });
      setIsLoading(false); // Stop loading if Firebase init fails
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs once on mount

  const processUserSignIn = async (firebaseUser: FirebaseUser) => {
    console.log("ProcessUserSignIn called. Firebase User ID:", firebaseUser.uid);
    // Firestore save logic is explicitly disabled
    // const db = getDbInstance();
    // if (db) {
    //   const userRef = doc(db, 'users', firebaseUser.uid);
    //   const userSnap = await getDoc(userRef);

    //   if (!userSnap.exists()) {
    //     const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
    //     const photoURL = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${displayName.charAt(0).toUpperCase()}`;
        
    //     const newUserDocument: Partial<AppUser> = { // Using Partial as ID is implicitly userRef.id
    //       firebaseUid: firebaseUser.uid,
    //       email: firebaseUser.email || '',
    //       username: displayName, // Was displayName
    //       role: 'customer', // Default role for new sign-ups via Google if not in DB
    //       active: true,
    //       createdAt: serverTimestamp(),
    //       updatedAt: serverTimestamp(),
    //       // tenant and branch would typically be set through a different flow for non-admins
    //     };
    //     try {
    //       await setDoc(userRef, newUserDocument, { merge: true });
    //       console.log("New user document created/merged in Firestore for UID:", firebaseUser.uid);
    //     } catch (dbError) {
    //       console.error("Error saving new user to Firestore:", dbError);
    //       toast({
    //         title: "Database Error",
    //         description: "Could not save user profile. Some features might be limited.",
    //         variant: "destructive",
    //       });
    //     }
    //   } else {
    //     console.log("User document already exists in Firestore for UID:", firebaseUser.uid);
    //     // Optionally update updatedAt or other fields here
    //     // await setDoc(userRef, { updatedAt: serverTimestamp() }, { merge: true });
    //   }
    // } else {
    //   console.warn("LoginPage: Firestore instance not available, skipping user document check/creation.");
    // }

    try {
      localStorage.setItem('loginTimestamp', Date.now().toString());
      console.log("Login timestamp saved to localStorage for session management.");
    } catch (e) {
      console.warn('localStorage not available, 4-hour session expiry may not work as expected.');
    }
    
    const displayNameForToast = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
    
    // Temporarily comment out toast to isolate redirection issue
    // toast({
    //   title: "Sign In Successful",
    //   description: `Welcome back, ${displayNameForToast}! (User data not saved to Firestore)`,
    // });
    // console.log("Toast temporarily disabled for debugging redirection.");

    console.log("Attempting to redirect to / (Tenant/Branch selection page)...");
    setIsLoading(false);
    router.push('/');
    console.log("router.push('/') called.");
  };
  
  useEffect(() => {
    if (!firebaseInitialized) {
      console.log("LoginPage useEffect (auth check): Firebase not initialized yet.");
      // setIsLoading still true by default or from previous effect
      return;
    }
    console.log("LoginPage useEffect running to check auth state and redirect result.");
    
    const auth = getAuthInstance();
    if (!auth) {
        console.error("LoginPage: Auth instance not available after initialization for redirect check.");
        setIsLoading(false);
        return;
    }

    const checkAuthAndRedirect = async () => {
      // setIsLoading(true) is already set or handled by the init useEffect
      console.log("LoginPage useEffect: setIsLoading state is currently:", isLoading); // Check current state
      try {
        // Check for current user first (handles page refresh if already logged in)
        if (auth.currentUser) {
          console.log("LoginPage useEffect: Firebase auth.currentUser already exists. Processing user:", auth.currentUser.uid);
          await processUserSignIn(auth.currentUser);
          return; // User processed, redirect will happen in processUserSignIn
        }

        console.log("LoginPage useEffect: auth.currentUser is null. Calling getRedirectResult(auth)...");
        const result = await getRedirectResult(auth);
        console.log("LoginPage useEffect: getRedirectResult response:", result);

        if (result && result.user) {
          console.log("LoginPage useEffect: Google redirect result HAS a user. Processing sign-in for user:", result.user.uid);
          await processUserSignIn(result.user);
        } else {
          console.log("LoginPage useEffect: No active Google redirect result found or auth.currentUser is null after checking. User is not signed in or redirect not completed.");
          setIsLoading(false); 
          console.log("LoginPage useEffect: setIsLoading(false) because no user from redirect/current.");
        }
      } catch (error: any) {
        console.error('LoginPage useEffect: Error during auth state/redirect processing:', error);
        let errorMessage = "An unexpected error occurred during Google sign-in. Please try again.";
        // More specific error handling based on error.code
        if (error.code === 'auth/account-exists-with-different-credential') {
          errorMessage = "An account already exists with this email using a different sign-in method. Try signing in with that method.";
        } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
           errorMessage = "Sign-in process was cancelled or popup closed. Please try again if you wish to sign in.";
        } else {
          // Keep generic or use error.message if available and user-friendly
          errorMessage = error.message || errorMessage;
        }
        toast({
          title: "Google Sign-In Failed",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        console.log("LoginPage useEffect: setIsLoading(false) due to error in checkAuthAndRedirect.");
      }
    };

    checkAuthAndRedirect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseInitialized]); // Runs when firebaseInitialized changes to true


  const handleGoogleSignIn = async () => {
    if (!firebaseInitialized) {
      toast({ title: "Initialization Pending", description: "Please wait a moment for services to load.", variant: "default" });
      return;
    }
    const auth = getAuthInstance();
    if (!auth) {
        console.error("LoginPage: Auth instance not available for Google Sign In.");
        toast({ title: "Error", description: "Authentication service not ready.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      console.log("Initiating Google sign-in with redirect...");
      await signInWithRedirect(auth, provider);
      // After this call, the page will redirect. Code here might not execute if redirect is immediate.
      // The result is handled by getRedirectResult in the useEffect hook.
      console.log("signInWithRedirect called. Waiting for redirect...");
    } catch (error: any) {
      console.error('Error initiating Google sign-in redirect:', error);
      let toastMessage = "Could not start the Google sign-in process. Please try again.";
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        toastMessage = "Google Sign-In was cancelled or the window was closed. Please try again if you wish to sign in.";
      } else if (error.message) {
        toastMessage = error.message;
      }
      toast({
        title: "Google Sign-In Error",
        description: toastMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseInitialized) {
      toast({ title: "Initialization Pending", description: "Services are loading. Please try again shortly.", variant: "default" });
      return;
    }

    const auth = getAuthInstance();
    if (!auth) {
        console.error("LoginPage: Auth instance not available for Email/Password Sign In.");
        toast({ title: "Error", description: "Authentication service not ready. Please refresh.", variant: "destructive" });
        setIsLoading(false); // Reset loading state
        return;
    }

    if (!email || !password) {
      toast({ title: "Missing Fields", description: "Please enter both email and password.", variant: "destructive" });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      toast({ title: "Invalid Email Format", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result: FirebaseUserCredential = await signInWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await processUserSignIn(result.user); // This will handle setIsLoading(false) and navigate
      } else {
        // This case should ideally not happen if signInWithEmailAndPassword resolves successfully
        console.warn("signInWithEmailAndPassword resolved but result.user is null.");
        setIsLoading(false); // Ensure loading is stopped
      }
    } catch (error: any) {
      console.error('Error during email/password sign-in:', error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential': // Common for wrong email/password
            errorMessage = "Invalid email or password. Please try again.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          // Add other specific Firebase error codes as needed
          default:
            errorMessage = error.message || "An unexpected error occurred."; // Use Firebase message if available
        }
      }
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      });
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
            Access your dashboard with your credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || !firebaseInitialized}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || !firebaseInitialized}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !firebaseInitialized}
            >
              {(isLoading && firebaseInitialized) ? ( // Show loader only if initialized and loading
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {(isLoading && firebaseInitialized) ? 'Signing In...' : 'Sign In with Email'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full"
            disabled={isLoading || !firebaseInitialized} // Disable if not initialized or already loading
          >
            {(isLoading && firebaseInitialized) ? ( // Show loader only if initialized and loading
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            Sign In with Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-4 text-sm text-muted-foreground">
           <p>
            Don't have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/register">
                <UserPlus className="mr-1 h-4 w-4" /> Sign Up
              </Link>
            </Button>
          </p>
          <p className="text-xs">By signing in, you agree to our Terms of Service.</p>
        </CardFooter>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground z-10">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
      </footer>
    </div>
  );
}
    
    