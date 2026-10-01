'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, ListChecks, RefreshCw } from 'lucide-react';
import { InfoziantMark } from '@/components/InfoziantMark';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { readSessionUser, roleOf, type SessionUser } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { getCachedColleges, getCollegeAcronym } from '@/lib/collegeSession';

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
 * - Prominent header height with crisp branding and responsive navigation
 */
export default function TpoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [college, setCollege] = useState<CollegeMeta | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await apiFetch<{ college_id: string; synced_count?: number }>('/tpo/sync', {
        method: 'POST',
      });
      // Broadcast to active TPO views (Dashboard and Weekly Tracker) for in-memory live refresh
      window.dispatchEvent(new CustomEvent('ipoms_tpo_sync', { detail: { res } }));
      try {
        const bc = new BroadcastChannel('ipoms_tpo_sync_channel');
        bc.postMessage({ action: 'sync_completed', timestamp: Date.now() });
        bc.close();
      } catch {}
    } catch (err) {
      console.error('[TPO Sync] Failed to synchronize college data:', err);
      window.dispatchEvent(new CustomEvent('ipoms_tpo_sync'));
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
      }, 500);
    }
  };

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

  // Resolve assigned college information synchronously & from API
  const rawCollegeId = (user as any)?.assigned_college_id || (user as any)?.college_id;
  const rawCollegeCode = (user as any)?.assigned_college_code || (user as any)?.college_code;
  const rawName = (user as any)?.assigned_college_name || (user as any)?.full_name || 'Placement Institution';
  const cleanCollegeName = college?.name || rawName.replace(/\s*—\s*Placement Officer$/i, '').trim();

  const allKnown = getCachedColleges();
  const matchedCollege = allKnown.find((c) =>
    (rawCollegeId && (c._id === rawCollegeId || String(c._id) === String(rawCollegeId))) ||
    (rawCollegeCode && c.college_code?.toUpperCase() === String(rawCollegeCode).toUpperCase()) ||
    (college?.code && c.college_code?.toUpperCase() === college.code.toUpperCase()) ||
    (c.college_name && cleanCollegeName && c.college_name.toLowerCase() === cleanCollegeName.toLowerCase()) ||
    (c.college_name && cleanCollegeName && (c.college_name.toLowerCase().includes(cleanCollegeName.toLowerCase()) || cleanCollegeName.toLowerCase().includes(c.college_name.toLowerCase())))
  );

  const collegeCode = college?.code || matchedCollege?.college_code || getCollegeAcronym(cleanCollegeName) || 'TPO';
  const collegeLogo = college?.logo_url || matchedCollege?.logo_url || `/college-logos/${collegeCode.toLowerCase()}.png`;
  const collegeLocation = college?.location || matchedCollege?.location || '';

  const navItems = [
    { href: '/tpo', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tpo/weekly-tracker', label: 'Tracker', icon: ListChecks },
  ];

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900">
      {/* ── Top Header with Dual Logos (Office Logo + College Logo) ─────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5">
          
          {/* Left: Dual Logo Lockup & College Identity */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* 1. Office Logo (Infoziant Mark) */}
            <div className="flex items-center shrink-0">
              <Link href="/tpo" className="flex items-center gap-2.5 group" title="Infoziant iPOMS">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-slate-900/5 p-1.5 transition-transform group-hover:scale-105 shadow-xs border border-slate-200/60">
                  <InfoziantMark size={32} />
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-xs font-black tracking-wider text-slate-900 uppercase">INFOZIANT</span>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">iPOMS</span>
                </div>
              </Link>
            </div>

            {/* Vertical Separator */}
            <div className="h-8 w-px bg-slate-200 shrink-0" />

            {/* 2. College Logo & Name */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs"
                title={`${cleanCollegeName} (${collegeCode})`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={collegeLogo}
                  src={collegeLogo}
                  alt={cleanCollegeName}
                  className="max-h-8 sm:max-h-9 max-w-full object-contain rounded"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.nextElementSibling) {
                      (target.nextElementSibling as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
                <span className="hidden h-8 w-8 items-center justify-center rounded-xl bg-primary/10 font-mono text-xs font-bold text-primary">
                  {collegeCode?.slice(0, 2) || 'CL'}
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-sm sm:text-base font-extrabold leading-tight text-slate-900 truncate max-w-[200px] sm:max-w-[340px] md:max-w-[500px]" title={cleanCollegeName}>
                  {cleanCollegeName}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="inline-flex items-center rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 px-2 py-0.5 text-[10px] font-bold">
                    Placement Officer
                  </span>
                  {collegeLocation && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="font-medium text-slate-500 hidden sm:inline">{collegeLocation}</span>
                    </>
                  )}
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-slate-400">Read-only</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Navigation Tabs, Synchronization Button & User Sign Out */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* SVG Defs for Dual-Shade Cyan-to-Royal-Blue Gradient Sync Icon */}
            <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
              <defs>
                <linearGradient id="sync-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
              </defs>
            </svg>

            <nav className="hidden sm:flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-[#06B6D4] to-[#2563EB] text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    <Icon size={15} strokeWidth={2.2} className={active ? 'text-white' : 'text-slate-500'} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Synchronization Button with Dual-Shade Gradient matching toggle */}
            <button
              type="button"
              onClick={handleSync}
              title="Synchronize Data"
              style={{ background: 'linear-gradient(180deg, #FFC53D 0%, #FF9500 50%, #FF5E00 100%)' }}
              className="group relative flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md shadow-orange-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw
                size={17}
                strokeWidth={2.4}
                className={`text-white transition-all duration-500 ${
                  isSyncing ? 'animate-spin' : 'group-hover:rotate-180'
                }`}
              />
            </button>

            <UserSignOutButton />
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <nav className="flex sm:hidden items-center gap-1 border-t border-slate-200 bg-slate-100 p-1.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-[#06B6D4] to-[#2563EB] text-white shadow-xs font-extrabold'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 font-semibold'
                }`}
              >
                <Icon size={14} strokeWidth={2.2} className={active ? 'text-white' : 'text-slate-500'} />
                <span>{item.label}</span>
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
