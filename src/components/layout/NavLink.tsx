
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  tooltip?: string;
}

export function NavLink({ href, label, icon: Icon, tooltip }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <Link href={href}>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={tooltip || label}
        className={cn(isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90")}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </Link>
  );
}
