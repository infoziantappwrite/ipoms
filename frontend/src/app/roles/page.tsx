'use client';

import { Shield } from 'lucide-react';
import { RoleMatrixTab } from '@/app/settings/components/RoleMatrixTab';
import { UserSignOutButton } from '@/components/UserSignOutButton';

export default function RolesPage() {
  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* ── Top Header Bar (Frozen / Sticky at top) ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between gap-4 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
            <Shield size={18} strokeWidth={2} className="text-primary" aria-hidden />
            <span>Role Permissions Matrix (RBAC)</span>
          </h1>
          <p className="text-xs text-fg-subtle mt-0.5">
            Granular access control policies, feature privileges, and route authorization across system roles
          </p>
        </div>

        {/* User Presence & Sign Out */}
        <div className="shrink-0 flex items-center gap-3">
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="p-6 max-w-7xl mx-auto w-full flex-1">
        <RoleMatrixTab />
      </div>
    </div>
  );
}
