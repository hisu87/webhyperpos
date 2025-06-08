
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

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Helper to extract specific field types from Firestore REST API document fields
const getStringField = (docFields: any, fieldName: string): string | undefined => docFields[fieldName]?.stringValue;
const getTimestampField = (docFields: any, fieldName: string): Date | undefined => {
  const tsValue = docFields[fieldName]?.timestampValue;
  return tsValue ? new Date(tsValue) : undefined;
};

// Transformation for Tenant document from REST API
function transformApiDocToTenant(apiDoc: any): Tenant | null {
  const id = apiDoc.name?.split('/').pop();
  if (!id || !apiDoc.fields) return null;

  const name = getStringField(apiDoc.fields, 'name');
  if (!name) {
    console.warn(`Tenant document ${id} is missing mandatory 'name' field.`);
    return null;
  }

  const createdAt = getTimestampField(apiDoc.fields, 'createdAt');
  const updatedAt = getTimestampField(apiDoc.fields, 'updatedAt');

  if (!createdAt || !updatedAt) {
    console.warn(`Tenant document ${id} is missing createdAt or updatedAt timestampValue.`);
    return null; // createdAt and updatedAt are mandatory in Tenant type
  }

  return {
    id,
    name,
    subscriptionPlan: getStringField(apiDoc.fields, 'subscriptionPlan'),
    createdAt,
    updatedAt,
  };
}

// Transformation for Branch document from REST API
function transformApiDocToBranch(apiDoc: any): Branch | null {
  const id = apiDoc.name?.split('/').pop();
  if (!id || !apiDoc.fields) return null;

  const tenantId = getStringField(apiDoc.fields, 'tenantId');
  const name = getStringField(apiDoc.fields, 'name');

  if (!tenantId || !name) {
    console.warn(`Branch document ${id} is missing mandatory 'tenantId' or 'name' field.`);
    return null;
  }
  
  const createdAt = getTimestampField(apiDoc.fields, 'createdAt');
  const updatedAt = getTimestampField(apiDoc.fields, 'updatedAt');

  if (!createdAt || !updatedAt) {
    console.warn(`Branch document ${id} is missing createdAt or updatedAt timestampValue.`);
    return null; // createdAt and updatedAt are mandatory in Branch type
  }

  return {
    id,
    tenantId,
    name,
    location: getStringField(apiDoc.fields, 'location'),
    createdAt,
    updatedAt,
  };
}


export default function TenantBranchSelectionPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>();
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();

  const [tenantsData, setTenantsData] = useState<Tenant[]>([]);
  const [branchesData, setBranchesData] = useState<Branch[]>([]);

  const [isLoadingTenants, setIsLoadingTenants] = useState<boolean>(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenants() {
      setIsLoadingTenants(true);
      setFetchError(null);
      console.log("Fetching Tenants via REST API...");

      if (!FIREBASE_API_KEY) {
        console.error("Firebase API Key is not configured.");
        setFetchError("Client-side configuration error for fetching tenants.");
        setIsLoadingTenants(false);
        return;
      }
      
      try {
        const response = await fetch(`${FIRESTORE_BASE_URL}/Tenants?key=${FIREBASE_API_KEY}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Error response from Firestore REST API (Tenants):", response.status, errorData);
          throw new Error(`Failed to fetch tenants: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }
        const data = await response.json();
        console.log("Raw Tenants data from REST API:", data);

        const fetchedTenants: Tenant[] = (data.documents || [])
          .map(transformApiDocToTenant)
          .filter((tenant: Tenant | null): tenant is Tenant => tenant !== null)
          .sort((a: Tenant, b: Tenant) => a.name.localeCompare(b.name)); // Optional: client-side sort

        console.log("Transformed Tenants:", fetchedTenants);
        setTenantsData(fetchedTenants);
      } catch (err: any) {
        console.error("Error fetching tenants via REST API:", err);
        setFetchError(`Failed to load tenants: ${err.message}. Check console and Firestore rules (must allow public read with API key).`);
      } finally {
        setIsLoadingTenants(false);
      }
    }
    fetchTenants();
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      setBranchesData([]);
      setSelectedBranchId(undefined);
      return;
    }

    async function fetchBranches() {
      setIsLoadingBranches(true);
      setFetchError(null);
      console.log(`Fetching Branches for tenant ${selectedTenantId} via REST API...`);

      if (!FIREBASE_API_KEY) {
        console.error("Firebase API Key is not configured.");
        setFetchError("Client-side configuration error for fetching branches.");
        setIsLoadingBranches(false);
        return;
      }

      try {
        const queryBody = {
          structuredQuery: {
            from: [{ collectionId: "Branches" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "tenantId" },
                op: "EQUAL",
                value: { stringValue: selectedTenantId }
              }
            },
            // orderBy: [{ field: { fieldPath: "name" }, direction: "ASCENDING" }] // Optional
          }
        };

        const response = await fetch(`${FIRESTORE_BASE_URL}:runQuery?key=${FIREBASE_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(queryBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Error response from Firestore REST API (Branches):", response.status, errorData);
          throw new Error(`Failed to fetch branches: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }
        
        const results = await response.json();
        console.log(`Raw Branches data for tenant ${selectedTenantId} from REST API:`, results);

        const fetchedBranches: Branch[] = results
          .map((item: any) => item.document ? transformApiDocToBranch(item.document) : null)
          .filter((branch: Branch | null): branch is Branch => branch !== null)
          .sort((a: Branch, b: Branch) => a.name.localeCompare(b.name)); // Optional: client-side sort

        console.log("Transformed Branches:", fetchedBranches);
        setBranchesData(fetchedBranches);
      } catch (err: any) {
        console.error(`Error fetching branches for tenant ${selectedTenantId} via REST API:`, err);
        setFetchError(`Failed to load branches: ${err.message}. Check console and Firestore rules (must allow public read with API key).`);
      } finally {
        setIsLoadingBranches(false);
      }
    }
    fetchBranches();
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
                <SelectValue placeholder={isLoadingTenants ? "Loading tenants..." : (tenantsData.length === 0 && !fetchError ? "No tenants found" : "Choose a tenant...")} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTenants && tenantsData.length === 0 ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Loading tenants...</span>
                  </div>
                ) : tenantsData.length === 0 && !isLoadingTenants && !fetchError ? (
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
                  <SelectValue placeholder={isLoadingBranches ? "Loading branches..." : (branchesData.length === 0 && !fetchError && !isLoadingBranches && selectedTenantId ? "No branches found" : "Choose a branch...")} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingBranches && branchesData.length === 0 ? (
                     <div className="flex items-center justify-center p-2">
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       <span>Loading branches...</span>
                     </div>
                  ): branchesData.length === 0 && !isLoadingBranches && selectedTenantId && !fetchError ? (
                    <SelectItem value="no-branches" disabled>No branches for this tenant</SelectItem>
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

    