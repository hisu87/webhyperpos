
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APP_NAME } from '@/lib/constants';
import type { Tenant, Branch } from '@/lib/types';
import { Building, Store, ArrowRight, Terminal, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

// Helper to transform Firestore snapshot doc to Tenant
function transformDocToTenant(doc: QueryDocumentSnapshot<DocumentData>): Tenant {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name || 'Unnamed Tenant',
    subscriptionPlan: data.subscriptionPlan,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
}

// Helper to transform Firestore snapshot doc to Branch
function transformDocToBranch(doc: QueryDocumentSnapshot<DocumentData>): Branch {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: data.tenantId || '',
    name: data.name || 'Unnamed Branch',
    location: data.location,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
}


export default function TenantBranchSelectionPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

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
        console.log("Tenant/Branch Page: Auth state changed. User signed IN:", user.uid);
        setCurrentUser(user);
      } else {
        console.log("Tenant/Branch Page: Auth state changed. User signed OUT.");
        setCurrentUser(null);
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

  const handleTenantChange = (tenantId: string | undefined) => {
    console.log("Tenant/Branch Page: handleTenantChange called with tenantId:", tenantId);
    setSelectedTenantId(tenantId);
    setSelectedBranchId(undefined); // Reset branch selection, this will trigger branch useEffect
  };

  useEffect(() => {
    if (isAuthLoading) {
      console.log("Tenant/Branch Page: Auth state still loading, waiting to fetch tenants.");
      setIsLoadingTenants(true);
      return;
    }

    if (!currentUser) {
      console.log("Tenant/Branch Page: No authenticated user, skipping tenants fetch. Clearing tenant data.");
      setTenantsData([]);
      setSelectedTenantId(undefined); // Clear selection
      setSelectedBranchId(undefined);
      setIsLoadingTenants(false);
      if (!isAuthLoading) setFetchError("Please log in to view tenants.");
      return;
    }

    setFetchError(null);
    setIsLoadingTenants(true);
    console.log("Tenant/Branch Page: Authenticated user found. Setting up Firestore listener for Tenants...");

    const tenantsQuery = query(collection(db, "Tenants"));
    const unsubscribeTenants = onSnapshot(tenantsQuery, (querySnapshot) => {
      console.log("Tenant/Branch Page: Tenants snapshot received. Processing...");
      const fetchedTenants: Tenant[] = [];
      querySnapshot.forEach((doc) => {
        fetchedTenants.push(transformDocToTenant(doc));
      });
      fetchedTenants.sort((a, b) => a.name.localeCompare(b.name)); // Client-side sort
      
      setTenantsData(fetchedTenants);
      setIsLoadingTenants(false);
      console.log("Tenant/Branch Page: Tenants data updated, count:", fetchedTenants.length);

      if (fetchedTenants.length === 0) {
        console.warn("Tenant/Branch Page: No tenants found.");
        setFetchError("No tenants found for your account or permissions are missing.");
        handleTenantChange(undefined); // Clear selection if no tenants
      } else {
        const currentSelectionIsValid = fetchedTenants.some(t => t.id === selectedTenantId);
        if (fetchedTenants.length === 1 && (!selectedTenantId || !currentSelectionIsValid)) {
          console.log("Tenant/Branch Page: Auto-selecting single tenant:", fetchedTenants[0].name);
          handleTenantChange(fetchedTenants[0].id);
        } else if (selectedTenantId && !currentSelectionIsValid) {
          console.log("Tenant/Branch Page: Previously selected tenant no longer valid. Clearing selection.");
          handleTenantChange(undefined);
        }
        // If multiple tenants and a valid one is selected, or none selected, user interaction is needed.
      }
    }, (error) => {
      console.error("Tenant/Branch Page: Error fetching tenants:", error);
      setFetchError(`Failed to load tenants: ${error.message}. Check Firestore rules and collection name "Tenants".`);
      setIsLoadingTenants(false);
      setTenantsData([]); // Clear data on error
      handleTenantChange(undefined);
    });

    return () => {
      console.log("Tenant/Branch Page: Cleaning up Tenants listener.");
      unsubscribeTenants();
    };
  }, [currentUser, isAuthLoading]); // selectedTenantId removed as direct dependency here to avoid loops with auto-selection

  useEffect(() => {
    if (isAuthLoading) {
      console.log("Tenant/Branch Page: Auth state still loading, waiting to fetch branches.");
      if (selectedTenantId) setIsLoadingBranches(true);
      return;
    }
    if (!currentUser) {
      console.log("Tenant/Branch Page: No authenticated user, skipping branches fetch.");
      if (selectedTenantId) {
        setBranchesData([]);
        setSelectedBranchId(undefined);
        setIsLoadingBranches(false);
      }
      return;
    }
    if (!selectedTenantId) {
      console.log("Tenant/Branch Page: No tenant selected, clearing branches.");
      setBranchesData([]);
      setSelectedBranchId(undefined);
      setIsLoadingBranches(false);
      return;
    }

    setFetchError(null); // Clear general error, branch specific error can be set below
    setIsLoadingBranches(true);
    console.log(`Tenant/Branch Page: Setting up Firestore listener for Branches of tenant: ${selectedTenantId}`);

    const branchesQuery = query(collection(db, "Branches"), where("tenantId", "==", selectedTenantId));
    const unsubscribeBranches = onSnapshot(branchesQuery, (querySnapshot) => {
      console.log(`Tenant/Branch Page: Branches snapshot received for tenant ${selectedTenantId}. Processing...`);
      const fetchedBranches: Branch[] = [];
      querySnapshot.forEach((doc) => {
        fetchedBranches.push(transformDocToBranch(doc));
      });
      fetchedBranches.sort((a, b) => a.name.localeCompare(b.name)); // Client-side sort

      setBranchesData(fetchedBranches);
      setIsLoadingBranches(false);
      console.log("Tenant/Branch Page: Branches data updated, count:", fetchedBranches.length);

      if (fetchedBranches.length === 0) {
        console.warn(`Tenant/Branch Page: No branches found for tenantId '${selectedTenantId}'.`);
        // Do not set general fetchError here, let placeholder indicate no branches
        // setFetchError(`No branches found for the selected tenant.`);
      } else {
         // Auto-select first branch if only one is available and none is selected
        if (fetchedBranches.length === 1 && !selectedBranchId) {
            console.log("Tenant/Branch Page: Auto-selecting single branch:", fetchedBranches[0].name);
            setSelectedBranchId(fetchedBranches[0].id);
        } else if (selectedBranchId && !fetchedBranches.some(b => b.id === selectedBranchId)) {
            console.log("Tenant/Branch Page: Previously selected branch no longer valid. Clearing selection.");
            setSelectedBranchId(undefined);
        }
      }
    }, (error) => {
      console.error(`Tenant/Branch Page: Error fetching branches for tenant ${selectedTenantId}:`, error);
      setFetchError(`Failed to load branches: ${error.message}. Check Firestore rules, collection "Branches", and "tenantId" field.`);
      setIsLoadingBranches(false);
      setBranchesData([]); // Clear data on error
      setSelectedBranchId(undefined);
    });

    return () => {
      console.log(`Tenant/Branch Page: Cleaning up Branches listener for tenant: ${selectedTenantId}`);
      unsubscribeBranches();
    };
  }, [selectedTenantId, currentUser, isAuthLoading]);

  const getTenantPlaceholder = () => {
    if (isAuthLoading) return "Authenticating...";
    if (!currentUser && !isAuthLoading) return "Please log in";
    if (isLoadingTenants) return "Loading tenants...";
    if (tenantsData.length === 0 && !fetchError && !!currentUser) return "No tenants available";
    return "Select a tenant...";
  };

  const getBranchPlaceholder = () => {
    if (!selectedTenantId) return "Select a tenant first";
    // if (isAuthLoading) return "Authenticating..."; // Covered by tenant checks
    // if (!currentUser && !isAuthLoading) return "Please log in"; // Covered by tenant checks
    if (isLoadingBranches) return "Loading branches...";
    if (branchesData.length === 0 && !fetchError && !!currentUser && !!selectedTenantId) return "No branches for this tenant";
    return "Select a branch...";
  };

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
            <Store className="h-10 w-10 text-primary-foreground" />
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
          {(currentUser || isAuthLoading) && (
            <>
              <div className="space-y-2">
                <label htmlFor="tenant-select" className="flex items-center text-sm font-medium text-foreground">
                  <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                  Select Tenant
                </label>
                <Select 
                  value={selectedTenantId} 
                  onValueChange={handleTenantChange}
                  disabled={isAuthLoading || !currentUser || isLoadingTenants || (tenantsData.length === 0 && !fetchError)}
                >
                  <SelectTrigger id="tenant-select" className="w-full">
                    {(isLoadingTenants && currentUser) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <SelectValue placeholder={getTenantPlaceholder()} />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantsData.map((tenant: Tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                    {(isLoadingTenants && tenantsData.length === 0 && currentUser) && (
                         <div className="flex items-center justify-center p-2"><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span>Loading...</span></div>
                    )}
                    {(!isLoadingTenants && tenantsData.length === 0 && currentUser && !fetchError) && (
                       <SelectItem value="no-tenants" disabled>No tenants found</SelectItem>
                    )}
                     {(!currentUser && !isAuthLoading) && (
                       <SelectItem value="login-req" disabled>Please log in</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              { (selectedTenantId && currentUser && !isAuthLoading) && (
                <div className="space-y-2">
                  <label htmlFor="branch-select" className="flex items-center text-sm font-medium text-foreground">
                    <Store className="mr-2 h-4 w-4 text-muted-foreground" />
                    Select Branch
                  </label>
                  <Select 
                    value={selectedBranchId} 
                    onValueChange={setSelectedBranchId} 
                    disabled={isLoadingBranches || (branchesData.length === 0 && !fetchError && !!selectedTenantId)}
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
                      {(isLoadingBranches && branchesData.length === 0 && selectedTenantId) && (
                         <div className="flex items-center justify-center p-2"><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span>Loading...</span></div>
                      )}
                      {(!isLoadingBranches && branchesData.length === 0 && selectedTenantId && !fetchError) && (
                        <SelectItem value="no-branches" disabled>No branches for this tenant</SelectItem>
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
            disabled={isAuthLoading || !currentUser || !selectedTenantId || !selectedBranchId || isLoadingTenants || isLoadingBranches}
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

