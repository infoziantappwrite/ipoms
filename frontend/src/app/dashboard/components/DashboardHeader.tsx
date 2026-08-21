'use client';

import { Moon, Sun, Sunrise, Sunset, type LucideIcon } from 'lucide-react';
import { NotificationBellDropdown } from '@/components/NotificationBellDropdown';
import { UserSignOutButton } from '@/components/UserSignOutButton';

export type DashboardRole = 'coordinator' | 'team_leader' | 'admin';

type GreetingPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Drawn icons at one stroke weight, keyed off the server's `period` token.
 * The greeting never ships an emoji glyph: emoji render in whatever the OS
 * emoji font decides, which is a different visual language from the lucide set
 * every other icon on this surface is drawn in.
 */
const PERIOD_ICON: Record<GreetingPeriod, LucideIcon> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
};

interface Props {
  greetingData?: {
    greeting: string;
    period?: GreetingPeriod;
    subtext: string;
  };
  /** Call progress for the day rail. Omitted until the payload lands. */
  callsCompleted?: number;
  callsTarget?: number;
}

export function DashboardHeader({ greetingData, callsCompleted, callsTarget }: Props) {
  const period = greetingData?.period ?? 'morning';
  const PeriodIcon = PERIOD_ICON[period];

  const target = callsTarget ?? 0;
  const done = callsCompleted ?? 0;
  const hasRail = target > 0;
  const pct = hasRail ? Math.min(100, Math.round((done / target) * 100)) : 0;

  return (
    <header className="shrink-0 border-b border-border bg-surface px-6 py-5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-panel border border-border bg-surface-sunken text-primary shadow-inset-1"
          >
            <PeriodIcon size={20} strokeWidth={2} />
          </span>

          <div className="min-w-0">
            <h1 className="truncate text-display font-bold tracking-tight text-fg">
              {greetingData?.greeting ?? 'Welcome to iPOMS'}
            </h1>
            <p className="mt-0.5 truncate text-micro text-fg-subtle">
              {greetingData?.subtext ?? 'Placement operations command centre'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Day rail — the one number a coordinator is measured on, always in
              the chrome so it survives scrolling past the funnel. */}
          {hasRail && (
            <div className="hidden w-44 sm:block">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-micro font-semibold uppercase tracking-wide text-fg-subtle">
                  Call target
                </span>
                <span className="text-micro font-bold tabular-nums text-fg">
                  {done}
                  <span className="text-fg-subtle">/{target}</span>
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={done}
                aria-valuemin={0}
                aria-valuemax={target}
                aria-label={`Daily call target: ${done} of ${target} logged`}
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken shadow-inset-1"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700 ease-nav motion-reduce:transition-none"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <NotificationBellDropdown />
            <UserSignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
