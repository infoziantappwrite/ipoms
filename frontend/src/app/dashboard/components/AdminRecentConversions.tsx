'use client';

import Link from 'next/link';
import { Sparkles, Building2, User, Landmark, Briefcase, ExternalLink } from 'lucide-react';

interface ConversionLead {
  lead_id: string;
  company_name: string;
  hr_name: string;
  job_role: string;
  package_lpa: string;
  lead_type: string;
  college_name: string;
  college_code: string;
  coordinator_name: string;
  date: string | Date;
}

interface Props {
  conversions: ConversionLead[];
}

export function AdminRecentConversions({ conversions = [] }: Props) {
  if (!conversions || conversions.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-border p-5 text-center space-y-2 shadow-2">
        <Sparkles size={24} className="mx-auto text-fg-subtle/50" />
        <h4 className="text-xs font-bold text-fg">Live Corporate Conversions Feed</h4>
        <p className="text-micro text-fg-subtle">
          No new positive responses logged in the current window.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-border p-5 space-y-4 shadow-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-xs font-bold text-fg flex items-center gap-2">
            <Sparkles size={15} className="text-amber-500" aria-hidden /> Live Corporate Outreach & Conversion Feed
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Real-time qualified hiring mandates, verified JDs, and placement drive breakthroughs
          </p>
        </div>

        <Link
          href="/daily-leads"
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
        >
          View Daily Leads Register <ExternalLink size={12} />
        </Link>
      </div>

      {/* Conversion Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {conversions.map((lead) => {
          const isJd = lead.lead_type === 'jd_received';
          const formattedDate = lead.date ? new Date(lead.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today';

          return (
            <div
              key={lead.lead_id}
              className="p-3.5 rounded-xl border border-border bg-surface-sunken/40 hover:bg-surface-sunken/80 transition-colors flex flex-col justify-between space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`p-1.5 rounded-lg shrink-0 ${isJd ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'}`}>
                    <Building2 size={14} />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-fg truncate" title={lead.company_name}>
                      {lead.company_name}
                    </h4>
                    <span className="text-[10px] text-fg-subtle block truncate">
                      HR: {lead.hr_name || 'HR Team'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                    isJd
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isJd ? 'JD Received' : 'Positive Lead'}
                </span>
              </div>

              {/* Role & Package Strip */}
              <div className="p-2 bg-surface rounded-lg border border-border/80 text-micro flex items-center justify-between">
                <span className="text-fg-muted font-medium flex items-center gap-1 truncate max-w-[65%]">
                  <Briefcase size={11} className="text-fg-subtle shrink-0" />
                  <span className="truncate">{lead.job_role}</span>
                </span>
                <span className="font-mono font-bold text-primary shrink-0">
                  {lead.package_lpa}
                </span>
              </div>

              {/* Footer Meta */}
              <div className="flex items-center justify-between text-[10px] text-fg-subtle pt-1 border-t border-border/50">
                <span className="flex items-center gap-1 truncate max-w-[60%]">
                  <Landmark size={10} className="text-primary/70 shrink-0" />
                  <span className="font-mono font-semibold text-primary">[{lead.college_code}]</span>
                  <span className="truncate">{lead.college_name}</span>
                </span>

                <span className="flex items-center gap-1 shrink-0 font-medium">
                  <User size={10} className="text-fg-subtle" />
                  <span>{lead.coordinator_name.split(' ')[0]}</span>
                  <span>• {formattedDate}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
