
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { initializeFirebaseClient, auth as getAuthInstance } from '@/lib/firebase'; // Updated import
import type { User as FirebaseUser, Auth } from 'firebase/auth'; // Added Auth type
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, LogOut, UserCircle, Settings, HelpCircle, Loader2 } from 'lucide-react';
import { Logo } from '@/components/icons/Logo';
import { NAV_LINKS } from '@/lib/constants';
import { NavLink } from './NavLink';
import { Separator } from '@/components/ui/separator';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [isLoadingFirebase, setIsLoadingFirebase] = useState(true); // For initial Firebase init
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);

  useEffect(() => {
    // This new useEffect will fetch the names from local storage
    if (typeof window !== 'undefined') {
      setTenantName(localStorage.getItem('selectedTenantName'));
      setBranchName(localStorage.getItem('selectedBranchName'));
    }
  }, [pathname]); // Re-run when path changes, e.g., navigating back to selection screen

  useEffect(() => {
    // Initialize Firebase client-side
    try {
      initializeFirebaseClient();
      setFirebaseInitialized(true);
      console.log("AppLayout: Firebase Client Initialized.");
    } catch (error) {
      console.error("AppLayout: Error initializing Firebase Client:", error);
      // Handle initialization error appropriately, maybe show an error message
    } finally {
        setIsLoadingFirebase(false);
    }
  }, []);

  useEffect(() => {
    if (!firebaseInitialized) {
      console.log("AppLayout: Firebase not initialized yet, auth listener waiting.");
      // setIsLoadingUser can remain true until firebase is initialized and auth state is checked
      return;
    }

    const auth = getAuthInstance();
    if (!auth) {
        console.error("AppLayout: Auth instance not available after Firebase initialization.");
        setIsLoadingUser(false); // Stop loading user if auth service fails
        if (pathname !== '/login' && pathname !== '/register') {
          router.push('/login?reason=authServiceFailed');
        }
        return;
    }

    console.log("AppLayout: Setting up Firebase Auth listener...");
    setIsLoadingUser(true); // Start loading user state
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        const loginTimestampStr = localStorage.getItem('loginTimestamp');
        if (loginTimestampStr) {
          const loginTimestamp = parseInt(loginTimestampStr, 10);
          if (Date.now() - loginTimestamp > FOUR_HOURS_MS) {
            auth.signOut().then(() => {
              localStorage.removeItem('loginTimestamp');
              router.push('/login?reason=sessionExpired');
            });
            return; 
          }
        } else {
           if (pathname !== '/login' && pathname !== '/register') {
             auth.signOut().then(() => {
               router.push('/login?reason=missingTimestamp');
             });
             return;
           }
        }
      } else {
        setCurrentUser(null);
        if (pathname !== '/login' && pathname !== '/register') {
          router.push('/login');
        }
      }
      setIsLoadingUser(false);
    });

    return () => unsubscribe();
  }, [firebaseInitialized, router, pathname]); // Depend on firebaseInitialized

  useEffect(() => {
    if (!firebaseInitialized) return; // Wait for Firebase init

    const auth = getAuthInstance();
    if (!auth) return; // Auth service not ready

    const intervalId = setInterval(() => {
      if (auth.currentUser) {
        const loginTimestampStr = localStorage.getItem('loginTimestamp');
        if (loginTimestampStr) {
          const loginTimestamp = parseInt(loginTimestampStr, 10);
          if (Date.now() - loginTimestamp > FOUR_HOURS_MS) {
            auth.signOut().then(() => {
              localStorage.removeItem('loginTimestamp');
              router.push('/login?reason=sessionExpiredInterval');
            });
          }
        }
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(intervalId);
  }, [firebaseInitialized, router]); // Depend on firebaseInitialized

  if (isLoadingFirebase || (firebaseInitialized && isLoadingUser && !pathname.startsWith('/login') && !pathname.startsWith('/register'))) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-foreground">Loading Hyper POS...</p>
      </div>
    );
  }

  if (firebaseInitialized && !isLoadingUser && !currentUser && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
             <Loader2 className="h-12 w-12 animate-spin text-primary" />
             <p className="ml-4 text-lg text-foreground">Redirecting to login...</p>
        </div>
    );
  }
  
  if (!currentUser && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return <>{children}</>;
  }

  // If after all loading, there's still no current user, and we are not on login/register,
  // this state might be brief before redirection, or indicate an issue.
  // For safety, we can prevent rendering the full layout if currentUser is null.
  if (!currentUser) {
    // This case should ideally be covered by the redirection logic above.
    // If it's reached, it means redirection hasn't happened yet.
    // Showing a loader is safer than potentially rendering protected content or a broken layout.
    return (
        <div className="flex h-screen items-center justify-center bg-background">
             <Loader2 className="h-12 w-12 animate-spin text-primary" />
             <p className="ml-4 text-lg text-foreground">Verifying session...</p>
        </div>
    );
  }


  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4">
          <Logo showText={false} iconSize={28} />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {NAV_LINKS.map((link) => (
              <SidebarMenuItem key={link.href}>
                <NavLink href={link.href} label={link.label} icon={link.icon} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2">
           <NavLink href="/dashboard/settings" label="Settings" icon={Settings} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <div className="hidden items-center gap-4 md:flex">
              <Logo iconSize={28}/>
              {(tenantName || branchName) && <Separator orientation="vertical" className="h-6" />}
              <div>
                {tenantName && <div className="text-sm font-semibold text-foreground">{tenantName}</div>}
                {branchName && <div className="text-xs text-muted-foreground">{branchName}</div>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>
            <UserMenu user={currentUser} />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function UserMenu({ user }: { user: FirebaseUser | null }) {
  const router = useRouter();
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  useEffect(() => {
    // UserMenu might not strictly need to init Firebase if AppLayout does,
    // but defensive initialization doesn't hurt, or it can rely on AppLayout's init.
    // For simplicity, let's assume AppLayout handles the primary initialization.
    // If UserMenu were used standalone, it would need its own init logic.
    const authInstance = getAuthInstance(); // Check if already available
    if(authInstance) setFirebaseInitialized(true);
    else {
        // This case implies UserMenu is used where AppLayout hasn't initialized Firebase,
        // which shouldn't happen in the current setup.
        console.warn("UserMenu: Auth instance not ready, logout might not work if Firebase not initialized by parent.");
    }
  }, []);


  const handleLogout = () => {
    const auth = getAuthInstance();
    if (auth) {
      auth.signOut().then(() => {
        try {
          localStorage.clear(); // Clear all local storage on logout
        } catch (e) {
          console.warn('localStorage not available during logout.');
        }
        router.push('/login');
      });
    } else {
        console.error("UserMenu: Auth service not available for logout. Firebase might not be initialized.");
        // Fallback or error display
        router.push('/login?reason=logoutFailed');
    }
  };

  if (!user) {
    return (
      <Button variant="ghost" onClick={() => router.push('/login')}>
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL || "https://placehold.co/100x100.png"} alt={user.displayName || "User Avatar"} data-ai-hint="user avatar" />
            <AvatarFallback>
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email || "No email"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Support</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
