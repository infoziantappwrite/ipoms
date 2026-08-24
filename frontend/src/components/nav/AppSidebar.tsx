'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, PhoneCall, CalendarDays, Target, ListTodo, Database,
  FileSpreadsheet, MessageSquareText, PanelLeftClose, X,
} from 'lucide-react';

import { InfoziantMark } from '@/components/InfoziantMark';
import { RailTooltip } from './RailTooltip';
import { initialsFor } from '@/lib/initials';
import {
  readSessionUser, roleOf, ROLE_LABEL,
  NAV_INTRO_KEY, NAV_COLLAPSED_KEY,
  type SessionUser, type RoleKey,
} from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { subscribeChatEvent } from '@/lib/chatStream';
import { updateSessionUser } from '@/lib/session';

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
  { href: '/pending-tasks',  label: 'Pending Task',   Icon: ListTodo },
  { href: '/metadata',       label: 'Metadata DB',    Icon: Database },
  { href: '/reports',        label: 'Report Builder', Icon: FileSpreadsheet },
  { href: '/chat',           label: 'Chat',           Icon: MessageSquareText },
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
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const fetchChatUnread = useCallback(async () => {
    try {
      const u = readSessionUser();
      const uid = u?._id || (u as any)?.userId;
      const res = await apiFetch(`/chat/conversations${uid ? `?user_id=${uid}` : ''}`);
      if (res.success && Array.isArray(res.data)) {
        const total = res.data.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0);
        setChatUnreadCount(total);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchChatUnread();

    // Real-time badge updates via the shared chat SSE connection.
    const unsubscribe = subscribeChatEvent('new_message', (parsed) => {
      if (!parsed) {
        fetchChatUnread();
        return;
      }
      const msg = parsed.message;
      const myId = readSessionUser()?._id || (readSessionUser() as any)?.userId;
      if (!myId || String(msg.sender_id) !== String(myId)) {
        setChatUnreadCount((prev) => prev + 1);
        fetchChatUnread();
      }
    });

    const handleChatRead = () => {
      setChatUnreadCount(0);
      fetchChatUnread();
    };

    window.addEventListener('ipoms_chat_read', handleChatRead);
    // Fallback poll — catches anything missed if the SSE connection drops.
    const interval = setInterval(fetchChatUnread, 15000);

    return () => {
      unsubscribe();
      window.removeEventListener('ipoms_chat_read', handleChatRead);
      clearInterval(interval);
    };
  }, [fetchChatUnread]);

  // If user is actively viewing /chat, clear badge
  useEffect(() => {
    if (pathname === '/chat') {
      setChatUnreadCount(0);
    }
  }, [pathname]);

  const introScheduled = useRef(false);
  const introCancelled = useRef(false);

  /** Ends the intro early and consumes the flag so a reload does not replay it. */
  const cancelIntro = useCallback(() => {
    introCancelled.current = true;
    try { window.sessionStorage.setItem(NAV_INTRO_KEY, 'done'); } catch { /* ignore */ }
  }, []);

  // Sync user state from localStorage, live update events, and background database fetch
  useEffect(() => {
    const refreshUser = async () => {
      const session = readSessionUser();
      if (session) {
        setUser(session);
        const uid = session._id || (session as any).userId;
        if (uid) {
          try {
            const res = await apiFetch(`/profile/${uid}`);
            if (res.success && res.data) {
              updateSessionUser(res.data);
              setUser(res.data);
            }
          } catch { /* ignore */ }
        }
      }
    };

    refreshUser();

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

    setTimeout(() => setMounted(true), 60);

    // Live event listeners for immediate multi-screen synchronization
    const handleUserUpdated = (e: any) => {
      if (e.detail) {
        setUser(e.detail);
      }
    };

    const handleStorageChange = () => {
      const s = readSessionUser();
      if (s) setUser(s);
    };

    window.addEventListener('ipoms_user_updated', handleUserUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('ipoms_user_updated', handleUserUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Roster is only needed to disambiguate avatar initials (MO vs MU).
  useEffect(() => {
    apiFetch('/users')
      .then((d) => {
        const names = (d?.data as any)?.users?.map((u: any) => u.full_name).filter(Boolean);
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
  const isSettingsActive = pathname === '/settings' || pathname.startsWith('/settings/');

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

      <aside
        aria-label="Primary"
        data-collapsed={collapsed || undefined}
        style={{ '--nav-w': collapsed ? '4.75rem' : '16.5rem' } as React.CSSProperties}
        className={`group/nav fixed inset-y-0 left-0 z-overlay flex min-w-0 shrink-0 flex-col overflow-hidden print:hidden
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

        {/* ── Collapse toggle ─────────────────────────────────────────────── */}
        <div className={`hidden shrink-0 px-[18px] pb-2 lg:flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className="grid h-7 w-7 place-items-center rounded-full border border-border bg-surface
              text-fg-subtle shadow-1 transition-[box-shadow,color] duration-200
              hover:text-primary active:shadow-inset-1 cursor-pointer"
          >
            <PanelLeftClose
              size={15}
              strokeWidth={2}
              aria-hidden
              className={`transition-transform duration-300 ease-nav motion-reduce:transition-none ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* ── Main Nav Items ─────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-[18px] py-2">
          <ul className="space-y-1">
            {items.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const isChat = href === '/chat';
              const showBadge = isChat && chatUnreadCount > 0 && pathname !== '/chat';

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
                    <span className="relative grid h-10 w-10 shrink-0 place-items-center">
                      <Icon size={19} strokeWidth={2} aria-hidden />
                      {showBadge && collapsed && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs">
                          {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                        </span>
                      )}
                    </span>
                    <span className="flex-1 flex items-center justify-between min-w-0 pr-2">
                      <span
                        className={`whitespace-nowrap text-body font-semibold
                          ${mounted ? 'transition-opacity duration-200' : ''}
                          ${collapsed ? 'opacity-100 lg:opacity-0' : 'opacity-100'}`}
                      >
                        {label}
                      </span>
                      {showBadge && !collapsed && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-2xs">
                          {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Signed-in Profile Identity Avatar (Instant Photo Sync) ───── */}
        <div className="shrink-0 border-t border-border px-[14px] py-2.5">
          <Link
            href="/settings"
            className={`flex items-center gap-3 p-1 rounded-xl transition-all group/id cursor-pointer ${
              isSettingsActive
                ? 'bg-primary/10 border border-primary/25 shadow-xs'
                : 'hover:bg-surface-sunken border border-transparent'
            }`}
            onMouseEnter={(e) => showLabel(e.currentTarget, `${name} · View Profile`)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Avatar Badge: Renders real photo image if present, fallback to initials */}
            <div className="relative shrink-0">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl overflow-hidden text-body font-black tracking-tight transition-all ${
                  isSettingsActive
                    ? 'border border-primary ring-2 ring-primary/30 shadow-xs'
                    : 'border border-primary-subtle bg-primary-subtle text-primary group-hover/id:border-primary'
                }`}
              >
                {user?.profile_photo_url ? (
                  <img
                    src={user.profile_photo_url}
                    alt={name}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <span className="text-sm font-bold">{initials}</span>
                )}
              </span>

              {/* High-visibility vibrant green active presence light (unclipped & glowing) */}
              <span
                aria-hidden
                className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white border-2 border-white shadow-xs z-20 pointer-events-none"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1 ring-emerald-600/40 animate-pulse" />
              </span>
            </div>

            <div className={`min-w-0 ${mounted ? 'transition-opacity duration-200' : ''} ${collapsed ? 'opacity-100 lg:opacity-0' : 'opacity-100'}`}>
              <div className={`truncate whitespace-nowrap text-body font-bold leading-none transition-colors ${isSettingsActive ? 'text-primary' : 'text-fg group-hover/id:text-primary'}`}>
                {name}
              </div>
            </div>
          </Link>
        </div>

      </aside>

      {collapsed && hovered && <RailTooltip label={hoverLabel} anchor={hovered} />}
    </>
  );
}
