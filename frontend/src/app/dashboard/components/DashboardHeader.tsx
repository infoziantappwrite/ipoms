'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Calendar,
  PhoneCall,
  ArrowRight,
  Sparkles,
  HelpCircle,
  type LucideIcon
} from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { DashboardAmbientScene } from '@/components/dashboard/DashboardAmbientScene';
import { triggerHaptic } from '@/lib/haptics';
import { readSessionUser, roleOf, updateSessionUser, type SessionUser } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { initialsFor } from '@/lib/initials';

export type DashboardRole = 'coordinator' | 'team_leader' | 'admin';

type GreetingPeriod =
  | 'midnight'
  | 'wee_hours'
  | 'dawn'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'early_evening'
  | 'dusk'
  | 'evening'
  | 'night';

const PERIOD_ICON: Record<GreetingPeriod, LucideIcon> = {
  midnight: Moon,
  wee_hours: Moon,
  dawn: Sunrise,
  morning: Sunrise,
  midday: Sun,
  afternoon: Sun,
  early_evening: Sunset,
  dusk: Sunset,
  evening: Sunset,
  night: Moon,
};


const MOTIVATIONAL_QUOTES = [
  'Every positive response brings our students closer to 100% placement success.',
  'Your persistent corporate outreach today builds high-impact career pathways for tomorrow.',
  'Focus on quality corporate engagements — meaningful conversations yield marquee campus drives.',
  'Relentless daily tracking transforms regional talent into premier corporate offers.',
  'Speed, precision, and proactive relationship building define placement excellence.',
  'Every corporate partnership forged opens doors of opportunity for hundreds of graduates.',
  'Excellence in outreach is powered by consistent execution and unshakeable momentum.',
];

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLocalTimeGreeting(): { greeting: string; period: GreetingPeriod } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { greeting: 'Good Morning', period: 'morning' };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: 'Good Afternoon', period: 'afternoon' };
  } else if (hour >= 17 && hour < 20) {
    return { greeting: 'Good Evening', period: 'evening' };
  } else {
    // 8:00 PM (20:00) onwards and late night
    return { greeting: 'Good Night', period: 'night' };
  }
}

