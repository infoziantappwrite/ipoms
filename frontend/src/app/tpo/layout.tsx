'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, ListChecks } from 'lucide-react';
import { InfoziantMark } from '@/components/InfoziantMark';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { readSessionUser, roleOf, type SessionUser } from '@/lib/session';
import { apiFetch } from '@/lib/api';

interface CollegeMeta {
  name: string;
  code: string;
  logo_url?: string;
  location?: string;
}

/**
 * TPO Layout:
 * - Shows dual brand lockup at the top: Infoziant Office Mark + Assigned College Logo
 * - Displays clean college name & Placement Officer role badge
 * - Avoids name repetitions
 * - Provides navigation between Dashboard and Tracker
 */
export default function TpoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [college, setCollege] = useState<CollegeMeta | null>(null);

  useEffect(() => {
    const session = readSessionUser();
    if (roleOf(session) !== 'tpo') {
      router.replace('/login');
      return;
    }
    setUser(session);
    setChecked(true);

    // Fetch college metadata (name, code, logo_url, location)
    (async () => {
      try {
        const res = await apiFetch<{ college: CollegeMeta | null }>('/tpo/dashboard');
        if (res.success && res.data?.college) {
          setCollege(res.data.college);
        }
      } catch {
        // Fallback silently if offline or initial load
      }
    })();
  }, [router]);

  if (!checked) return null;

  // Clean college name without redundant role suffix
  const rawName = (user as any)?.assigned_college_name || (user as any)?.full_name || 'Placement Officer';
  const cleanCollegeName = college?.name || rawName.replace(/\s*—\s*Placement Officer$/i, '').trim();
  const collegeCode = college?.code || cleanCollegeName.slice(0, 4).toUpperCase();
  const collegeLogo = college?.logo_url || `/college-logos/${collegeCode.toLowerCase()}.png`;

  const navItems = [
    { href: '/tpo', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tpo/weekly-tracker', label: 'Tracker', icon: ListChecks },
  ];

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900">
      {/* ── Top Header with Dual Logos (Office Logo + College Logo) ─────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          
          {/* Left: Dual Logo Lockup & College Identity */}
          <div className="flex items-center gap-3 min-w-0">
            {/* 1. Office Logo (Infoziant Mark) */}
            <div className="flex items-center shrink-0">
              <Link href="/tpo" className="flex items-center gap-2 group" title="Infoziant iPOMS">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/5 p-1 transition-transform group-hover:scale-105">
                  <InfoziantMark size={28} />
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="text-[11px] font-black tracking-wider text-slate-900 uppercase">INFOZIANT</span>
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">iPOMS</span>
                </div>
              </Link>
            </div>

            {/* Vertical Separator */}
            <div className="h-6 w-px bg-slate-200 shrink-0" />

            {/* 2. College Logo & Name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1 shadow-xs"
                title={`${cleanCollegeName} (${collegeCode})`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={collegeLogo}
                  alt={cleanCollegeName}
                  className="max-h-7 max-w-full object-contain rounded"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.nextElementSibling) {
                      (target.nextElementSibling as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
                <span className="hidden h-7 w-7 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                  {collegeCode?.slice(0, 2) || 'CL'}
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold leading-tight text-slate-900 truncate max-w-[170px] sm:max-w-[280px] md:max-w-[420px]" title={cleanCollegeName}>
                  {cleanCollegeName}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                    Placement Officer
                  </span>
                  <span>·</span>
                  <span className="font-medium text-slate-500">Read-only</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Navigation Tabs & User Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <nav className="hidden sm:flex items-center gap-1 rounded-xl bg-slate-100/90 p-1 border border-slate-200/70">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                      active
                        ? 'bg-white text-primary shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={14} className={active ? 'text-primary' : 'text-slate-400'} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <UserSignOutButton />
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <nav className="flex sm:hidden items-center gap-1 border-t border-slate-200 bg-slate-100/90 p-1.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-all ${
                  active ? 'bg-white text-primary shadow-xs border border-slate-200/60' : 'text-slate-600'
                }`}
              >
                <Icon size={14} className={active ? 'text-primary' : 'text-slate-400'} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
