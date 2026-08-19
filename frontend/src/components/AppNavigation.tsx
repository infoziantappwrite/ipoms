'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationBellDropdown } from './NotificationBellDropdown';

export function AppNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/tracker', label: 'Daily Tracker', icon: '📋' },
    { href: '/weekly-tracker', label: 'Weekly Tracker', icon: '📅' },
    { href: '/daily-leads', label: 'Daily Leads', icon: '🎯' },
    { href: '/metadata', label: 'Metadata DB', icon: '🏢' },
    { href: '/reports', label: 'Reports & BI', icon: '📈' },
    { href: '/notifications', label: 'Alerts Center', icon: '🔔' },
    { href: '/settings', label: 'Settings & Admin', icon: '⚙️' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* ── Brand Logo & Season Badge ───────────────────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-base tracking-tight group-hover:text-blue-400 transition-colors">
                  iPOMS
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-bold font-mono">
                  v1.0
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase block -mt-0.5">
                Infoziant Operations
              </span>
            </div>
          </Link>

          <span className="hidden xl:inline-block text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full font-mono">
            2025–26 Season
          </span>
        </div>

        {/* ── Desktop Navigation Links ────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap select-none
                  ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Right Actions: Bell + User Chip ─────────────────────────────── */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Notification Bell Dropdown */}
          <NotificationBellDropdown />

          {/* User Presence Chip */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
              M
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-white leading-tight">A.Mohanaradha</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Available
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Mobile Horizontal Scroll Bar ─────────────────────────────────── */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 border-t border-slate-800/60 overflow-x-auto bg-slate-950/90">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors
                ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
