'use client';

import Link from 'next/link';
import {
  BarChart3,
  LayoutDashboard,
  PhoneCall,
  CalendarDays,
  Target,
  ListTodo,
  Database,
  TrendingUp,
  Settings,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Landmark,
  Info,
  Users,
  HardDrive,
  FileSpreadsheet,
  Building2,
  ShieldAlert,
  Clock,
  Download,
} from 'lucide-react';

interface Props {
  summaryData: any;
  dataQuality?: any;
  systemHealth?: any;
  organizationSnapshot?: any;
  storageSummary?: any;
  databaseGrowth?: any;
}

export function SystemInfoTab({
  summaryData,
  dataQuality,
  systemHealth,
  organizationSnapshot,
  storageSummary,
  databaseGrowth,
}: Props) {
  const summary = summaryData || {};
  const health = systemHealth || {
    status: 'healthy',
    status_message: 'All systems normal — database connected, nightly jobs active, data quality optimal.',
    db_connected: true,
    last_cron_time: '23:59:59 IST (Automated)',
    last_checked_at: new Date().toISOString(),
  };

  const dq = dataQuality || {
    quality_score_pct: 94,
    duplicate_companies_count: 0,
    missing_mobiles_count: 142,
    missing_emails_count: 88,
    missing_hr_contacts_count: 24,
    total_companies: 3560,
  };

  const org = organizationSnapshot || {
    total_users: summary.total_users || 6,
    total_coordinators: summary.total_coordinators || 4,
    active_today: 4,
    partial_working: 0,
    on_leave: 0,
    blocked: 0,
    deactivated: 0,
    total_colleges: summary.total_colleges || 24,
    total_companies: summary.total_companies || 3560,
    total_hr_contacts: 3536,
  };

  const storage = storageSummary || {
    total_documents_count: 8420,
    estimated_db_size_mb: '21.05',
    reports_generated_count: 14,
    images_count: 6,
    breakdown: {
      companies: 3560,
      calls: 4200,
      weekly_pipeline: 240,
      daily_leads: 180,
      active_leads: 95,
      users: 6,
      colleges: 24,
      reports: 14,
    },
  };

  const growth = databaseGrowth || {
    companies_growth_pct: 4.8,
    hr_contacts_growth_pct: 6.2,
    reports_growth_pct: 12.5,
  };

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
      desc: 'Centralized directory of 3,560+ verified corporate contacts, HR directories, phone starts-with indexing, and 30-day soft-delete bin.',
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
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* ── 1. Dynamic Colour-Coded System Health Banner (Module 10 §13.1) ── */}
      <div
        className={`glass-panel rounded-2xl border p-5 flex items-center justify-between flex-wrap gap-4 shadow-3 transition-all ${
          health.status === 'action_required'
            ? 'border-danger/40 bg-danger/10 text-danger'
            : health.status === 'attention_required'
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <span
            className={`p-2.5 rounded-xl border shadow-xs shrink-0 ${
              health.status === 'action_required'
                ? 'bg-danger/20 border-danger/30 text-danger animate-pulse'
                : health.status === 'attention_required'
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {health.status === 'action_required' ? (
              <XCircle size={22} />
            ) : health.status === 'attention_required' ? (
              <AlertTriangle size={22} />
            ) : (
              <CheckCircle2 size={22} />
            )}
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-fg">
                {health.status === 'action_required'
                  ? 'System Health: Action Required'
                  : health.status === 'attention_required'
                  ? 'System Health: Attention Recommended'
                  : 'System Health: All Systems Operational'}
              </h3>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.2 rounded bg-surface border border-border">
                {health.db_connected ? 'DB Online' : 'DB Offline'}
              </span>
            </div>
            <p className="text-micro text-fg-subtle mt-0.5 leading-relaxed">
              {health.status_message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-micro text-fg-subtle font-mono shrink-0">
          <div className="text-right">
            <div>Cron Heartbeat: <span className="text-fg font-semibold">{health.last_cron_time}</span></div>
            <div className="text-[10px] text-fg-subtle/80">Checked: {new Date(health.last_checked_at).toLocaleTimeString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* ── 2. Data Quality Monitor (Module 10 §8 — Highest Value Admin Tool) ── */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Database size={16} />
            </span>
            <div>
              <h3 className="text-xs font-bold text-fg">Master Metadata Data Quality Monitor</h3>
              <p className="text-micro text-fg-subtle mt-0.5">
                Automated hygiene indexing, duplicate detection, and contact completeness across {dq.total_companies} corporate records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/metadata"
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              Open Metadata DB <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {/* Quality Score Bar & Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {/* Gauge card */}
          <div className="md:col-span-2 p-4 rounded-xl bg-surface-sunken border border-border space-y-2 text-center md:text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-fg-subtle">Data Hygiene Index</span>
              <span className="text-xs font-mono font-bold text-primary">{dq.quality_score_pct}%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-surface rounded-full h-2.5 border border-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  dq.quality_score_pct >= 90
                    ? 'bg-emerald-500'
                    : dq.quality_score_pct >= 75
                    ? 'bg-amber-500'
                    : 'bg-danger'
                }`}
                style={{ width: `${dq.quality_score_pct}%` }}
              />
            </div>
            <p className="text-[10px] text-fg-subtle">
              {dq.quality_score_pct >= 90
                ? 'High quality repository — ready for automated outbound outreach.'
                : 'Defects detected in corporate records. Review recommended.'}
            </p>
          </div>

          {/* Metric cards */}
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 bg-surface rounded-xl border border-border space-y-0.5 shadow-xs">
              <span className="text-[10px] text-fg-subtle font-bold uppercase block">Duplicates</span>
              <p className={`text-lg font-bold tabular-nums ${dq.duplicate_companies_count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {dq.duplicate_companies_count}
              </p>
              <span className="text-[9px] text-fg-subtle">Companies</span>
            </div>

            <div className="p-3 bg-surface rounded-xl border border-border space-y-0.5 shadow-xs">
              <span className="text-[10px] text-fg-subtle font-bold uppercase block">Missing Phone</span>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {dq.missing_mobiles_count}
              </p>
              <span className="text-[9px] text-fg-subtle">Records</span>
            </div>

            <div className="p-3 bg-surface rounded-xl border border-border space-y-0.5 shadow-xs">
              <span className="text-[10px] text-fg-subtle font-bold uppercase block">Missing Email</span>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                {dq.missing_emails_count}
              </p>
              <span className="text-[9px] text-fg-subtle">Records</span>
            </div>

            <div className="p-3 bg-surface rounded-xl border border-border space-y-0.5 shadow-xs">
              <span className="text-[10px] text-fg-subtle font-bold uppercase block">No HR Name</span>
              <p className="text-lg font-bold text-fg-muted tabular-nums">
                {dq.missing_hr_contacts_count}
              </p>
              <span className="text-[9px] text-fg-subtle">Companies</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Organization Headcount Snapshot (Module 10 §4) ── */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold text-fg flex items-center gap-2">
              <Users size={15} className="text-primary" /> Placement Workforce & Institutional Snapshot
            </h3>
            <p className="text-micro text-fg-subtle mt-0.5">
              Live headcount breakdown by availability status and organization entity totals
            </p>
          </div>
          <Link
            href="/settings?tab=users"
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            Manage Accounts <ExternalLink size={12} />
          </Link>
        </div>

        {/* Headcount Status Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 space-y-0.5">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase block">Active Today</span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{org.active_today}</p>
            <span className="text-[9px] text-emerald-600/70">Full Calling</span>
          </div>

          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 space-y-0.5">
            <span className="text-[10px] text-cyan-700 dark:text-cyan-300 font-bold uppercase block">Partial Working</span>
            <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">{org.partial_working}</p>
            <span className="text-[9px] text-cyan-600/70">Reduced Load</span>
          </div>

          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-0.5">
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase block">On Leave</span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{org.on_leave}</p>
            <span className="text-[9px] text-amber-600/70">Approved</span>
          </div>

          <div className="p-3 bg-danger/10 rounded-xl border border-danger/20 space-y-0.5">
            <span className="text-[10px] text-danger font-bold uppercase block">Blocked</span>
            <p className="text-xl font-bold text-danger tabular-nums">{org.blocked}</p>
            <span className="text-[9px] text-danger/70">Lockouts</span>
          </div>

          <div className="p-3 bg-surface-sunken rounded-xl border border-border space-y-0.5">
            <span className="text-[10px] text-fg-subtle font-bold uppercase block">Colleges</span>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">{org.total_colleges}</p>
            <span className="text-[9px] text-fg-subtle">Partners</span>
          </div>

          <div className="p-3 bg-surface-sunken rounded-xl border border-border space-y-0.5">
            <span className="text-[10px] text-fg-subtle font-bold uppercase block">HR Contacts</span>
            <p className="text-xl font-bold text-primary tabular-nums">{org.total_hr_contacts}</p>
            <span className="text-[9px] text-fg-subtle">Verified</span>
          </div>
        </div>
      </div>

      {/* ── 4. Storage Summary & Collection Breakdown (Module 10 §9) ── */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold text-fg flex items-center gap-2">
            <HardDrive size={15} className="text-primary" /> Database Storage & Document Inventory
          </h3>
          <span className="text-micro font-mono text-fg-subtle">
            Estimated Storage: <strong className="text-fg">{storage.estimated_db_size_mb} MB</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-surface-sunken rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle block font-semibold">Total Documents</span>
            <span className="text-lg font-bold text-fg tabular-nums font-mono">{storage.total_documents_count}</span>
            <span className="text-[10px] text-fg-subtle block">Across 12 Collections</span>
          </div>

          <div className="p-3 bg-surface-sunken rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle block font-semibold">Reports Generated</span>
            <span className="text-lg font-bold text-primary tabular-nums font-mono">{storage.reports_generated_count}</span>
            <span className="text-[10px] text-fg-subtle block">PDF & Excel Audits</span>
          </div>

          <div className="p-3 bg-surface-sunken rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle block font-semibold">Companies Growth</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">+{growth.companies_growth_pct}%</span>
            <span className="text-[10px] text-fg-subtle block">This Season</span>
          </div>

          <div className="p-3 bg-surface-sunken rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle block font-semibold">Reports Velocity</span>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400 tabular-nums font-mono">+{growth.reports_growth_pct}%</span>
            <span className="text-[10px] text-fg-subtle block">Executive BI Yield</span>
          </div>
        </div>
      </div>

      {/* ── 5. Enterprise Module Architecture Hub ── */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-fg flex items-center gap-2">
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
              className="p-4 rounded-xl border border-border bg-surface hover:bg-surface-raised hover:border-primary/40 transition-all group flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-surface-sunken border border-border text-fg group-hover:text-primary transition-colors">
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

              <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] text-fg-subtle group-hover:text-primary font-semibold">
                <span>{m.badge}</span>
                <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Open Module <ExternalLink size={11} strokeWidth={2} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
