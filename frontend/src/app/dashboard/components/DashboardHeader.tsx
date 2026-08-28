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
  type LucideIcon
} from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { DashboardAmbientScene } from '@/components/dashboard/DashboardAmbientScene';
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
  evening: Moon,
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
      className={`w-full relative overflow-hidden select-none border-b transition-colors duration-700 ${
        isNight
          ? 'bg-gradient-to-r from-white via-slate-100/95 via-30% via-slate-300/80 via-60% to-[#0b1329] text-slate-900 dark:from-[#060c1c] dark:via-[#0c1630] dark:to-[#070e24] dark:text-white border-border dark:border-indigo-950/80 shadow-md'
          : 'bg-gradient-to-b from-surface via-surface to-background text-fg border-border shadow-xs'
      }`}
    >
      {/* ── Ambient Dynamic Sky Animation (Day: Sun + Clouds + Birds | Night: Full Moon + Twinkling Stars + Cosmic Nebula) ── */}
      <DashboardAmbientScene />

      {/* ── Foreground Content Container ── */}
      <div className="w-full max-w-7xl mx-auto px-6 py-8 sm:py-10 space-y-8 relative z-10">
        {/* ── TOP BAR: Greeting Badge + Notifications & Sign Out ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Greeting Badge */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-bold shadow-2xs transition-colors ${
              isNight
                ? 'bg-white/85 dark:bg-white/10 border-slate-200 dark:border-white/20 text-slate-800 dark:text-amber-300 backdrop-blur-md shadow-xs'
                : 'bg-surface-sunken border-border text-fg'
            }`}
          >
            <PeriodIcon size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
            <span>{toTitleCase(greetingData?.greeting ?? `Good ${period}`)}</span>
          </div>

          {/* Top-Right Sign Out */}
          <div>
            <UserSignOutButton
              className={
                isNight
                  ? 'bg-white/85 dark:bg-white/10 border-slate-200 dark:border-white/20 text-rose-500 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/20 backdrop-blur-md'
                  : ''
              }
            />
          </div>
        </div>

        {/* ── CENTER HERO: Profile Identity Card + Headline & Motivation ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-center">
          {/* [1/4 Column]: Clean Profile Photo Card */}
          <div className="lg:col-span-1 flex justify-center lg:justify-start">
            <Link
              href="/settings"
              title="Click to view or edit photo in Settings"
              className={`relative block w-48 h-48 sm:w-56 sm:h-56 lg:w-60 lg:h-60 rounded-3xl overflow-hidden border shadow-md group transition-all duration-300 cursor-pointer ${
                isNight
                  ? 'bg-white/95 dark:bg-[#0e1938] border-slate-200 dark:border-indigo-500/40 shadow-lg dark:shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 hover:shadow-primary/20 hover:border-primary/50'
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
                  className={`w-full h-full flex items-center justify-center font-display font-black text-5xl group-hover:scale-105 transition-transform duration-300 ${
                    isNight
                      ? 'bg-primary-subtle text-primary dark:bg-gradient-to-br dark:from-[#162752] dark:to-[#0c1630] dark:text-sky-300 dark:drop-shadow-[0_0_25px_rgba(56,189,248,0.4)]'
                      : 'bg-primary-subtle text-primary'
                  }`}
                >
                  {initials}
                </div>
              )}
            </Link>
          </div>

          {/* [3/4 Column]: Headline & 30-Second Motivational Sentence */}
          <div className="lg:col-span-3 space-y-3.5 text-left">
            {/* Main Headline */}
            <h1
              className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight font-display ${
                isNight
                  ? 'text-slate-900 dark:text-white dark:drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)]'
                  : 'text-fg'
              }`}
            >
              Welcome To iPOMS
            </h1>

            {/* Motivational Line (Smooth 30s Auto-Fade) */}
            <div className="min-h-[48px] flex items-center">
              <p
                className={`text-sm sm:text-base max-w-3xl leading-relaxed font-medium transition-all duration-700 ${
                  isNight ? 'text-slate-700 dark:text-slate-200' : 'text-fg-muted'
                } ${isFading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
              >
                {currentQuote}
              </p>
            </div>

            {/* Action Bar: Date Pill + Launch Tracker Shortcut */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs sm:text-sm">
              <div
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold shadow-2xs transition-colors ${
                  isNight
                    ? 'bg-white/85 dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 backdrop-blur-md'
                    : 'bg-surface-sunken border border-border text-fg-muted'
                }`}
              >
                <Calendar size={14} className={isNight ? 'text-primary dark:text-amber-400' : 'text-primary'} />
                <span>Today • {todayFormatted}</span>
              </div>

              <Link
                href="/tracker"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-sm shadow-primary/20 transition-all hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-primary/20"
              >
                <PhoneCall size={14} />
                <span>Launch Daily Tracker</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