export function DashboardHeader() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [greetingData, setGreetingData] = useState<{
    greeting: string;
    period: GreetingPeriod;
  }>(getLocalTimeGreeting);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Keyboard shortcut: Press '?' or 'Shift + /' to open FAQs in a new tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (!isInput && e.key === '?') {
        e.preventDefault();
        triggerHaptic('selection');
        window.open('/faq', '_blank', 'noopener,noreferrer');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Time-of-day greeting updater & 30-Second quote auto-rotator
  useEffect(() => {
    const updateTime = () => setGreetingData(getLocalTimeGreeting());
    updateTime();
    const timeInterval = setInterval(updateTime, 30000);

    const quoteInterval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
        setIsFading(false);
      }, 500);
    }, 30000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(quoteInterval);
    };
  }, []);

  const currentQuote = MOTIVATIONAL_QUOTES[quoteIndex] || MOTIVATIONAL_QUOTES[0];

  useEffect(() => {
    const refreshProfile = async () => {
      const u = readSessionUser();
      if (u) {
        setUser(u);
        const uid = u._id || (u as any).userId;
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

    refreshProfile();

    // Re-evaluate greeting dynamically
    setGreetingData(getLocalTimeGreeting());

    // Profile photo sync event listener
    const handleUserUpdated = (e: CustomEvent<SessionUser>) => {
      if (e.detail) {
        setUser(e.detail);
      }
    };

    const handleStorageChange = () => {
      const u = readSessionUser();
      if (u) setUser(u);
    };

    window.addEventListener('ipoms_user_updated', handleUserUpdated as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('ipoms_user_updated', handleUserUpdated as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const period: GreetingPeriod = (greetingData?.period && PERIOD_ICON[greetingData.period])
    ? greetingData.period
    : 'morning';
  const PeriodIcon = PERIOD_ICON[period] || Sun;

  const fullName = user?.full_name || 'Placement Coordinator';
  const initials = initialsFor(fullName);

  // Format today's date
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const isNight =
    period === 'evening' ||
    period === 'night' ||
    period === 'midnight' ||
    period === 'wee_hours' ||
    period === 'dusk' ||
    period === 'early_evening';

  return (
    <header
      className={`w-full relative overflow-hidden select-none border-b transition-colors duration-700 min-h-[5cm] flex items-center ${
        isNight
          ? 'bg-gradient-to-r from-white via-slate-100/95 via-30% via-slate-300/80 via-60% to-[#0b1329] text-slate-900 dark:from-[#060c1c] dark:via-[#0c1630] dark:to-[#070e24] dark:text-white border-border dark:border-indigo-950/80 shadow-md'
          : 'bg-gradient-to-b from-surface via-surface to-background text-fg border-border shadow-xs'
      }`}
    >
      {/* ── Ambient Dynamic Sky Animation (Day: Sun + Clouds + Birds | Night: Full Moon + Twinkling Stars + Cosmic Nebula) ── */}
      <DashboardAmbientScene />

      {/* ── Foreground Content Container (Compact 5cm Height) ── */}
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-6 py-3.5 relative z-10 flex flex-col justify-between min-h-[5cm] gap-2.5">
        {/* ── TOP BAR: Compact Greeting Badge + Controls ── */}
        <div className="flex items-center justify-between gap-3">
          {/* Greeting Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-2xs transition-colors ${
              isNight
                ? 'bg-white/85 dark:bg-white/10 border-slate-200 dark:border-white/20 text-slate-800 dark:text-amber-300 backdrop-blur-md shadow-xs'
                : 'bg-surface-sunken border-border text-fg'
            }`}
          >
            <PeriodIcon size={14} className="text-amber-500 dark:text-amber-400 shrink-0" />
            <span>{toTitleCase(greetingData?.greeting ?? `Good ${period}`)}</span>
          </div>

          {/* Top-Right Action Controls */}
          <div className="flex items-center gap-2">
            <Link
              href="/faq"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerHaptic('light')}
              title="Frequently Asked Questions & Guides (Opens in a new tab • Press ?)"
              aria-label="Frequently Asked Questions & Guides"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs border select-none group ${
                isNight
                  ? 'bg-white/85 dark:bg-white/10 border-slate-200 dark:border-white/20 text-slate-700 dark:text-slate-200 hover:text-primary hover:bg-white dark:hover:bg-white/20 backdrop-blur-md'
                  : 'bg-surface hover:bg-surface-raised border-border text-fg-subtle hover:text-primary'
              }`}
            >
              <HelpCircle size={15} strokeWidth={2.2} className="group-hover:scale-110 transition-transform duration-200" />
            </Link>

            <UserSignOutButton
              className={
                isNight
                  ? 'bg-white/85 dark:bg-white/10 border-slate-200 dark:border-white/20 text-rose-500 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/20 backdrop-blur-md'
                  : ''
              }
            />
          </div>
        </div>

        {/* ── CENTER HERO: Profile Card + Compact Headline, Quote & Actions ── */}
        <div className="flex items-center gap-4 sm:gap-6 flex-1">
          {/* Profile Photo Card */}
          <Link
            href="/settings"
            title="Click to view or edit photo in Settings"
            className={`relative block w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border shadow-sm group shrink-0 transition-all duration-300 cursor-pointer ${
              isNight
                ? 'bg-white/95 dark:bg-[#0e1938] border-slate-200 dark:border-indigo-500/40 shadow-md dark:shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10 hover:shadow-primary/20 hover:border-primary/50'
                : 'bg-surface border-border hover:shadow-primary/20 hover:border-primary/50'
            }`}
          >
            {user?.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt={fullName}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center font-display font-black text-2xl sm:text-3xl group-hover:scale-105 transition-transform duration-300 ${
                  isNight
                    ? 'bg-primary-subtle text-primary dark:bg-gradient-to-br dark:from-[#162752] dark:to-[#0c1630] dark:text-sky-300 dark:drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]'
                    : 'bg-primary-subtle text-primary'
                }`}
              >
                {initials}
              </div>
            )}
          </Link>

          {/* Headline, Quote & Action Row */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <h1
              className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight font-display leading-tight truncate ${
                isNight
                  ? 'text-slate-900 dark:text-white dark:drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]'
                  : 'text-fg'
              }`}
            >
              Welcome To iPOMS
            </h1>

            {/* Motivational Line (Smooth Auto-Fade) */}
            <p
              className={`text-xs sm:text-sm max-w-2xl font-medium truncate transition-all duration-700 ${
                isNight ? 'text-slate-700 dark:text-slate-200' : 'text-fg-muted'
              } ${isFading ? 'opacity-0 translate-y-0.5' : 'opacity-100 translate-y-0'}`}
            >
              {currentQuote}
            </p>

            {/* Action Bar: Date Pill + Launch Tracker Shortcut */}
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold shadow-2xs transition-colors text-[11px] sm:text-xs ${
                  isNight
                    ? 'bg-white/85 dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 backdrop-blur-md'
                    : 'bg-surface-sunken border border-border text-fg-muted'
                }`}
              >
                <Calendar size={13} className={isNight ? 'text-primary dark:text-amber-400' : 'text-primary'} />
                <span>Today • {todayFormatted}</span>
              </div>

              <Link
                href="/tracker"
                className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] sm:text-xs font-bold shadow-xs transition-all hover:scale-105 active:scale-[0.992] cursor-pointer"
              >
                <PhoneCall size={12} />
                <span>Launch Daily Tracker</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
