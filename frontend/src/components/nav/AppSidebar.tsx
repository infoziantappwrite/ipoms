'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PhoneCall,
  CalendarDays,
  Target,
  Sparkles,
  ListTodo,
  Database,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  X,
} from 'lucide-react';

import { InfoziantMark } from '@/components/InfoziantMark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RailTooltip } from './RailTooltip';
import { initialsFor } from '@/lib/initials';
import {
  readSessionUser,
  roleOf,
  ROLE_LABEL,
  NAV_INTRO_KEY,
  NAV_COLLAPSED_KEY,
  type SessionUser,
  type RoleKey,
} from '@/lib/session';
import { isFocusLockedToday } from '@/lib/collegeSession';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api';
import { updateSessionUser } from '@/lib/session';
import { triggerHaptic } from '@/lib/haptics';

/** How long the drawer stays open after sign-in before settling to the rail. */
const INTRO_HOLD_MS = 5000;

interface NavItem {
  href: string;
  label: string;
  Icon: any;
  roles?: RoleKey[];
}

const NAV: NavItem[] = [
  { href: '/dashboard',      label: 'Dashboard',      Icon: LayoutDashboard },
  { href: '/tracker',        label: 'Daily Tracker',  Icon: PhoneCall },
  { href: '/weekly-tracker', label: 'Weekly Tracker', Icon: CalendarDays },
  { href: '/daily-leads',    label: 'Daily Leads',    Icon: Target },
  { href: '/active-leads',   label: 'Active Leads',   Icon: Sparkles },
  { href: '/pending-tasks',  label: 'Pending Task',   Icon: ListTodo },
  { href: '/metadata',       label: 'Metadata DB',    Icon: Database },
  { href: '/reports',        label: 'Report Builder', Icon: TrendingUp },
];

interface Props {
  /** Open state of the off-canvas drawer on small screens. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ mobileOpen, onMobileClose }: Props) {
  const pathname = usePathname();
  const { toast } = useToast();

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [roster, setRoster] = useState<string[]>([]);
  const [hovered, setHovered] = useState<HTMLElement | null>(null);
  const [hoverLabel, setHoverLabel] = useState('');
  const [isFocusLocked, setIsFocusLocked] = useState<boolean>(true);

  const introScheduled = useRef(false);
  const introCancelled = useRef(false);

  // Sync focus lock state on global focus change
  useEffect(() => {
    const handleFocusChange = () => {
      setIsFocusLocked(isFocusLockedToday());
    };
    window.addEventListener('ipoms_focus_updated' as any, handleFocusChange);
    return () => {
      window.removeEventListener('ipoms_focus_updated' as any, handleFocusChange);
    };
  }, []);

  /** Ends the intro early and consumes the flag so a reload does not replay it. */
  const cancelIntro = useCallback(() => {
    introCancelled.current = true;
    try {
      window.sessionStorage.setItem(NAV_INTRO_KEY, 'done');
    } catch {
      /* ignore */
    }
  }, []);

  // Hydrate user & saved collapsed preference, run intro on fresh sign-in
  useEffect(() => {
    setMounted(true);
    setIsFocusLocked(isFocusLockedToday());
    const u = readSessionUser();
    setUser(u);

    // Dynamic Live Profile Photo and Identity Listener
    const handleProfileUpdate = (e: CustomEvent<SessionUser>) => {
      if (e.detail) {
        setUser(e.detail);
      }
    };
    window.addEventListener('ipoms_profile_updated' as any, handleProfileUpdate as EventListener);

    // Initial silent refresh to ensure avatar is always up-to-date
    const uid = u?._id || (u as any)?.userId;
    if (uid) {
      apiFetch(`/profile/${uid}`).then((res) => {
        if (res.success && res.data) {
          updateSessionUser(res.data);
          setUser(res.data);
        }
      }).catch(() => {});
    }

    let isIntro = false;
    try {
      isIntro = window.sessionStorage.getItem(NAV_INTRO_KEY) === 'play';
    } catch {
      /* ignore */
    }

    if (isIntro) {
      setCollapsed(false);
      if (!introScheduled.current) {
        introScheduled.current = true;
        window.setTimeout(() => {
          if (!introCancelled.current) {
            setCollapsed(true);
            try {
              window.localStorage.setItem(NAV_COLLAPSED_KEY, '1');
              window.sessionStorage.setItem(NAV_INTRO_KEY, 'done');
            } catch {
              /* ignore */
            }
          }
        }, INTRO_HOLD_MS);
      }
    } else {
      try {
        const saved = window.localStorage.getItem(NAV_COLLAPSED_KEY);
        setCollapsed(saved === '1');
      } catch {
        /* ignore */
      }
    }

    return () => {
      window.removeEventListener('ipoms_profile_updated' as any, handleProfileUpdate as EventListener);
    };
  }, []);

