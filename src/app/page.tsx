
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
import { db } from '@/lib/firebase';
import { collection, query, where, Timestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TenantBranchSelectionPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>();
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();

  const [tenantsData, setTenantsData] = useState<Tenant[]>([]);
  const [branchesData, setBranchesData] = useState<Branch[]>([]);

  const [isLoadingTenants, setIsLoadingTenants] = useState<boolean>(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingTenants(true);
    setFetchError(null);
    console.log("Setting up Firestore listener for Tenants...");

    const tenantsCollectionRef = collection(db, 'Tenants');
    // Removed orderBy('name') for diagnostics
    const q = query(tenantsCollectionRef);

    const unsubscribeTenants: Unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log("Tenants snapshot received. Processing...");
      const fetchedTenants: Tenant[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedTenants.push({
          id: doc.id,
          name: data.name,
          subscriptionPlan: data.subscriptionPlan,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
        } as Tenant);
      });
      console.log("Fetched Tenants:", fetchedTenants);
      setTenantsData(fetchedTenants);
      setIsLoadingTenants(false);
    }, (err) => {
      console.error("Error fetching tenants snapshot:", err);
      setFetchError(`Failed to load tenants: ${err.message}. Check browser console and Firestore rules.`);
      setIsLoadingTenants(false);
    });

    return () => {
      console.log("Cleaning up Firestore listener for Tenants.");
      unsubscribeTenants();
    };
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      setBranchesData([]);
      setSelectedBranchId(undefined);
      return () => {}; // No listener to unsubscribe
    }

    setIsLoadingBranches(true);
    setFetchError(null);
    console.log(`Setting up Firestore listener for Branches of tenant: ${selectedTenantId}`);

    const branchesCollectionRef = collection(db, 'Branches');
    // Removed orderBy('name') for diagnostics
    const q = query(
      branchesCollectionRef,
      where('tenantId', '==', selectedTenantId)
    );

    const unsubscribeBranches: Unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log(`Branches snapshot for tenant ${selectedTenantId} received. Processing...`);
      const fetchedBranches: Branch[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedBranches.push({
          id: doc.id,
          tenantId: data.tenantId,
          name: data.name,
          location: data.location,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
        } as Branch);
      });
      console.log("Fetched Branches:", fetchedBranches);
      setBranchesData(fetchedBranches);
      setIsLoadingBranches(false);
    }, (err) => {
      console.error(`Error fetching branches snapshot for tenant ${selectedTenantId}:`, err);
      setFetchError(`Failed to load branches: ${err.message}. Check browser console and Firestore rules.`);
      setIsLoadingBranches(false);
    });

    return () => {
      console.log(`Cleaning up Firestore listener for Branches of tenant: ${selectedTenantId}.`);
      unsubscribeBranches();
    };
  }, [selectedTenantId]);

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setSelectedBranchId(undefined); // Reset branch selection
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
            Please select your tenant and branch to continue.
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
          <div className="space-y-2">
            <label htmlFor="tenant-select" className="flex items-center text-sm font-medium text-foreground">
              <Building className="mr-2 h-4 w-4 text-muted-foreground" />
              Select Tenant
            </label>
            <Select 
              value={selectedTenantId} 
              onValueChange={handleTenantChange}
              disabled={isLoadingTenants || (tenantsData.length === 0 && !fetchError)}
            >
              <SelectTrigger id="tenant-select" className="w-full">
                {isLoadingTenants && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <SelectValue placeholder={isLoadingTenants ? "Loading tenants..." : (tenantsData.length === 0 ? "No tenants found" : "Choose a tenant...")} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTenants && tenantsData.length === 0 ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Loading tenants...</span>
                  </div>
                ) : tenantsData.length === 0 && !isLoadingTenants ? (
                   <SelectItem value="no-tenants" disabled>No tenants found</SelectItem>
                ) : (
                  tenantsData.map((tenant: Tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedTenantId && (
            <div className="space-y-2">
              <label htmlFor="branch-select" className="flex items-center text-sm font-medium text-foreground">
                <Store className="mr-2 h-4 w-4 text-muted-foreground" />
                Select Branch
              </label>
              <Select 
                value={selectedBranchId} 
                onValueChange={setSelectedBranchId} 
                disabled={!selectedTenantId || isLoadingBranches || (branchesData.length === 0 && !fetchError && !isLoadingBranches)}
              >
                <SelectTrigger id="branch-select" className="w-full">
                  {isLoadingBranches && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <SelectValue placeholder={isLoadingBranches ? "Loading branches..." : (branchesData.length === 0 ? "No branches found" : "Choose a branch...")} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingBranches && branchesData.length === 0 ? (
                     <div className="flex items-center justify-center p-2">
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       <span>Loading branches...</span>
                     </div>
                  ): branchesData.length === 0 && !isLoadingBranches && selectedTenantId ? (
                    <SelectItem value="no-branches" disabled>No branches found for this tenant</SelectItem>
                  ) : (
                    branchesData.map((branch: Branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            asChild
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={!selectedTenantId || !selectedBranchId || isLoadingTenants || isLoadingBranches}
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
