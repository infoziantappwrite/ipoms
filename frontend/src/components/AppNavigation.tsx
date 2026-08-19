'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { InfoziantLogo } from './InfoziantLogo';
import { NotificationBellDropdown } from './NotificationBellDropdown';
import {
  LayoutDashboard, PhoneCall, CalendarDays, Target,
  Building2, TrendingUp, Bell, Settings, LogIn,
} from 'lucide-react';

export function AppNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/tracker', label: 'Daily Tracker', Icon: PhoneCall },
    { href: '/weekly-tracker', label: 'Weekly Tracker', Icon: CalendarDays },
    { href: '/daily-leads', label: 'Daily Leads', Icon: Target },
    { href: '/metadata', label: 'Metadata DB', Icon: Building2 },
    { href: '/reports', label: 'Reports & BI', Icon: TrendingUp },
    { href: '/notifications', label: 'Alerts', Icon: Bell },
    { href: '/settings', label: 'Settings', Icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 border-b border-border/90 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

        {/* ── Official Infoziant Brand Logo & Season Badge ─────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          <InfoziantLogo size="sm" showSubtitle={true} />

          <span className="hidden 2xl:inline-block text-micro bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 rounded-full font-mono font-semibold">
            2025–26 Season
          </span>
        </div>

        {/* ── Desktop Navigation Links (Light Theme) ──────────────────────── */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap select-none
                  ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-fg-muted hover:text-primary hover:bg-surface-sunken'
                  }`}
              >
                <item.Icon size={16} strokeWidth={2} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Right Actions: Bell + User Chip + Login Button ───────────────── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Notification Bell Dropdown */}
          <NotificationBellDropdown />

          {/* User Presence Chip */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-8 h-8 rounded-xl bg-primary-subtle border border-primary-subtle flex items-center justify-center text-xs font-bold text-primary">
              M
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-fg leading-tight">A.Mohanaradha</div>
              <div className="text-micro text-success flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                Online (Admin)
              </div>
            </div>
          </div>

          {/* Direct Sign In / Login Button Link */}
          <Link
            href="/login"
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground text-micro font-semibold rounded-control transition-colors shadow-1 flex items-center gap-1.5 ml-1"
          >
            <LogIn size={14} strokeWidth={2} aria-hidden />
            <span>Sign In</span>
          </Link>

        </div>

      </div>

      {/* ── Mobile Horizontal Scroll Navigation Bar ──────────────────────── */}
      <div className="lg:hidden flex items-center gap-1 px-4 py-2 border-t border-border overflow-x-auto bg-background/90">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-micro font-bold whitespace-nowrap transition-colors
                ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-fg-muted hover:text-primary hover:bg-surface-sunken/60'
                }`}
            >
              <item.Icon size={14} strokeWidth={2} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
