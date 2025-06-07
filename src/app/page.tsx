'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOCK_TENANTS, MOCK_BRANCHES, APP_NAME } from '@/lib/constants';
import type { Tenant, Branch } from '@/lib/types';
import { Building, Store, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function TenantBranchSelectionPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>();
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setSelectedBranchId(undefined); // Reset branch selection
  };

  const availableBranches = selectedTenantId
    ? MOCK_BRANCHES.filter((branch) => branch.tenantId === selectedTenantId)
    : [];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute inset-0 z-0 opacity-10">
         <Image 
          src="https://placehold.co/1920x1080.png" // Replace with a fitting coffee shop background
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
          <div className="space-y-2">
            <label htmlFor="tenant-select" className="flex items-center text-sm font-medium text-foreground">
              <Building className="mr-2 h-4 w-4 text-muted-foreground" />
              Select Tenant
            </label>
            <Select value={selectedTenantId} onValueChange={handleTenantChange}>
              <SelectTrigger id="tenant-select" className="w-full">
                <SelectValue placeholder="Choose a tenant..." />
              </SelectTrigger>
              <SelectContent>
                {MOCK_TENANTS.map((tenant: Tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTenantId && (
            <div className="space-y-2">
              <label htmlFor="branch-select" className="flex items-center text-sm font-medium text-foreground">
                <Store className="mr-2 h-4 w-4 text-muted-foreground" />
                Select Branch
              </label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={!selectedTenantId}>
                <SelectTrigger id="branch-select" className="w-full">
                  <SelectValue placeholder="Choose a branch..." />
                </SelectTrigger>
                <SelectContent>
                  {availableBranches.map((branch: Branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            asChild
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={!selectedTenantId || !selectedBranchId}
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