  // Fetch assigned colleges for badge/roster tooltip
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch('/colleges');
        if (res.success && Array.isArray(res.data) && active) {
          setRoster(res.data.map((c: any) => c.college_name || c.college_code || ''));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef(false);

  const startAutoCloseTimer = (delay = 5000) => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      if (!isHoveringRef.current) {
        setCollapsed(true);
      }
    }, delay);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    cancelIntro();
    if (collapsed) {
      e.preventDefault();
      setCollapsed(false);
      startAutoCloseTimer(5000);
    }
  };

  const userRole = roleOf(user);
  const items = NAV.filter((item) => !item.roles || item.roles.includes(userRole));

  const roleLabel = ROLE_LABEL[userRole] ?? 'Staff';
  const fullName = user?.full_name ?? 'Coordinator';
  const email = user?.official_email ?? (user as any)?.email ?? '';

  const showLabel = (el: HTMLElement, label: string) => {
    if (collapsed) {
      setHovered(el);
      setHoverLabel(label);
    }
  };

  return (
    <>
      {/* ── Desktop Permanent Sidebar with Smart 5s Auto-Close ────────── */}
      <aside
        aria-label="Primary navigation"
        onMouseEnter={() => {
          isHoveringRef.current = true;
          if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
        }}
        onMouseLeave={() => {
          isHoveringRef.current = false;
          if (!collapsed) {
            startAutoCloseTimer(2500);
          }
        }}
        className={`hidden lg:flex flex-col bg-surface border-r border-border
          select-none z-50 shrink-0 sticky top-0 h-screen max-h-screen
          ${mounted ? 'transition-[width] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]' : ''}
          ${collapsed ? 'w-[72px]' : 'w-64'}`}
      >
        {/* ── Brand Header Strip ── */}
        <div className="h-20 flex items-center px-4 border-b border-border relative shrink-0 justify-between">
          {collapsed ? (
            <div className="w-full flex items-center justify-center py-2">
              <button
                type="button"
                onClick={handleLogoClick}
                className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-200/80 dark:border-white/20 flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform duration-300 cursor-pointer"
                title="Click to open Navigation Drawer"
              >
                <InfoziantMark size={34} />
              </button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between py-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 overflow-hidden focus-visible:outline-hidden"
              >
                <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-200/80 dark:border-white/20 flex items-center justify-center shrink-0">
                  <InfoziantMark size={34} />
                </div>
                <div
                  className={`flex flex-col min-w-0
                    ${mounted ? 'transition-opacity duration-400 ease-in-out' : ''}
                    ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                  <span className="text-body font-bold text-fg tracking-tight truncate leading-tight">
                    iPOMS
                  </span>
                  <span className="text-micro font-medium text-fg-subtle truncate uppercase tracking-wider">
                    Placement Suite
                  </span>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* ── Main Nav Items (Zero Scrollbar, Generous Top Breathing Room Below Brand Header) ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-7 pb-4 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <ul className="space-y-1.5">
            {items.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const isCoordinator = userRole === 'coordinator';
              const isLocked = mounted && href !== '/dashboard' && isCoordinator && !isFocusLocked;

              const handleNavClick = (e: React.MouseEvent) => {
                if (isLocked) {
                  e.preventDefault();
                  triggerHaptic('heavy');
                  toast(
                    'Please select 1 to 4 focus colleges on the Dashboard to unlock operational pages.',
                    'warning'
                  );
                  return;
                }
                // Blur active input to immediately trigger onBlur auto-save before route change
                if (typeof document !== 'undefined' && document.activeElement && 'blur' in document.activeElement) {
                  (document.activeElement as HTMLElement).blur();
                }
                triggerHaptic('light');

                // If collapsed, expand for 5s and then smoothly auto-close
                if (collapsed) {
                  setCollapsed(false);
                }
                startAutoCloseTimer(5000);
              };

              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={handleNavClick}
                    aria-current={active ? 'page' : undefined}
                    onMouseEnter={(e) => showLabel(e.currentTarget, isLocked ? `${label} (Locked)` : label)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={(e) => showLabel(e.currentTarget, isLocked ? `${label} (Locked)` : label)}
                    onBlur={() => setHovered(null)}
                    className={`group flex items-center gap-2.5 rounded-control cursor-pointer active:scale-[0.98] ${
                      mounted ? 'transition-[background-color,box-shadow,color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]' : ''
                    } ${
                      isLocked
                        ? 'text-fg-subtle/50 hover:bg-surface-sunken/60 hover:text-fg-subtle'
                        : active
                        ? 'bg-primary text-primary-foreground shadow-1'
                        : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
                    }`}
                  >
                    <span className="relative grid h-9 w-9 shrink-0 place-items-center">
                      <Icon size={18} strokeWidth={2} aria-hidden />
                      {isLocked && (
                        <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                          <Lock size={7} strokeWidth={2.5} />
                        </span>
                      )}
                    </span>
                    <span className="flex-1 flex items-center justify-between min-w-0 pr-2">
                      <span
                        className={`whitespace-nowrap text-xs font-semibold ${
                          mounted ? 'transition-opacity duration-300 ease-in-out' : ''
                        } ${collapsed ? 'opacity-100 lg:opacity-0' : 'opacity-100'}`}
                      >
                        {label}
                      </span>
                      {isLocked && !collapsed && (
                        <Lock size={12} className="text-amber-500/70 ml-2 shrink-0" />
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Signed-in Profile Identity Avatar & Theme Changer Toggle ───── */}
        <div className="shrink-0 border-t border-border px-3 py-2.5">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/settings?tab=profile"
                className="group relative flex items-center justify-center p-1 rounded-xl hover:bg-surface-sunken transition-colors"
                title={`${fullName} (${roleLabel})`}
              >
                {user?.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profile_photo_url}
                    alt={fullName}
                    className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-border shadow-xs group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20 shadow-xs group-hover:scale-105 transition-transform">
                    {initialsFor(fullName)}
                  </span>
                )}
              </Link>
              <ThemeToggle />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 p-1 rounded-xl bg-surface-sunken/60 border border-border/50">
              <Link
                href="/settings?tab=profile"
                className="flex items-center gap-2.5 min-w-0 flex-1 p-1 hover:bg-surface-raised rounded-lg transition-colors overflow-hidden"
              >
                {user?.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profile_photo_url}
                    alt={fullName}
                    className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-border shadow-xs"
                  />
                ) : (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20 shadow-xs">
                    {initialsFor(fullName)}
                  </span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-body font-bold text-fg truncate leading-tight">
                    {fullName}
                  </span>
                  <span className="text-micro font-medium text-fg-subtle truncate">
                    {roleLabel}
                  </span>
                </div>
              </Link>
              <div className="shrink-0">
                <ThemeToggle />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile Off-Canvas Drawer (Apple Gesture-driven Sheet) ──────────── */}
      <MobileDrawer
        isOpen={mobileOpen}
        onClose={onMobileClose}
        items={items}
        pathname={pathname}
        user={user}
        fullName={fullName}
        isFocusLocked={isFocusLocked}
        mounted={mounted}
      />

      {/* Rail Tooltip when collapsed */}
      {collapsed && hovered && <RailTooltip anchor={hovered} label={hoverLabel} />}
    </>
  );
}

function MobileDrawer({
  isOpen,
  onClose,
  items,
  pathname,
  user,
  fullName,
  isFocusLocked,
  mounted,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: NavItem[];
  pathname: string;
  user: SessionUser | null;
  fullName: string;
  isFocusLocked: boolean;
  mounted: boolean;
}) {
  const { toast } = useToast();
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const startXRef = useRef(0);
  const startTimeRef = useRef(0);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    triggerHaptic('light');
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragX(0);
    }, 200);
  }, [onClose]);

  const handleDragStart = (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    startTimeRef.current = Date.now();
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startXRef.current;
    if (diff < 0) {
      setDragX(diff);
    } else {
      // Rubber-band resistance if dragged further right
      setDragX(diff * 0.2);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const elapsed = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = Math.abs(dragX) / elapsed;

    if (dragX < -80 || velocity > 0.45) {
      handleClose();
    } else {
      setDragX(0);
    }
  };

  if (!isOpen) return null;

  const scrimOpacity = Math.max(0, 1 - Math.abs(dragX) / 260);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
        style={{ opacity: isClosing ? 0 : scrimOpacity }}
        onClick={handleClose}
      />
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        style={{
          transform: isDragging
            ? `translate3d(${dragX}px, 0, 0)`
            : isClosing
            ? 'translate3d(-100%, 0, 0)'
            : 'translate3d(0, 0, 0)',
          transition: isDragging
            ? 'none'
            : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="fixed inset-y-0 left-0 w-64 bg-surface border-r border-border flex flex-col z-50 shadow-4 touch-none select-none"
      >
        {/* Mobile Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="bg-white rounded-xl p-1 shadow-xs border border-slate-200/80 dark:border-white/20 flex items-center justify-center shrink-0">
              <InfoziantMark size={30} />
            </div>
            <div className="flex flex-col">
              <span className="text-body font-bold text-fg">iPOMS</span>
              <span className="text-micro text-fg-subtle uppercase">Placement Suite</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close navigation"
            className="w-8 h-8 rounded-control text-fg-subtle hover:bg-surface-sunken hover:text-fg flex items-center justify-center active:scale-90 transition-transform"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 pt-5 pb-3">
          <ul className="space-y-1">
            {items.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const isCoordinator = roleOf(user) === 'coordinator';
              const isLocked = mounted && href !== '/dashboard' && isCoordinator && !isFocusLocked;

              const handleClick = (e: React.MouseEvent) => {
                if (isLocked) {
                  e.preventDefault();
                  triggerHaptic('heavy');
                  toast(
                    'Please select 1 to 4 focus colleges on the Dashboard to unlock operational pages.',
                    'warning'
                  );
                  return;
                }
                // Blur active element to immediately trigger onBlur auto-save
                if (typeof document !== 'undefined' && document.activeElement && 'blur' in document.activeElement) {
                  (document.activeElement as HTMLElement).blur();
                }
                triggerHaptic('light');
                onClose();
              };

              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={handleClick}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-control font-semibold text-xs transition-all active:scale-[0.98] ${
                      isLocked
                        ? 'text-fg-subtle/50 hover:bg-surface-sunken/60 hover:text-fg-subtle'
                        : active
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span>{label}</span>
                    </div>
                    {isLocked && (
                      <Lock size={13} className="text-amber-500/80 shrink-0" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile Footer */}
        <div className="p-3 border-t border-border flex items-center justify-between gap-2 safe-bottom">
          <Link
            href="/settings?tab=profile"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 p-1 hover:bg-surface-sunken rounded-control transition-colors"
          >
            {user?.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profile_photo_url}
                alt={fullName}
                className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-border"
              />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                {initialsFor(fullName)}
              </span>
            )}
            <span className="text-xs font-bold text-fg truncate">{fullName}</span>
          </Link>

          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
