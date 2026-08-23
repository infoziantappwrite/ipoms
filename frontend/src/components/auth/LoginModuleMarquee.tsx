'use client';

import {
  LayoutDashboard, Phone, CalendarDays, Target, Database,
  TrendingUp, Bell, Settings, type LucideIcon,
} from 'lucide-react';

/**
 * Slow right-to-left marquee of the 8 operational modules, for the login
 * page's left panel. Two rows at different speeds so it reads as a single
 * layered glide rather than one flat scroll. White background throughout —
 * accents come only from each module's own categorical color (the same
 * ramp used in the sidebar), never a colored panel background, so nothing
 * competes with the Infoziant mark above it.
 */

interface ModuleChip {
  title: string;
  tag: string;
  Icon: LucideIcon;
  tone: string;
  tint: string;
}

const ROW_1: ModuleChip[] = [
  { title: 'Role-Based Dashboard', tag: 'Operational Hub', Icon: LayoutDashboard, tone: 'text-module-1', tint: 'bg-module-1/10' },
  { title: 'Daily Call Tracker', tag: 'Core Engine', Icon: Phone, tone: 'text-module-2', tint: 'bg-module-2/10' },
  { title: 'Weekly Tracker Lifecycle', tag: 'Pipeline CRM', Icon: CalendarDays, tone: 'text-module-3', tint: 'bg-module-3/10' },
  { title: 'Daily Leads Register', tag: 'High Intent', Icon: Target, tone: 'text-module-4', tint: 'bg-module-4/10' },
];

const ROW_2: ModuleChip[] = [
  { title: 'Master Company Metadata', tag: '3,550+ Records', Icon: Database, tone: 'text-module-5', tint: 'bg-module-5/10' },
  { title: 'Reports & Analytics Center', tag: 'BI & Presets', Icon: TrendingUp, tone: 'text-module-6', tint: 'bg-module-6/10' },
  { title: 'Enterprise Alerts', tag: 'Real-Time', Icon: Bell, tone: 'text-module-7', tint: 'bg-module-7/10' },
  { title: 'User Management', tag: 'Governance', Icon: Settings, tone: 'text-module-8', tint: 'bg-module-8/10' },
];

function Chip({ title, tag, Icon, tone, tint }: ModuleChip) {
  return (
    <div className="flex items-center gap-3 shrink-0 rounded-panel border border-border bg-white px-4 py-3 shadow-1 w-64">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-panel ${tint} ${tone}`}>
        <Icon size={17} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-body font-bold text-fg">{title}</p>
        <p className={`truncate text-micro font-semibold ${tone}`}>{tag}</p>
      </div>
    </div>
  );
}

function Row({ chips, seconds, reverse = false }: { chips: ModuleChip[]; seconds: number; reverse?: boolean }) {
  const doubled = [...chips, ...chips];
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
      }}
    >
      <div
        className="flex gap-4 w-max login-marquee-track"
        style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {doubled.map((c, i) => (
          <Chip key={`${c.title}-${i}`} {...c} />
        ))}
      </div>
    </div>
  );
}

export function LoginModuleMarquee() {
  return (
    <div aria-hidden="true" className="w-full space-y-4">
      <Row chips={ROW_1} seconds={38} />
      <Row chips={ROW_2} seconds={44} />

      <style jsx global>{`
        @keyframes login-marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .login-marquee-track {
          animation-name: login-marquee-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .login-marquee-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
