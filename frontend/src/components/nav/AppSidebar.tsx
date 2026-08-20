'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, PhoneCall, CalendarDays, Target, Building2,
  TrendingUp, Bell, Settings, PanelLeftClose, X,
} from 'lucide-react';

import { InfoziantMark } from '@/components/InfoziantMark';
import { RailTooltip } from './RailTooltip';
import { initialsFor } from '@/lib/initials';
import {
  readSessionUser, roleOf, ROLE_LABEL,
  NAV_INTRO_KEY, NAV_COLLAPSED_KEY,
  type SessionUser, type RoleKey,
} from '@/lib/session';

/** How long the drawer stays open after sign-in before settling to the rail. */
const INTRO_HOLD_MS = 5000;

const NAV = [
  { href: '/dashboard',      label: 'Dashboard',      Icon: LayoutDashboard },
  { href: '/tracker',        label: 'Daily Tracker',  Icon: PhoneCall },
  { href: '/weekly-tracker', label: 'Weekly Tracker', Icon: CalendarDays },
  { href: '/daily-leads',    label: 'Daily Leads',    Icon: Target },
  { href: '/metadata',       label: 'Metadata DB',    Icon: Building2 },
  { href: '/reports',        label: 'Reports & BI',   Icon: TrendingUp },
  { href: '/notifications',  label: 'Alerts',         Icon: Bell },
  { href: '/settings',       label: 'Settings',       Icon: Settings, roles: ['admin', 'team_leader'] as RoleKey[] },
];

interface Props {
  /** Open state of the off-canvas drawer on small screens. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ mobileOpen, onMobileClose }: Props) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [roster, setRoster] = useState<string[]>([]);
  const [hovered, setHovered] = useState<HTMLElement | null>(null);
  const [hoverLabel, setHoverLabel] = useState('');

  const introScheduled = useRef(false);
  const introCancelled = useRef(false);

  /** Ends the intro early and consumes the flag so a reload does not replay it. */
  const cancelIntro = useCallback(() => {
    introCancelled.current = true;
    try { window.sessionStorage.setItem(NAV_INTRO_KEY, 'done'); } catch { /* ignore */ }
  }, []);

  // Restoring state and scheduling the intro have different idempotency needs,
  // so they are guarded differently. StrictMode double-invokes this effect and
  // resets state between the two passes, so the restore must run on every pass
  // or a rail-preferring user gets an expanded drawer. The intro timer must NOT
  // run twice, so a ref guards it — and it is not cleared on teardown, since
  // clearing on StrictMode's simulated unmount would cancel the only timer the
  // guarded second pass declines to reschedule.
  useEffect(() => {
    setUser(readSessionUser());

    if (window.sessionStorage.getItem(NAV_INTRO_KEY) === 'pending') {
      setCollapsed(false);
      if (!introScheduled.current) {
        introScheduled.current = true;
        setTimeout(() => {
          if (introCancelled.current) return;
          setCollapsed(true);
          try { window.sessionStorage.setItem(NAV_INTRO_KEY, 'done'); } catch { /* ignore */ }
        }, INTRO_HOLD_MS);
      }
    } else {
      setCollapsed(window.localStorage.getItem(NAV_COLLAPSED_KEY) === '1');
    }

    // Transitions stay off until after the width correction above has painted,
    // so a returning user does not watch the drawer animate shut on every hard
    // reload. Not cancelled on teardown: StrictMode's simulated unmount would
    // otherwise leave transitions permanently disabled.
    setTimeout(() => setMounted(true), 60);
  }, []);

