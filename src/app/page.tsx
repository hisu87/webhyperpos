
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
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, DocumentData, QueryDocumentSnapshot, limit, getDocs, doc, Unsubscribe, getDoc, DocumentSnapshot } from 'firebase/firestore';

// Helper to transform Firestore snapshot doc to Tenant
function transformDocToTenant(docSnapshot: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): Tenant {
  const data = docSnapshot.data();
  if (!data) {
    console.error("transformDocToTenant called with a document that has no data:", docSnapshot.id);
    return {
        id: docSnapshot.id,
        name: 'Error: Missing Data',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
  }
  return {
    id: docSnapshot.id,
    name: data.name || 'Unnamed Tenant',
    subscriptionPlan: data.subscriptionPlan,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
}

// Helper to transform Firestore snapshot doc to Branch
function transformDocToBranch(docSnapshot: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): Branch {
  const data = docSnapshot.data();
   if (!data) {
    console.error("transformDocToBranch called with a document that has no data:", docSnapshot.id);
    return {
        id: docSnapshot.id,
        tenantId: '',
        name: 'Error: Missing Data',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
  }
  return {
    id: docSnapshot.id,
    tenantId: data.tenantId || '',
    name: data.name || 'Unnamed Branch',
    location: data.location,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
}

interface UserProfileAccessData {
  userBranchId?: string;       // branchId directly from user's profile
  derivedTenantId?: string;    // tenantId obtained from the user's branch
  role?: string;
}


export default function TenantBranchSelectionPage() {
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
    console.log("Tenant/Branch Page: Setting up Firebase Auth listener...");
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
      console.log("Tenant/Branch Page: Auth loading complete. isAuthLoading:", false, "currentUser:", user?.uid || null);
    });

    return () => {
      console.log("Tenant/Branch Page: Cleaning up Firebase Auth listener.");
      unsubscribeAuth();
    };
  }, []);

  // Effect to fetch user's profile (branchId, role) and then derive tenantId
  useEffect(() => {
    if (isAuthLoading) {
      console.log("Tenant/Branch Page: Auth state still loading, waiting to fetch user profile.");
      return;
    }
    if (!currentUser || !currentUser.email) {
      console.log("Tenant/Branch Page: No authenticated user or email, skipping user profile fetch.");
      setUserProfileAccess(null);
      return;
    }

    setIsLoadingUserProfile(true);
    setFetchError(null);
    console.log("Tenant/Branch Page: Fetching user profile for email:", currentUser.email);

    const usersQuery = query(collection(db, "users"), where("email", "==", currentUser.email), limit(1));
    
    getDocs(usersQuery).then(async (querySnapshot) => {
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as AppUserType; // Use AppUserType
        const userBranchId = userData.branchId;
        const userRole = userData.role;
        console.log("Tenant/Branch Page: User profile found:", { userBranchId, userRole });

        if (userBranchId) {
          console.log("Tenant/Branch Page: User has branchId:", userBranchId, ". Fetching branch to derive tenantId.");
          const branchDocRef = doc(db, "Branches", userBranchId);
          const branchDocSnap = await getDoc(branchDocRef);

          if (branchDocSnap.exists()) {
            const branchData = transformDocToBranch(branchDocSnap);
            const derivedTenantId = branchData.tenantId;
            if (derivedTenantId) {
              console.log("Tenant/Branch Page: Derived tenantId from branch:", derivedTenantId);
              setUserProfileAccess({ userBranchId, derivedTenantId, role: userRole });
            } else {
              console.warn("Tenant/Branch Page: Branch", userBranchId, "found, but it has no tenantId.");
              setFetchError(`Your assigned branch (ID: ${userBranchId}) is missing tenant information. Please contact support.`);
              setUserProfileAccess({ userBranchId, role: userRole }); // Still store what we have
            }
          } else {
            console.warn("Tenant/Branch Page: User's assigned branchId:", userBranchId, "not found in Branches collection.");
            setFetchError(`Your assigned branch (ID: ${userBranchId}) could not be found. Please contact support.`);
            setUserProfileAccess({ userBranchId, role: userRole }); // Store what we have, tenant fetch will fail
          }
        } else if (userRole === 'admin') {
          console.log("Tenant/Branch Page: Admin user detected with no specific branchId. Will allow selection from all tenants.");
          setUserProfileAccess({ role: userRole });
        } else {
          console.log("Tenant/Branch Page: User has no branchId and is not an admin who can see all tenants.");
          setFetchError("You are not assigned to a specific branch or do not have permissions to view tenants.");
          setUserProfileAccess({ role: userRole });
        }
      } else {
        console.warn("Tenant/Branch Page: No user profile found in 'users' collection for email:", currentUser.email);
        setUserProfileAccess(null);
        setFetchError("User profile not found. Please contact support if this is unexpected.");
      }
    }).catch(error => {
      console.error("Tenant/Branch Page: Error fetching user profile or branch details:", error);
      setFetchError(`Failed to load user access data: ${error.message}.`);
      setUserProfileAccess(null);
    }).finally(() => {
      setIsLoadingUserProfile(false);
      console.log("Tenant/Branch Page: User profile access fetching complete.");
    });

  }, [currentUser, isAuthLoading]);


  const handleTenantChange = (tenantId: string | undefined) => {
    console.log("Tenant/Branch Page: handleTenantChange called with tenantId:", tenantId);
    setSelectedTenantId(tenantId);
    setSelectedBranchId(undefined); // Reset branch selection
  };

  // Effect to load tenants based on derived access
  useEffect(() => {
    if (isAuthLoading || isLoadingUserProfile) {
      console.log("Tenant/Branch Page: Auth or User Profile still loading, waiting to fetch tenants.");
      if (currentUser && !isLoadingUserProfile) setIsLoadingTenants(true);
      return;
    }

    if (!currentUser) {
      console.log("Tenant/Branch Page: No authenticated user, skipping tenants fetch.");
      setTenantsData([]);
      handleTenantChange(undefined);
      setIsLoadingTenants(false);
      if (!isAuthLoading) setFetchError("Please log in to view tenants.");
      return;
    }
    
    if (!userProfileAccess && !isLoadingUserProfile) {
        console.log("Tenant/Branch Page: User profile access not determined after loading.");
        setTenantsData([]);
        setIsLoadingTenants(false);
        // Error might be set by user profile fetcher
        return;
    }
    if (isLoadingUserProfile) return; // Still waiting

    setFetchError(null);
    setIsLoadingTenants(true);
    let unsubscribeTenants: Unsubscribe | undefined;

    if (userProfileAccess?.derivedTenantId) {
      console.log(`Tenant/Branch Page: Fetching specific tenant '${userProfileAccess.derivedTenantId}' based on user's branch.`);
      const tenantDocRef = doc(db, "Tenants", userProfileAccess.derivedTenantId);
      unsubscribeTenants = onSnapshot(tenantDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const tenant = transformDocToTenant(docSnap);
          console.log("Tenant/Branch Page: Specific tenant data received:", tenant.name);
          setTenantsData([tenant]);
          if (selectedTenantId !== tenant.id) { // Auto-select this tenant
            console.log("Tenant/Branch Page: Auto-selecting user's derived tenant:", tenant.name);
            handleTenantChange(tenant.id);
          }
        } else {
          console.warn(`Tenant/Branch Page: User's derived tenant '${userProfileAccess.derivedTenantId}' not found.`);
          setFetchError(`Your assigned tenant (ID: ${userProfileAccess.derivedTenantId}) could not be found. Please contact support.`);
          setTenantsData([]);
          handleTenantChange(undefined);
        }
        setIsLoadingTenants(false);
      }, (error) => {
        console.error(`Tenant/Branch Page: Error fetching specific tenant '${userProfileAccess.derivedTenantId}':`, error);
        setFetchError(`Failed to load assigned tenant: ${error.message}.`);
        setIsLoadingTenants(false);
        setTenantsData([]);
        handleTenantChange(undefined);
      });

    } else if (userProfileAccess?.role === 'admin' && !userProfileAccess?.derivedTenantId) {
      console.log("Tenant/Branch Page: Admin user (not tied to a specific branch/tenant), fetching all tenants.");
      const tenantsQuery = query(collection(db, "Tenants"));
      unsubscribeTenants = onSnapshot(tenantsQuery, (querySnapshot) => {
        const fetchedTenants: Tenant[] = querySnapshot.docs.map(transformDocToTenant);
        setTenantsData(fetchedTenants);
        setIsLoadingTenants(false);
        console.log("Tenant/Branch Page: All tenants data updated for admin, count:", fetchedTenants.length);

        if (fetchedTenants.length === 0) {
          console.warn("Tenant/Branch Page: No tenants found in the system for admin.");
        } else {
            const currentSelectionIsValid = fetchedTenants.some(t => t.id === selectedTenantId);
            if (fetchedTenants.length === 1 && (!selectedTenantId || !currentSelectionIsValid)) {
                console.log("Tenant/Branch Page: Admin sees single tenant, auto-selecting:", fetchedTenants[0].name);
                handleTenantChange(fetchedTenants[0].id);
            } else if (selectedTenantId && !currentSelectionIsValid) {
                console.log("Tenant/Branch Page: Admin's previously selected tenant no longer valid. Clearing selection.");
                handleTenantChange(undefined);
            }
        }
      }, (error) => {
        console.error("Tenant/Branch Page: Error fetching all tenants for admin:", error);
        setFetchError(`Failed to load tenants for admin: ${error.message}.`);
        setIsLoadingTenants(false);
        setTenantsData([]);
        handleTenantChange(undefined);
      });

    } else {
      console.log("Tenant/Branch Page: User not assigned to a tenant via branch or not an admin who can see all. No tenants to display.");
      setTenantsData([]);
      setIsLoadingTenants(false);
      if (currentUser && !isLoadingUserProfile && !fetchError && (!userProfileAccess || (!userProfileAccess.derivedTenantId && userProfileAccess.role !== 'admin'))) {
          setFetchError(fetchError || "You are not assigned to a tenant or do not have permissions to view tenants.");
      }
      handleTenantChange(undefined);
    }

    return () => {
      if (unsubscribeTenants) {
        console.log("Tenant/Branch Page: Cleaning up Tenants listener.");
        unsubscribeTenants();
      }
    };
  }, [currentUser, isAuthLoading, userProfileAccess, isLoadingUserProfile]);

  // Effect to load branches based on selectedTenantId
  useEffect(() => {
    if (isAuthLoading || isLoadingUserProfile) {
      console.log("Tenant/Branch Page: Auth or User Profile still loading, waiting to fetch branches.");
      if (selectedTenantId) setIsLoadingBranches(true);
      return;
    }
    if (!currentUser) {
      console.log("Tenant/Branch Page: No authenticated user, skipping branches fetch.");
      if (selectedTenantId) { setBranchesData([]); setSelectedBranchId(undefined); setIsLoadingBranches(false); }
      return;
    }
    if (!selectedTenantId) {
      console.log("Tenant/Branch Page: No tenant selected, clearing branches.");
      setBranchesData([]); setSelectedBranchId(undefined); setIsLoadingBranches(false);
      return;
    }

    setFetchError(null);
    setIsLoadingBranches(true);
    console.log(`Tenant/Branch Page: Setting up Firestore listener for Branches of tenant: ${selectedTenantId}`);

    const branchesQuery = query(collection(db, "Branches"), where("tenantId", "==", selectedTenantId));
    const unsubscribeBranches = onSnapshot(branchesQuery, (querySnapshot) => {
      const fetchedBranches: Branch[] = querySnapshot.docs.map(transformDocToBranch);
      setBranchesData(fetchedBranches);
      setIsLoadingBranches(false);
      console.log("Tenant/Branch Page: Branches data updated for tenant", selectedTenantId, "count:", fetchedBranches.length);

      if (fetchedBranches.length === 0) {
        console.warn(`Tenant/Branch Page: No branches found for tenantId '${selectedTenantId}'.`);
        if (userProfileAccess?.userBranchId && userProfileAccess?.derivedTenantId === selectedTenantId) {
            setFetchError(`Your assigned branch (ID: ${userProfileAccess.userBranchId}) was not found for tenant ${selectedTenantId}.`);
        }
      } else {
        const userAssignedBranchId = userProfileAccess?.userBranchId;
        const tenantMatchesUserDerivedTenant = userProfileAccess?.derivedTenantId === selectedTenantId;
        const currentSelectionIsValid = fetchedBranches.some(b => b.id === selectedBranchId);

        if (userAssignedBranchId && tenantMatchesUserDerivedTenant && fetchedBranches.some(b => b.id === userAssignedBranchId)) {
          if (selectedBranchId !== userAssignedBranchId) {
            console.log("Tenant/Branch Page: Pre-selecting branch from user profile:", userAssignedBranchId);
            setSelectedBranchId(userAssignedBranchId);
          }
        } else if (fetchedBranches.length === 1 && (!selectedBranchId || !currentSelectionIsValid)) {
            console.log("Tenant/Branch Page: Auto-selecting single branch:", fetchedBranches[0].name);
            setSelectedBranchId(fetchedBranches[0].id);
        } else if (selectedBranchId && !currentSelectionIsValid) {
            console.log("Tenant/Branch Page: Previously selected branch no longer valid. Clearing selection.");
            setSelectedBranchId(undefined);
        }
      }
    }, (error) => {
      console.error(`Tenant/Branch Page: Error fetching branches for tenant ${selectedTenantId}:`, error);
      setFetchError(`Failed to load branches: ${error.message}.`);
      setIsLoadingBranches(false);
      setBranchesData([]);
      setSelectedBranchId(undefined);
    });

    return () => {
      if (unsubscribeBranches) {
        console.log(`Tenant/Branch Page: Cleaning up Branches listener for tenant: ${selectedTenantId}`);
        unsubscribeBranches();
      }
    };
  }, [selectedTenantId, currentUser, isAuthLoading, userProfileAccess, isLoadingUserProfile]);

  const getTenantPlaceholder = () => {
    if (isAuthLoading) return "Authenticating...";
    if (!currentUser && !isAuthLoading) return "Please log in";
    if (isLoadingUserProfile) return "Loading user data...";
    if (isLoadingTenants) return "Loading tenants...";
    if (tenantsData.length === 0 && !fetchError && !!currentUser && !isLoadingUserProfile && !isLoadingTenants) {
        if (userProfileAccess && !userProfileAccess.derivedTenantId && userProfileAccess.role !== 'admin') {
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

  const isSelectionDisabled = isAuthLoading || !currentUser || isLoadingUserProfile || isLoadingTenants;
  const canProceed = !!currentUser && !!selectedTenantId && !!selectedBranchId && !isAuthLoading && !isLoadingUserProfile && !isLoadingTenants && !isLoadingBranches;

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
            {isAuthLoading ? "Checking authentication..." : currentUser ? "Select your tenant and branch." : "Please log in to continue."}
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
          {!currentUser && !isAuthLoading && (
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
          )}
          {(currentUser || isAuthLoading || isLoadingUserProfile) && (
            <>
              <div className="space-y-2">
                <label htmlFor="tenant-select" className="flex items-center text-sm font-medium text-foreground">
                  <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                  Select Tenant
                </label>
                <Select 
                  value={selectedTenantId} 
                  onValueChange={handleTenantChange}
                  disabled={isSelectionDisabled || (tenantsData.length === 0 && !fetchError && !isLoadingTenants)}
                >
                  <SelectTrigger id="tenant-select" className="w-full">
                    {(isLoadingUserProfile || (isLoadingTenants && currentUser && !isLoadingUserProfile)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <SelectValue placeholder={getTenantPlaceholder()} />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantsData.map((tenant: Tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                    {((isLoadingUserProfile || isLoadingTenants) && tenantsData.length === 0 && currentUser && !isAuthLoading) && (
                         <div className="flex items-center justify-center p-2"><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span>Loading...</span></div>
                    )}
                    {(!isLoadingUserProfile && !isLoadingTenants && tenantsData.length === 0 && currentUser && !isAuthLoading && !fetchError) && (
                       <SelectItem value="no-tenants-available" disabled>{getTenantPlaceholder()}</SelectItem>
                    )}
                     {(!currentUser && !isAuthLoading) && (
                       <SelectItem value="login-required" disabled>Please log in</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              { (selectedTenantId && currentUser && !isAuthLoading && !isLoadingUserProfile) && (
                <div className="space-y-2">
                  <label htmlFor="branch-select" className="flex items-center text-sm font-medium text-foreground">
                    <Store className="mr-2 h-4 w-4 text-muted-foreground" />
                    Select Branch
                  </label>
                  <Select 
                    value={selectedBranchId} 
                    onValueChange={setSelectedBranchId} 
                    disabled={isLoadingBranches || (branchesData.length === 0 && !fetchError && !!selectedTenantId && !isLoadingBranches)}
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

