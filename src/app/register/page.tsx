
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Mail } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const processUserRegistration = async (firebaseUser: FirebaseUser, displayNameInput: string) => {
    // const userRef = doc(db, 'users', firebaseUser.uid); // Temporarily Disabled
    const displayNameForProfile = displayNameInput || firebaseUser.email?.split('@')[0] || 'New User';

    if (displayNameInput && firebaseUser.displayName !== displayNameInput) {
      try {
        await updateProfile(firebaseUser, { displayName: displayNameInput });
      } catch (profileError) {
        console.warn("Could not update Firebase Auth profile display name:", profileError);
      }
    }
    
    // const newUser: AppUser = { // Temporarily Disabled
    //   id: firebaseUser.uid,
    //   firebaseUid: firebaseUser.uid,
    //   displayName: displayNameForProfile,
    //   email: firebaseUser.email || '',
    //   photoURL: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${displayNameForProfile.charAt(0).toUpperCase()}`,
    //   role: 'customer', 
    //   active: true,
    //   createdAt: serverTimestamp() as unknown as Date,
    //   updatedAt: serverTimestamp() as unknown as Date,
    // };
    // await setDoc(userRef, newUser); // Temporarily Disabled

    try {
      localStorage.setItem('loginTimestamp', Date.now().toString());
    } catch (e) {
      console.warn('localStorage not available, 4-hour session expiry may not work as expected.');
    }

    toast({
      title: "Registration Successful!",
      description: `Welcome, ${displayNameForProfile}! Your account has been created. (Firestore save is temporarily disabled)`,
    });
    router.push('/dashboard/menu');
  };

  const handleEmailPasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing Fields", description: "Please enter email and password.", variant: "destructive" });
      return;
    }
     if (!EMAIL_REGEX.test(email)) {
      toast({ title: "Invalid Email Format", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
        toast({ title: "Weak Password", description: "Password should be at least 6 characters.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await processUserRegistration(userCredential.user, displayName);
      }
    } catch (error: any) {
      console.error('Error during email/password registration:', error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "This email address is already in use. Try logging in.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          case 'auth/weak-password':
            errorMessage = "The password is too weak. Please choose a stronger password.";
            break;
          default:
            errorMessage = error.message;
        }
      }
      toast({
        title: "Registration Failed",
        description: errorMessage,
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
          data-ai-hint="coffee beans pattern"
        />
      </div>
      <Card className="w-full max-w-md shadow-2xl z-10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-block rounded-full bg-primary p-3">
            <UserPlus className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">{`Create an Account with ${APP_NAME}`}</CardTitle>
          <CardDescription className="text-muted-foreground">
            Join us by creating a new account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleEmailPasswordRegister} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name (Optional)</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />
            </div>
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
                placeholder="•••••••• (at least 6 characters)"
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
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Creating Account...' : 'Register with Email'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-4 text-sm text-muted-foreground">
          <p>
            Already have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/login">Sign In</Link>
            </Button>
          </p>
          <p className="mt-2 text-xs">By registering, you agree to our Terms of Service.</p>
        </CardFooter>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground z-10">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
      </footer>
    </div>
  );
}
