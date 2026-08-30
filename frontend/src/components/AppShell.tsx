'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';

import { AppSidebar } from './nav/AppSidebar';
import { InfoziantMark } from './InfoziantMark';
import { initTheme } from '@/lib/theme';
import { isFocusLockedToday } from '@/lib/collegeSession';
import { useToast } from '@/components/ui/Toast';

import { readSessionUser, roleOf } from '@/lib/session';

/** Routes that render their own full-screen chrome and must not show the drawer. */
const CHROMELESS = ['/', '/login', '/signup'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const rawPathname = usePathname();
  // next.config.mjs sets trailingSlash: true (for the Capacitor static export),
  // so usePathname() returns "/login/" not "/login" — normalize before matching.
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/$/, '') : rawPathname;
  const [mobileOpen, setMobileOpen] = useState(false);
  // Stable identity: the sidebar closes on route change via an effect keyed to
  // this callback, so a fresh function each render would re-fire it endlessly.
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    initTheme(pathname);
  }, [pathname]);

  // Enforce focus lockdown: ONLY Placement Coordinators require locking daily focus
  useEffect(() => {
    const user = readSessionUser();
    const userRole = roleOf(user);

    // Team Leaders and Administrators never have locked routes
    if (userRole !== 'coordinator') {
      return;
    }

    const isAllowedRoute =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname === '/dashboard' ||
      pathname === '/settings' ||
      pathname.startsWith('/settings');

    if (!isAllowedRoute && typeof window !== 'undefined') {
      if (!isFocusLockedToday()) {
        toast('Please select between 1 and 4 focus colleges on the Dashboard to unlock operational modules.', 'warning');
        router.replace('/dashboard');
      }
    }
  }, [pathname, router, toast]);

  // ── Global Ctrl+S / Cmd+S Shortcut Dispatcher ──────────────────────────────
  useEffect(() => {
    const handleGlobalSaveShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent('ipoms_global_save_trigger', {
            detail: { pathname, timestamp: Date.now() },
          })
        );
      }
    };

    window.addEventListener('keydown', handleGlobalSaveShortcut);
    return () => window.removeEventListener('keydown', handleGlobalSaveShortcut);
  }, [pathname]);

  if (CHROMELESS.includes(pathname)) {
    return <main id="main" className="flex min-h-screen flex-1 flex-col">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={null}>
        <AppSidebar mobileOpen={mobileOpen} onMobileClose={closeMobile} />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Drawer trigger — only where the drawer is off-canvas. */}
        <div className="sticky top-0 z-sticky flex h-14 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden print:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="grid h-9 w-9 place-items-center rounded-control border border-border bg-surface text-fg-muted shadow-1 transition-[box-shadow,color] hover:text-fg active:shadow-inset-1"
          >
            <Menu size={18} strokeWidth={2} aria-hidden />
          </button>
          <Link
            href="/dashboard"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white p-1 shadow-2xs border border-slate-200/80 dark:border-white/20"
            aria-label="iPOMS home"
          >
            <InfoziantMark size={22} />
          </Link>
          <span className="text-body font-bold tracking-tight text-fg">iPOMS</span>
        </div>

        <main id="main" className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
