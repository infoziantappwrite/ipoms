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
import { NotificationBellDropdown } from '@/components/NotificationBellDropdown';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { readSessionUser, roleOf, type SessionUser } from '@/lib/session';
import { apiFetch } from '@/lib/api';

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

const PERIOD_EMOJI: Record<GreetingPeriod, string> = {
  midnight: '🌙',
  wee_hours: '✨',
  dawn: '🌅',
  morning: '☀️',
  midday: '☀️',
  afternoon: '🌤️',
  early_evening: '🌇',
  dusk: '🌆',
  evening: '🌙',
  night: '🌙',
};

// Curated 30-second motivational quotes for placement coordinators
const MOTIVATIONAL_QUOTES: { quote: string }[] = [
  { quote: 'Connecting ambitious graduates with world-class career opportunities every day.' },
  { quote: 'Your dedication turns placement aspirations into real-world corporate success.' },
  { quote: 'Every recruiter connected brings us closer to 100% student placement.' },
  { quote: 'Empowering students to achieve their dreams with purposeful corporate outreach.' },
  { quote: 'Consistency in corporate relationships builds lifelong placement partnerships.' },
  { quote: 'Turning ambition into achievement through strategic placement coordination.' },
  { quote: 'Bridging the gap between premier talent and industry leaders.' },
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
  } else if (hour >= 17 && hour < 21) {
    return { greeting: 'Good Evening', period: 'evening' };
  } else {
    return { greeting: 'Good Evening', period: 'night' };
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

  // 30-Second quote auto-rotator
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
        setIsFading(false);
      }, 500);
    }, 30000);

    return () => clearInterval(quoteInterval);
  }, []);

  const currentQuote = MOTIVATIONAL_QUOTES[quoteIndex] || MOTIVATIONAL_QUOTES[0];

  useEffect(() => {
    const refreshProfile = () => {
      const u = readSessionUser();
      setUser(u);
    };

    refreshProfile();

    // Re-evaluate greeting dynamically
    setGreetingData(getLocalTimeGreeting());

    // Profile photo sync event listener
    const handleUserUpdated = (e: CustomEvent<SessionUser>) => {
      if (e.detail) {
        setUser(e.detail);
      } else {
        refreshProfile();
      }
    };

    window.addEventListener('ipoms_user_updated', handleUserUpdated as EventListener);
    window.addEventListener('storage', refreshProfile);

    return () => {
      window.removeEventListener('ipoms_user_updated', handleUserUpdated as EventListener);
      window.removeEventListener('storage', refreshProfile);
    };
  }, []);

  const period: GreetingPeriod = (greetingData?.period && PERIOD_ICON[greetingData.period])
    ? greetingData.period
    : 'morning';
  const PeriodIcon = PERIOD_ICON[period] || Sun;
  const periodEmoji = PERIOD_EMOJI[period] || '☀️';

  const fullName = user?.full_name || 'Placement Coordinator';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'PC';

  // Format today's date
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="w-full bg-gradient-to-b from-surface via-surface to-background text-fg border-b border-border shadow-xs relative overflow-hidden select-none">
      
      {/* ── Foreground Content Container ── */}
      <div className="w-full max-w-7xl mx-auto px-6 py-8 sm:py-10 space-y-8">
        
        {/* ── TOP BAR: Greeting Badge + Notifications & Sign Out ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          
          {/* Greeting Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-sunken border border-border text-fg text-xs sm:text-sm font-bold shadow-2xs">
            <PeriodIcon size={16} className="text-amber-500 shrink-0" />
            <span>{toTitleCase(greetingData?.greeting ?? `Good ${period}`)} {periodEmoji}</span>
          </div>

          {/* Top-Right Notification Bell & Sign Out */}
          <div className="flex items-center gap-3">
            <NotificationBellDropdown />
            <UserSignOutButton />
          </div>

        </div>

        {/* ── CENTER HERO: Profile Identity Card + Headline & Motivation ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-center">
          
          {/* [1/4 Column]: Clean Profile Photo Card */}
          <div className="lg:col-span-1 flex justify-center lg:justify-start">
            <Link
              href="/settings"
              title="Click to view or edit photo in Settings"
              className="relative block w-48 h-48 sm:w-56 sm:h-56 lg:w-60 lg:h-60 rounded-3xl overflow-hidden border border-border shadow-md bg-surface group transition-all duration-300 hover:shadow-primary/20 hover:border-primary/50 cursor-pointer"
            >
              {user?.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={fullName}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-primary-subtle flex items-center justify-center text-primary font-display font-black text-5xl group-hover:scale-105 transition-transform duration-300">
                  {initials}
                </div>
              )}
            </Link>
          </div>

          {/* [3/4 Column]: Headline & 30-Second Motivational Sentence */}
          <div className="lg:col-span-3 space-y-3.5 text-left">
            
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-fg font-display">
              Welcome To iPOMS
            </h1>

            {/* Motivational Line (Smooth 30s Auto-Fade) */}
            <div className="min-h-[48px] flex items-center">
              <p
                className={`text-sm sm:text-base text-fg-muted max-w-3xl leading-relaxed font-medium transition-all duration-700 ${
                  isFading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                }`}
              >
                {currentQuote.quote}
              </p>
            </div>

            {/* Action Bar: Date Pill + Launch Tracker Shortcut */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-sunken border border-border text-fg-muted font-bold shadow-2xs">
                <Calendar size={14} className="text-primary" />
                <span>Today • {todayFormatted}</span>
              </div>

              <Link
                href="/tracker"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-sm shadow-primary/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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
