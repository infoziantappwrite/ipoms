'use client';

import Link from 'next/link';
import { AlertCircle, ShieldAlert, Clock, Building2, Database, ArrowRight, CheckCircle2 } from 'lucide-react';

interface CriticalAlertsData {
  unassigned_colleges_count: number;
  unassigned_colleges: Array<{ college_id: string; college_name: string; college_code: string }>;
  locked_accounts_count: number;
  locked_accounts: Array<{ user_id: string; name: string; email: string; reason: string }>;
  stale_pipeline_count: number;
  missing_mobiles_count: number;
  missing_emails_count: number;
}

interface Props {
  alerts: CriticalAlertsData;
}

export function AdminCriticalAlerts({ alerts }: Props) {
  if (!alerts) return null;

  const {
    unassigned_colleges_count = 0,
    unassigned_colleges = [],
    locked_accounts_count = 0,
    locked_accounts = [],
    stale_pipeline_count = 0,
    missing_mobiles_count = 0,
    missing_emails_count = 0,
  } = alerts;

  const totalAlerts =
    unassigned_colleges_count +
    locked_accounts_count +
    (stale_pipeline_count > 0 ? 1 : 0) +
    (missing_mobiles_count > 0 || missing_emails_count > 0 ? 1 : 0);

  if (totalAlerts === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-success/30 bg-success/10 p-5 flex items-center justify-between flex-wrap gap-3 shadow-2">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-success/20 text-success border border-success/30">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <h4 className="text-xs font-bold text-fg">Executive Attention Queue: All Systems Clear</h4>
            <p className="text-micro text-fg-subtle mt-0.5">
              Zero unassigned colleges, zero locked accounts, and all recruitment pipeline follow-ups are up to date.
            </p>
          </div>
        </div>
        <span className="text-micro font-mono text-success font-semibold px-2.5 py-1 rounded-full bg-success/20">
          Status: Operational 100%
        </span>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-border p-5 space-y-4 shadow-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertCircle size={16} />
          </span>
          <div>
            <h3 className="text-xs font-bold text-fg">Critical Operational Alerts & Executive Queue</h3>
            <p className="text-micro text-fg-subtle mt-0.5">
              High-priority bottlenecks requiring administrative assignment, security unlock, or metadata review
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-micro font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          {totalAlerts} Active Action {totalAlerts === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      {/* Alert Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* 1. Unassigned Colleges Alert */}
        {unassigned_colleges_count > 0 && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Building2 size={18} />
              </span>
              <div>
                <h4 className="text-xs font-bold text-fg flex items-center gap-2">
                  <span>{unassigned_colleges_count} Unassigned Partner {unassigned_colleges_count === 1 ? 'College' : 'Colleges'}</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono px-1.5 py-0.2 rounded font-bold">
                    Action Required
                  </span>
                </h4>
                <p className="text-micro text-fg-subtle mt-1">
                  Institutions with 0 coordinators assigned. Outreach will stall until staffing is allocated.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {unassigned_colleges.slice(0, 3).map((c) => (
                    <span key={c.college_id} className="text-[10px] font-mono bg-surface font-semibold px-2 py-0.5 rounded border border-border">
                      [{c.college_code}] {c.college_name}
                    </span>
                  ))}
                  {unassigned_colleges.length > 3 && (
                    <span className="text-[10px] text-fg-subtle self-center">
                      +{unassigned_colleges.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-500/20 flex justify-end">
              <Link
                href="/settings?tab=users"
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                Assign Coordinators in Settings <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* 2. Locked Accounts Alert */}
        {locked_accounts_count > 0 && (
          <div className="p-4 rounded-xl border border-danger/30 bg-danger/5 flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-danger/10 text-danger shrink-0">
                <ShieldAlert size={18} />
              </span>
              <div>
                <h4 className="text-xs font-bold text-fg flex items-center gap-2">
                  <span>{locked_accounts_count} Coordinator {locked_accounts_count === 1 ? 'Account' : 'Accounts'} Locked</span>
                  <span className="text-[10px] bg-danger/20 text-danger font-mono px-1.5 py-0.2 rounded font-bold">
                    Security Lockout
                  </span>
                </h4>
                <p className="text-micro text-fg-subtle mt-1">
                  User accounts blocked due to 3-strike login failures or password policy reset caps.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {locked_accounts.map((u) => (
                    <span key={u.user_id} className="text-[10px] bg-surface font-semibold px-2 py-0.5 rounded border border-danger/20 text-fg">
                      {u.name} <span className="text-danger font-mono">({u.reason})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-danger/20 flex justify-end">
              <Link
                href="/settings?tab=users"
                className="text-xs font-semibold text-danger hover:underline flex items-center gap-1"
              >
                Release Account in User Management <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* 3. Stale Pipeline Follow-ups Alert */}
        {stale_pipeline_count > 0 && (
          <div className="p-4 rounded-xl border border-border bg-surface-sunken/60 flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <Clock size={18} />
              </span>
              <div>
                <h4 className="text-xs font-bold text-fg flex items-center gap-2">
                  <span>{stale_pipeline_count} Overdue Pipeline {stale_pipeline_count === 1 ? 'Record' : 'Records'}</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono px-1.5 py-0.2 rounded font-bold">
                    &gt; 7 Days Inactive
                  </span>
                </h4>
                <p className="text-micro text-fg-subtle mt-1">
                  Weekly Tracker companies with follow-up dates in the past or untouched for over a week.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <Link
                href="/weekly-tracker"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Review Weekly Pipeline Matrix <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* 4. Metadata Data Quality Warning */}
        {(missing_mobiles_count > 0 || missing_emails_count > 0) && (
          <div className="p-4 rounded-xl border border-border bg-surface-sunken/60 flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
                <Database size={18} />
              </span>
              <div>
                <h4 className="text-xs font-bold text-fg flex items-center gap-2">
                  <span>Metadata Quality Notice</span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-mono px-1.5 py-0.2 rounded font-bold">
                    Data Hygiene
                  </span>
                </h4>
                <p className="text-micro text-fg-subtle mt-1">
                  Found {missing_mobiles_count} companies with missing phone numbers and {missing_emails_count} with missing emails in the Master Database.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <Link
                href="/metadata"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Open Master Metadata DB <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
