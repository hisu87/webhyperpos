
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, UserCredential as FirebaseUserCredential, signInWithEmailAndPassword, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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
  const [isLoading, setIsLoading] = useState(true); // Start true to handle initial auth check
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    console.log("LoginPage useEffect running to check redirect result.");
    const checkRedirectResult = async () => {
      setIsLoading(true); // Indicate that we are processing auth state
      try {
        console.log("Calling getRedirectResult(auth)...");
        const result = await getRedirectResult(auth);
        console.log("getRedirectResult response:", result);

        if (result && result.user) {
          console.log("Google redirect result HAS a user. Processing sign-in...");
          // Toast for Google Sign-In success is now handled within processUserSignIn
          await processUserSignIn(result.user);
        } else {
          console.log("No active Google redirect result found or result.user is null.");
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Error during Google redirect result processing:', error);
        let errorMessage = "An unexpected error occurred during Google sign-in. Please try again.";
        if (error.code === 'auth/account-exists-with-different-credential') {
          errorMessage = "An account already exists with this email using a different sign-in method. Try signing in with that method.";
        } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
           errorMessage = "Sign-in process was cancelled or popup closed. Please try again if you wish to sign in.";
        } else {
          errorMessage = error.message || errorMessage;
        }
        toast({
          title: "Google Sign-In Failed",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    checkRedirectResult();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs once on mount

  const processUserSignIn = async (firebaseUser: FirebaseUser) => {
    console.log("ProcessUserSignIn called. Firebase User Object (All Info):", firebaseUser);
    
    // Firestore save logic is explicitly disabled as per user request
    /*
    const userRef = doc(db, 'users', firebaseUser.uid);
    const docSnap = await getDoc(userRef);

    const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
    const photoURL = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(displayName).charAt(0).toUpperCase()}`;

    let isNewUser = false; 

    if (!docSnap.exists()) {
      isNewUser = true;
      const newUser: AppUser = {
        id: firebaseUser.uid,
        firebaseUid: firebaseUser.uid,
        displayName: displayName,
        email: firebaseUser.email || '',
        photoURL: photoURL,
        role: 'customer', 
        active: true,
        createdAt: serverTimestamp() as unknown as Date,
        updatedAt: serverTimestamp() as unknown as Date,
      };
      // await setDoc(userRef, newUser); // Ensure this is commented out
    } else {
      // await setDoc(userRef, { // Ensure this is commented out
      //   displayName: displayName || docSnap.data()?.displayName,
      //   email: firebaseUser.email || docSnap.data()?.email, 
      //   photoURL: photoURL || docSnap.data()?.photoURL,
      //   updatedAt: serverTimestamp(),
      // }, { merge: true });
    }
    */

    try {
      localStorage.setItem('loginTimestamp', Date.now().toString());
      console.log("Login timestamp saved to localStorage for session management.");
    } catch (e) {
      console.warn('localStorage not available, 4-hour session expiry may not work as expected.');
    }
    
    const displayNameForToast = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
    toast({
      title: "Sign In Successful",
      description: `Welcome back, ${displayNameForToast}! (User data not saved to Firestore)`,
    });
    console.log("Pushing to /dashboard/menu...");
    router.push('/dashboard/menu');
    setIsLoading(false); 
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      console.log("Initiating Google sign-in with redirect...");
      await signInWithRedirect(auth, provider);
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
        await processUserSignIn(result.user);
      }
    } catch (error: any) {
      console.error('Error during email/password sign-in:', error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Invalid email or password. Please try again.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          default:
            errorMessage = error.message || "An unexpected error occurred.";
        }
      }
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false); // Ensure loading is false on error
    }
    // No finally setIsLoading(false) here, as processUserSignIn handles it or redirects
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
                disabled={isLoading}
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
                disabled={isLoading}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && !auth.currentUser ? ( // Show spinner only if actively trying to log in
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {isLoading && !auth.currentUser ? 'Signing In...' : 'Sign In with Email'}
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
            disabled={isLoading && !auth.currentUser} // Disable if any loading operation is in progress
          >
            {isLoading && !auth.currentUser ? (
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
