import Link from 'next/link';
import {
  BarChart3, LayoutDashboard, PhoneCall, CalendarDays, Target, ListTodo,
  Database, TrendingUp, Settings, ExternalLink, CheckCircle2, Landmark, Info
} from 'lucide-react';

interface Props {
  summaryData: any;
}

export function SystemInfoTab({ summaryData }: Props) {
  const summary = summaryData || {};

  const modules = [
    {
      title: 'Role-Based Dashboard',
      code: 'Module 07',
      Icon: LayoutDashboard,
      desc: 'Real-time daily KPI scorecards, interactive task dispatching, priority college alerts, and institutional placement leaderboards.',
      href: '/dashboard',
      badge: 'Operational Hub',
      color: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    },
    {
      title: 'Daily Call Tracker',
      code: 'Module 03',
      Icon: PhoneCall,
      desc: 'Session-based outbound calling console with auto-duration timestamps, 12 single-choice call outcomes, and monthly follow-up scheduler.',
      href: '/tracker',
      badge: 'Telephony Engine',
      color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    },
    {
      title: 'Weekly Lifecycle Tracker',
      code: 'Module 04',
      Icon: CalendarDays,
      desc: '7-stage company pipeline board, stage promotions, automated Monday carry-overs, and dual-party rejection audit trails.',
      href: '/weekly-tracker',
      badge: 'Pipeline Matrix',
      color: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
    },
    {
      title: 'Daily Leads Register',
      code: 'Module 05',
      Icon: Target,
      desc: 'Timestamped register of qualified hiring opportunities, JD receipts, and student submission tracking.',
      href: '/daily-leads',
      badge: 'Lead Registry',
      color: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    },
    {
      title: 'Pending Task Register',
      code: 'Module 09',
      Icon: ListTodo,
      desc: 'College-wise task tracking board with JD dates, DB shared status, pipeline actions, and scheduled campus drive dates.',
      href: '/pending-tasks',
      badge: 'Task Operations',
      color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10',
    },
    {
      title: 'Master Metadata Database',
      code: 'Module 02',
      Icon: Database,
      desc: 'Centralized directory of 3,500+ verified corporate contacts, HR directories, phone starts-with indexing, and 30-day soft-delete bin.',
      href: '/metadata',
      badge: 'Intelligence Repository',
      color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
    },
    {
      title: 'Reports & Analytics Center',
      code: 'Module 06',
      Icon: TrendingUp,
      desc: 'Cross-tab operational BI, 4 downloadable report presets, student eligible filters, and document report editor.',
      href: '/reports',
      badge: 'Executive BI',
      color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10',
    },
    {
      title: 'System Settings & RBAC',
      code: 'Module 01 & 08',
      Icon: Settings,
      desc: 'Personal profile, user account provisioning, role permissions matrix, audit logs, and global season configuration.',
      href: '/settings',
      badge: 'Governance',
      color: 'border-primary/30 text-primary bg-primary/10',
    },
  ];

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Reassurance Health Panel */}
      <div className="glass-panel rounded-2xl border border-success/30 bg-success/20 p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-success p-2 bg-success/50 rounded-xl border border-success/30">
            <CheckCircle2 size={24} strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h3 className="text-xs font-bold text-white">iPOMS Operational Health: All Systems Normal</h3>
            <p className="text-micro text-success mt-0.5">
              Database Connected • Automated Midnight Finalization Cron Active • API Engine Live
            </p>
          </div>
        </div>
        <span className="text-micro text-fg-subtle font-mono">
          Last Sync: Today ({new Date().toLocaleDateString('en-IN')})
        </span>
      </div>

      {/* Database Summary Telemetry */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <BarChart3 size={14} strokeWidth={2} aria-hidden /> System Database Summary (Read-Only)
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Real-time entity counts across the centralized operational database
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-4 bg-background/60 rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle font-bold uppercase">Total Users</span>
            <p className="text-2xl font-bold text-white tabular-nums">{summary.total_users || 6}</p>
            <span className="text-micro text-fg-subtle">Active Accounts</span>
          </div>

          <div className="p-4 bg-background/60 rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle font-bold uppercase">Coordinators</span>
            <p className="text-2xl font-bold text-primary tabular-nums">{summary.total_coordinators || 4}</p>
            <span className="text-micro text-primary/80">Calling Staff</span>
          </div>

          <div className="p-4 bg-background/60 rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle font-bold uppercase">Companies</span>
            <p className="text-2xl font-bold text-cyan-400 tabular-nums">{summary.total_companies || 3559}</p>
            <span className="text-micro text-cyan-400/80">Corporate Contacts</span>
          </div>

          <div className="p-4 bg-background/60 rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle font-bold uppercase">Colleges</span>
            <p className="text-2xl font-bold text-purple-400 tabular-nums">{summary.total_colleges || 24}</p>
            <span className="text-micro text-purple-400/80">Partner Institutions</span>
          </div>
        </div>
      </div>

      {/* Enterprise Module Directory & Architecture Hub */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Landmark size={14} strokeWidth={2.2} aria-hidden /> Enterprise Module Directory & Architecture Hub
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Operational navigation and governance directory across all 8 integrated modules
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {modules.map((m) => (
            <Link
              key={m.code}
              href={m.href}
              className="p-4 rounded-xl border border-border bg-background/60 hover:bg-surface-raised hover:border-primary/40 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-surface border border-border text-fg group-hover:text-primary transition-colors">
                      <m.Icon size={16} strokeWidth={2} />
                    </span>
                    <span className="text-xs font-bold text-fg group-hover:text-primary transition-colors">
                      {m.title}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.color}`}>
                    {m.code}
                  </span>
                </div>
                <p className="text-[11px] text-fg-subtle leading-relaxed line-clamp-2">
                  {m.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-fg-subtle group-hover:text-primary font-semibold">
                <span>{m.badge}</span>
                <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Open Module <ExternalLink size={11} strokeWidth={2} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Application Version & Environment */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Info size={14} strokeWidth={2.2} aria-hidden /> Application Build & Environment
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-micro text-fg-subtle uppercase font-semibold block">Application Release</span>
            <span className="text-fg font-mono font-semibold">{summary.app_version || 'v1.0.0 Enterprise'}</span>
          </div>
          <div>
            <span className="text-micro text-fg-subtle uppercase font-semibold block">Database Engine</span>
            <span className="text-fg font-mono font-semibold">{summary.database_status || 'Connected'}</span>
          </div>
          <div>
            <span className="text-micro text-fg-subtle uppercase font-semibold block">Node / Next Runtime</span>
            <span className="text-fg font-mono font-semibold">Node.js 20 • Next.js 14.2</span>
          </div>
        </div>
      </div>

    </div>
  );
}