  // Roster is only needed to disambiguate avatar initials (MO vs MU).
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    fetch(`${API}/users`)
      .then((r) => r.json())
      .then((d) => {
        const names = d?.data?.users?.map((u: any) => u.full_name).filter(Boolean);
        if (Array.isArray(names)) setRoster(names);
      })
      .catch(() => { /* initials fall back to the 2-letter default */ });
  }, []);

  /** Manual toggle always wins over the intro timer. */
  const toggle = useCallback(() => {
    cancelIntro();
    setCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(NAV_COLLAPSED_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, [cancelIntro]);

  // Close the off-canvas drawer on route change.
  useEffect(() => { onMobileClose(); }, [pathname, onMobileClose]);

  // Escape closes the off-canvas drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onMobileClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  const role = roleOf(user);
  const name = user?.full_name ?? 'Signed in';
  const initials = initialsFor(name, roster);
  const items = NAV.filter((i) => !i.roles || i.roles.includes(role));

  const showLabel = (el: HTMLElement | null, label: string) => {
    if (!collapsed) return;
    setHovered(el);
    setHoverLabel(label);
  };

  return (
    <>
      {/* Scrim — off-canvas only. */}
      <div
        onClick={onMobileClose}
        aria-hidden
        className={`fixed inset-0 z-overlay bg-overlay/50 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        } ${mounted ? 'transition-opacity duration-200' : ''}`}
      />

      {/* min-w-0 is load-bearing: at lg the drawer is a flex child, and a flex
          item's default min-width:auto floors it at the widest nav label's
          min-content width, silently overriding the collapsed width. */}
      <aside
        aria-label="Primary"
        data-collapsed={collapsed || undefined}
        style={{ '--nav-w': collapsed ? '4.75rem' : '16.5rem' } as React.CSSProperties}
        className={`group/nav fixed inset-y-0 left-0 z-overlay flex min-w-0 shrink-0 flex-col overflow-hidden
          w-[16.5rem] lg:w-[var(--nav-w)]
          border-r border-border bg-surface shadow-2
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${mounted ? 'transition-[width,transform] duration-300 ease-nav motion-reduce:transition-none' : ''}`}
      >
        {/* ── Brand ─────────────────────────────────────────────────────── */}
        <div className="flex h-header shrink-0 items-center gap-3 px-[18px]">
          <Link
            href="/dashboard"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-control"
            aria-label="iPOMS home"
          >
            <InfoziantMark size={34} />
          </Link>

          <div className={`min-w-0 ${mounted ? 'transition-opacity duration-200' : ''} ${collapsed ? 'opacity-100 lg:opacity-0' : 'opacity-100'}`}>
            <div className="whitespace-nowrap text-title font-bold leading-none tracking-tight text-fg">iPOMS</div>
            <div className="mt-1 whitespace-nowrap text-micro text-fg-subtle">Placement Operations</div>
          </div>

          {/* Close — off-canvas only. */}
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-control border border-border bg-surface text-fg-muted shadow-1 transition-[box-shadow,color] hover:text-fg active:shadow-inset-1 lg:hidden"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {/* ── Collapse toggle ───────────────────────────────────────────────
            Its own row rather than sharing the brand row: at the 76px rail
            there is no horizontal space beside the 40px mark, so a right-edge
            button would sit on top of the logo. Reserving the row in both
            states also means the nav items below never shift vertically when
            the drawer collapses. */}
        <div className={`hidden shrink-0 px-[18px] pb-2 lg:flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className="grid h-7 w-7 place-items-center rounded-full border border-border bg-surface
              text-fg-subtle shadow-1 transition-[box-shadow,color] duration-200
              hover:text-primary active:shadow-inset-1"
          >
            <PanelLeftClose
              size={15}
              strokeWidth={2}
              aria-hidden
              className={`transition-transform duration-300 ease-nav motion-reduce:transition-none ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* ── Nav ───────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-[18px] py-2">
          <ul className="space-y-1">
            {items.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    onMouseEnter={(e) => showLabel(e.currentTarget, label)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={(e) => showLabel(e.currentTarget, label)}
                    onBlur={() => setHovered(null)}
                    className={`flex items-center gap-3 rounded-control
                      ${mounted ? 'transition-[background-color,box-shadow,color] duration-200' : ''}
                      ${active
                        ? 'bg-primary text-primary-foreground shadow-1'
                        : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'}`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center">
                      <Icon size={19} strokeWidth={2} aria-hidden />
                    </span>
                    <span
                      className={`whitespace-nowrap text-body font-semibold
                        ${mounted ? 'transition-opacity duration-200' : ''}
                        ${collapsed ? 'opacity-100 lg:opacity-0' : 'opacity-100'}`}
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Signed-in identity ────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border px-[18px] py-3">
          <div
            className="flex items-center gap-3"
            onMouseEnter={(e) => showLabel(e.currentTarget, `${name} · Online`)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-control border border-primary-subtle bg-primary-subtle text-body font-bold tracking-tight text-primary">
              {initials}
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-success"
              />
            </span>

            <div className={`min-w-0 ${mounted ? 'transition-opacity duration-200' : ''} ${collapsed ? 'opacity-100 lg:opacity-0' : 'opacity-100'}`}>
              <div className="truncate whitespace-nowrap text-body font-semibold leading-tight text-fg">{name}</div>
              <div className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-micro font-medium text-success">
                Online
                <span className="text-fg-subtle">· {ROLE_LABEL[role]}</span>
              </div>
            </div>
          </div>
        </div>

      </aside>

      {collapsed && hovered && <RailTooltip label={hoverLabel} anchor={hovered} />}
    </>
  );
}
