
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
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

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
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
          // If there's a Firebase user but no loginTimestamp, it implies an old session or manipulation.
          // Forcing re-login ensures the timestamp is set.
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
  }, [router, pathname]);

  useEffect(() => {
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
  }, [router]);

  if (isLoadingUser && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-foreground">Loading CoffeeOS...</p>
      </div>
    );
  }

  // If not loading and no user, and trying to access a protected route,
  // onAuthStateChanged should have redirected. This is a safeguard.
  if (!isLoadingUser && !currentUser && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
     // This typically means the redirect is in progress or auth state is truly null.
     // Returning null or a minimal loader can prevent flashing protected content.
    return (
        <div className="flex h-screen items-center justify-center bg-background">
             <Loader2 className="h-12 w-12 animate-spin text-primary" />
             <p className="ml-4 text-lg text-foreground">Redirecting to login...</p>
        </div>
    );
  }
  
  // Allow login/register pages to render without full AppLayout if no user
  if (!currentUser && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return <>{children}</>;
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
            <div className="hidden md:block">
              <Logo iconSize={28}/>
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

  const handleLogout = () => {
    auth.signOut().then(() => {
      try {
        localStorage.removeItem('loginTimestamp');
      } catch (e) {
        console.warn('localStorage not available during logout.');
      }
      router.push('/login');
    });
  };

  if (!user) {
    // This case should ideally not be hit if AppLayout correctly gates content,
    // but as a fallback, provide a sign-in button or nothing.
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
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle />}
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
