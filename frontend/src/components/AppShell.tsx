'use client';

import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

import { AppSidebar } from './nav/AppSidebar';
import { InfoziantMark } from './InfoziantMark';

/** Routes that render their own full-screen chrome and must not show the drawer. */
const CHROMELESS = ['/', '/login', '/signup'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Stable identity: the sidebar closes on route change via an effect keyed to
  // this callback, so a fresh function each render would re-fire it endlessly.
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (CHROMELESS.includes(pathname)) {
    return <main id="main" className="flex min-h-screen flex-1 flex-col">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar mobileOpen={mobileOpen} onMobileClose={closeMobile} />

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
          <InfoziantMark size={26} />
          <span className="text-body font-bold tracking-tight text-fg">iPOMS</span>
        </div>

        <main id="main" className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
