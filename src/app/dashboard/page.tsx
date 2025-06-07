'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/menu');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <p>Loading CoffeeOS Dashboard...</p>
    </div>
  );
}
