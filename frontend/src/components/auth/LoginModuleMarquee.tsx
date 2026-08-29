'use client';

import {
  LayoutDashboard, Phone, CalendarDays, Target, Database,
  TrendingUp, Bell, Settings, type LucideIcon,
} from 'lucide-react';

/**
 * Slow right-to-left marquee of the 8 operational modules, for the login
 * page's left panel. Two rows at different speeds so it reads as a single
 * layered glide rather than one flat scroll. Pure clean light theme throughout.
 */

interface ModuleChip {
  title: string;
  tag: string;
  Icon: LucideIcon;
  tone: string;
  tint: string;
}

const ROW_1: ModuleChip[] = [
  { title: 'Role-Based Dashboard', tag: 'Operational Hub', Icon: LayoutDashboard, tone: 'text-blue-600', tint: 'bg-blue-50' },
  { title: 'Daily Call Tracker', tag: 'Core Engine', Icon: Phone, tone: 'text-indigo-600', tint: 'bg-indigo-50' },
  { title: 'Weekly Tracker Lifecycle', tag: 'Pipeline CRM', Icon: CalendarDays, tone: 'text-purple-600', tint: 'bg-purple-50' },
  { title: 'Daily Leads Register', tag: 'High Intent', Icon: Target, tone: 'text-amber-600', tint: 'bg-amber-50' },
];

const ROW_2: ModuleChip[] = [
  { title: 'Master Company Metadata', tag: '3,550+ Records', Icon: Database, tone: 'text-teal-600', tint: 'bg-teal-50' },
  { title: 'Reports & Analytics Center', tag: 'BI & Presets', Icon: TrendingUp, tone: 'text-cyan-600', tint: 'bg-cyan-50' },
  { title: 'Enterprise Alerts', tag: 'Real-Time', Icon: Bell, tone: 'text-emerald-600', tint: 'bg-emerald-50' },
  { title: 'User Management', tag: 'Governance', Icon: Settings, tone: 'text-violet-600', tint: 'bg-violet-50' },
];

function Chip({ title, tag, Icon, tone, tint }: ModuleChip) {
  return (
    <div className="flex items-center gap-3 shrink-0 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm w-64">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tint} ${tone}`}>
        <Icon size={17} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-slate-800">{title}</p>
        <p className={`truncate text-[10px] font-semibold ${tone}`}>{tag}</p>
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
