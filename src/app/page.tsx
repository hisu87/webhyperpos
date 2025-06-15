
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APP_NAME } from '@/lib/constants';
import type { Tenant, Branch, User as AppUserType } from '@/lib/types';
import { Building, Store, ArrowRight, Terminal, Loader2, User as UserIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { initializeFirebaseClient, auth as getAuthInstance, db as getDbInstance } from '@/lib/firebase'; // Updated import
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, Unsubscribe, getDoc, getDocs, limit, DocumentSnapshot, QueryDocumentSnapshot, DocumentData, Firestore } from 'firebase/firestore';

// Helper to transform Firestore snapshot doc to Tenant
function transformDocToTenant(docSnapshot: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): Tenant {
  const data = docSnapshot.data();
  if (!data) {
    return { id: docSnapshot.id, name: 'Error: Missing Data', subscriptionPlan: '', createdAt: new Date(), updatedAt: new Date() };
  }
  return {
    id: docSnapshot.id,
    name: data.name || 'Unnamed Tenant',
    subscriptionPlan: data.subscriptionPlan || 'basic',
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
}

// Helper to transform Firestore snapshot doc to Branch
function transformDocToBranch(docSnapshot: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): Branch {
  const data = docSnapshot.data();
  if (!data) {
    // Ensure the returned object matches the Branch type, especially the tenant field
    return { id: docSnapshot.id, name: 'Error: Missing Data', tenant: {id: '', name: 'N/A'}, createdAt: new Date(), updatedAt: new Date() };
  }
  return {
    id: docSnapshot.id,
    name: data.name || 'Unnamed Branch',
    location: data.location,
    // Ensure data.tenant has both id and name, or provide defaults
    tenant: data.tenant ? { id: data.tenant.id, name: data.tenant.name || 'Unnamed Tenant Ref' } : { id: '', name: 'N/A' },
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
}

interface UserProfileAccessData {
  userTenantId?: string;
  userTenantName?: string; // Added to hold denormalized tenant name from user profile
  userBranchId?: string;
  userBranchName?: string;
  role?: string;
}

export default function TenantBranchSelectionPage() {
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [userProfileAccess, setUserProfileAccess] = useState<UserProfileAccessData | null>(null);
  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState<boolean>(false);

  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>();
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();

  const [tenantsData, setTenantsData] = useState<Tenant[]>([]);
  const [branchesData, setBranchesData] = useState<Branch[]>([]);

  const [isLoadingTenants, setIsLoadingTenants] = useState<boolean>(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    try {
        initializeFirebaseClient();
        setFirebaseInitialized(true);
        console.log("Tenant/Branch Page: Firebase Client Initialized.");
    } catch (error) {
        console.error("Tenant/Branch Page: Error initializing Firebase Client:", error);
        setFetchError("Failed to initialize core services. Please refresh.");
        setIsAuthLoading(false);
    }
  }, []);


  useEffect(() => {
    if (!firebaseInitialized) {
        console.log("Tenant/Branch Page: Firebase not yet initialized, auth listener waiting.");
        return;
    }
    console.log("Tenant/Branch Page: Setting up Firebase Auth listener...");
    const auth = getAuthInstance();
    if (!auth) {
        console.error("Tenant/Branch Page: Auth instance not available after initialization.");
        setFetchError("Authentication service failed to load.");
        setIsAuthLoading(false);
        return;
    }
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Tenant/Branch Page: Auth state changed. User signed IN:", user.uid, "Email:", user.email);
        setCurrentUser(user);
      } else {
        console.log("Tenant/Branch Page: Auth state changed. User signed OUT.");
        setCurrentUser(null);
        setUserProfileAccess(null);
        setTenantsData([]);
        setBranchesData([]);
        setSelectedTenantId(undefined);
        setSelectedBranchId(undefined);
        setFetchError("Please log in to select a tenant and branch.");
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, [firebaseInitialized]);

  // Effect to fetch user's profile
  useEffect(() => {
    if (!firebaseInitialized || isAuthLoading || !currentUser || !currentUser.email) {
      setUserProfileAccess(null);
      setIsLoadingUserProfile(false);
      return;
    }

    setIsLoadingUserProfile(true);
    setFetchError(null);
    console.log("Tenant/Branch Page: Fetching user profile for email:", currentUser.email);

    const db = getDbInstance();
    if (!db) {
        console.error("Tenant/Branch Page: Firestore instance not available for user profile fetch.");
        setFetchError("Database service failed to load.");
        setIsLoadingUserProfile(false);
        return;
    }

    const usersQuery = query(collection(db, "users"), where("email", "==", currentUser.email), limit(1));
    
    const unsubscribeUser = onSnapshot(usersQuery, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as AppUserType;
        const userTenant = userData.tenant; // This should be DenormalizedTenantRef { id, name }
        const userBranch = userData.branch; // This should be DenormalizedBranchRef { id, name }

        console.log("Tenant/Branch Page: User profile found:", { 
            userId: userDoc.id, 
            userTenantId: userTenant?.id, 
            userTenantName: userTenant?.name,
            userBranchId: userBranch?.id,
            userBranchName: userBranch?.name, 
            role: userData.role 
        });
        setUserProfileAccess({ 
            userTenantId: userTenant?.id, 
            userTenantName: userTenant?.name,
            userBranchId: userBranch?.id,
            userBranchName: userBranch?.name, 
            role: userData.role 
        });

        if (!userTenant?.id && userData.role !== 'admin') {
            setFetchError("Your user profile does not have an assigned tenant. Please contact support.");
        }
      } else {
        console.warn("Tenant/Branch Page: No user profile found in 'users' collection for email:", currentUser.email);
        setUserProfileAccess(null);
      }
      setIsLoadingUserProfile(false);
    }, (error) => {
      console.error("Tenant/Branch Page: Error fetching user profile:", error);
      setFetchError(`Failed to load user access data: ${error.message}.`);
      setUserProfileAccess(null);
      setIsLoadingUserProfile(false);
    });
    return () => unsubscribeUser();
  }, [currentUser, isAuthLoading, firebaseInitialized]);


  const handleTenantChange = (tenantId: string | undefined) => {
    setSelectedTenantId(tenantId);
    setSelectedBranchId(undefined); 
  };

  // Effect to load tenants based on user profile access
  useEffect(() => {
    if (!firebaseInitialized || isAuthLoading || isLoadingUserProfile || !currentUser) {
      if (!currentUser && !isAuthLoading && firebaseInitialized) setFetchError("Please log in to view tenants.");
      return;
    }
    
    setFetchError(null);
    setIsLoadingTenants(true);
    let unsubscribeTenants: Unsubscribe | undefined;

    const profileTenantId = userProfileAccess?.userTenantId;
    const profileRole = userProfileAccess?.role;
    const db = getDbInstance();

    if (!db) {
        console.error("Tenant/Branch Page: Firestore instance not available for tenant fetch.");
        setFetchError("Database service failed to load.");
        setIsLoadingTenants(false);
        return;
    }

    if (profileTenantId) {
      console.log(`Tenant/Branch Page: Fetching specific tenant '${profileTenantId}' from user's profile.`);
      const tenantDocRef = doc(db, "tenants", profileTenantId);
      unsubscribeTenants = onSnapshot(tenantDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const tenant = transformDocToTenant(docSnap);
          setTenantsData([tenant]);
          if (selectedTenantId !== tenant.id) handleTenantChange(tenant.id);
        } else {
          setFetchError(`Your assigned tenant (ID: ${profileTenantId}) could not be found.`);
          setTenantsData([]); handleTenantChange(undefined);
        }
        setIsLoadingTenants(false);
      }, (error) => {
        setFetchError(`Failed to load assigned tenant: ${error.message}.`);
        setIsLoadingTenants(false); setTenantsData([]); handleTenantChange(undefined);
      });
    } else if (profileRole === 'admin') {
      console.log("Tenant/Branch Page: Admin user (no specific tenant in profile), fetching all tenants.");
      const tenantsQuery = query(collection(db, "tenants"));
      unsubscribeTenants = onSnapshot(tenantsQuery, (querySnapshot) => {
        const fetchedTenants: Tenant[] = querySnapshot.docs.map(transformDocToTenant);
        setTenantsData(fetchedTenants);
        if (fetchedTenants.length === 1 && selectedTenantId !== fetchedTenants[0].id) {
            handleTenantChange(fetchedTenants[0].id);
        } else if (selectedTenantId && !fetchedTenants.some(t => t.id === selectedTenantId)) {
            handleTenantChange(undefined);
        }
        setIsLoadingTenants(false);
      }, (error) => {
        setFetchError(`Failed to load tenants for admin: ${error.message}.`);
        setIsLoadingTenants(false); setTenantsData([]); handleTenantChange(undefined);
      });
    } else {
      console.log("Tenant/Branch Page: User not assigned to a tenant via profile or not an admin. No tenants to display.");
      setTenantsData([]); setIsLoadingTenants(false);
      if (currentUser && !isLoadingUserProfile && !fetchError && userProfileAccess && !profileTenantId && profileRole !== 'admin') {
          setFetchError("You are not assigned to a tenant or do not have permissions to view tenants.");
      }
      handleTenantChange(undefined);
    }
    return () => unsubscribeTenants && unsubscribeTenants();
  }, [currentUser, isAuthLoading, userProfileAccess, isLoadingUserProfile, firebaseInitialized, selectedTenantId]);

  // Effect to load branches based on selectedTenantId
  useEffect(() => {
    if (!firebaseInitialized || isAuthLoading || isLoadingUserProfile || !currentUser || !selectedTenantId) {
      setBranchesData([]); setSelectedBranchId(undefined); setIsLoadingBranches(false);
      return;
    }
    
    setFetchError(null); 
    setIsLoadingBranches(true);
    console.log(`Tenant/Branch Page: Setting up Firestore listener for Branches of tenant: ${selectedTenantId}`);
    
    const db = getDbInstance();
    if (!db) {
        console.error("Tenant/Branch Page: Firestore instance not available for branch fetch.");
        setFetchError("Database service failed to load.");
        setIsLoadingBranches(false);
        return;
    }

    const branchesQuery = query(collection(db, "branches"), where("tenant.id", "==", selectedTenantId));
    const unsubscribeBranches = onSnapshot(branchesQuery, (querySnapshot) => {
      const fetchedBranches: Branch[] = querySnapshot.docs.map(transformDocToBranch);
      setBranchesData(fetchedBranches);
      
      const userAssignedBranchId = userProfileAccess?.userBranchId;
      const tenantMatchesUserAssignedTenant = userProfileAccess?.userTenantId === selectedTenantId;

      if (fetchedBranches.length === 0) {
        if (userAssignedBranchId && tenantMatchesUserAssignedTenant) {
            setFetchError(`Your assigned branch (ID: ${userAssignedBranchId}) was not found for tenant ${selectedTenantId}.`);
        }
      } else if (userAssignedBranchId && tenantMatchesUserAssignedTenant && fetchedBranches.some(b => b.id === userAssignedBranchId)) {
        if (selectedBranchId !== userAssignedBranchId) setSelectedBranchId(userAssignedBranchId);
      } else if (fetchedBranches.length === 1 && selectedBranchId !== fetchedBranches[0].id) {
        setSelectedBranchId(fetchedBranches[0].id);
      } else if (selectedBranchId && !fetchedBranches.some(b => b.id === selectedBranchId)) {
        setSelectedBranchId(undefined);
      }
      setIsLoadingBranches(false);
    }, (error) => {
      setFetchError(`Failed to load branches: ${error.message}.`);
      setIsLoadingBranches(false); setBranchesData([]); setSelectedBranchId(undefined);
    });

    return () => unsubscribeBranches && unsubscribeBranches();
  }, [selectedTenantId, currentUser, isAuthLoading, userProfileAccess, isLoadingUserProfile, firebaseInitialized, selectedBranchId]);

  const getTenantPlaceholder = () => {
    if (!firebaseInitialized) return "Initializing...";
    if (isAuthLoading) return "Authenticating...";
    if (!currentUser && !isAuthLoading) return "Please log in";
    if (isLoadingUserProfile) return "Loading user data...";
    if (isLoadingTenants) return "Loading tenants...";
    if (tenantsData.length === 0 && !fetchError && !!currentUser && !isLoadingUserProfile && !isLoadingTenants) {
        if (userProfileAccess && !userProfileAccess.userTenantId && userProfileAccess.role !== 'admin') {
            return "Not assigned to a tenant";
        }
        return "No tenants available";
    }
    return "Select a tenant...";
  };

  const getBranchPlaceholder = () => {
    if (!selectedTenantId) return "Select a tenant first";
    if (isLoadingUserProfile && !branchesData.length && !isLoadingBranches) return "Verifying branch access..."; 
    if (isLoadingBranches) return "Loading branches...";
    if (branchesData.length === 0 && !fetchError && !!currentUser && !!selectedTenantId && !isLoadingBranches) {
         return "No branches for this tenant";
    }
    return "Select a branch...";
  };

  const isSelectionDisabled = !firebaseInitialized || isAuthLoading || !currentUser || isLoadingUserProfile || isLoadingTenants;
  const canProceed = !!currentUser && !!selectedTenantId && !!selectedBranchId && firebaseInitialized && !isAuthLoading && !isLoadingUserProfile && !isLoadingTenants && !isLoadingBranches && !fetchError;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute inset-0 z-0 opacity-10">
         <Image 
          src="https://placehold.co/1920x1080.png"
          alt="Coffee shop background" 
          layout="fill" 
          objectFit="cover"
          data-ai-hint="cafe interior"
        />
      </div>
      <Card className="w-full max-w-md shadow-2xl z-10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-block rounded-full bg-primary p-3">
            <UserIcon className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">{`Welcome to ${APP_NAME}`}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {!firebaseInitialized ? "Initializing services..." : isAuthLoading ? "Checking authentication..." : currentUser ? "Select your tenant and branch." : "Please log in to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {fetchError && (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}
          {!currentUser && !isAuthLoading && firebaseInitialized && (
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
          )}
          {(currentUser || isAuthLoading || isLoadingUserProfile || !firebaseInitialized) && (
            <>
              <div className="space-y-2">
                <label htmlFor="tenant-select" className="flex items-center text-sm font-medium text-foreground">
                  <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                  Select Tenant
                </label>
                <Select 
                  value={selectedTenantId} 
                  onValueChange={handleTenantChange}
                  disabled={isSelectionDisabled || (tenantsData.length === 0 && !fetchError && !isLoadingTenants) || (!!userProfileAccess?.userTenantId && tenantsData.length === 1 && userProfileAccess.role !== 'admin')}
                >
                  <SelectTrigger id="tenant-select" className="w-full">
                    {(!firebaseInitialized || isLoadingUserProfile || (isLoadingTenants && currentUser && !isLoadingUserProfile)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <SelectValue placeholder={getTenantPlaceholder()} />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantsData.map((tenant: Tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                    {((!firebaseInitialized || isLoadingUserProfile || isLoadingTenants) && tenantsData.length === 0 && currentUser && !isAuthLoading) && (
                         <div className="flex items-center justify-center p-2"><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span>Loading...</span></div>
                    )}
                    {(!isLoadingUserProfile && !isLoadingTenants && tenantsData.length === 0 && currentUser && !isAuthLoading && !fetchError && firebaseInitialized) && (
                       <SelectItem value="no-tenants-available" disabled>{getTenantPlaceholder()}</SelectItem>
                    )}
                     {(!currentUser && !isAuthLoading && firebaseInitialized) && (
                       <SelectItem value="login-required" disabled>Please log in</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              { (selectedTenantId && currentUser && !isAuthLoading && !isLoadingUserProfile && firebaseInitialized) && (
                <div className="space-y-2">
                  <label htmlFor="branch-select" className="flex items-center text-sm font-medium text-foreground">
                    <Store className="mr-2 h-4 w-4 text-muted-foreground" />
                    Select Branch
                  </label>
                  <Select 
                    value={selectedBranchId} 
                    onValueChange={setSelectedBranchId} 
                    disabled={isLoadingBranches || (branchesData.length === 0 && !fetchError && !!selectedTenantId && !isLoadingBranches) || (!!userProfileAccess?.userBranchId && branchesData.length ===1 && userProfileAccess?.userTenantId === selectedTenantId && userProfileAccess.role !== 'admin' && userProfileAccess.role !== 'manager')}
                  >
                    <SelectTrigger id="branch-select" className="w-full">
                      {(isLoadingBranches && selectedTenantId) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <SelectValue placeholder={getBranchPlaceholder()} />
                    </SelectTrigger>
                    <SelectContent>
                       {branchesData.map((branch: Branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                      {(isLoadingBranches && branchesData.length === 0 && selectedTenantId && !isAuthLoading) && (
                         <div className="flex items-center justify-center p-2"><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span>Loading...</span></div>
                      )}
                      {(!isLoadingBranches && branchesData.length === 0 && selectedTenantId && !fetchError && !isAuthLoading) && (
                        <SelectItem value="no-branches-available" disabled>{getBranchPlaceholder()}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button
            asChild
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={!canProceed}
            onClick={() => {
              if (selectedTenantId) localStorage.setItem('selectedTenantId', selectedTenantId);
              if (selectedBranchId) localStorage.setItem('selectedBranchId', selectedBranchId);
            }}
          >
            <Link href="/dashboard/menu">
              Enter Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground z-10">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
        <p>Modern POS for Modern Cafes.</p>
      </footer>
    </div>
  );
}

