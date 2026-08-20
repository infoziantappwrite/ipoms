'use client';

import { Building2, Check, Download, Mail, Smartphone, Sparkles, Zap } from 'lucide-react';
interface AssignedItem {
  _id: string;
  sender_tl_id?: { full_name: string };
  college_id?: { college_name: string; college_code: string };
  company_name: string;
  hr_name?: string;
  hr_mobile?: string;
  hr_email?: string;
  task_description: string;
  priority: 'high' | 'medium' | 'low';
  is_loaded_to_metadata: boolean;
}

interface Props {
  assignments: AssignedItem[];
  onLoadToMetadata: (id: string) => void;
  onMarkComplete: (id: string) => void;
}

export function AssignedWorkWidget({ assignments, onLoadToMetadata, onMarkComplete }: Props) {
  if (assignments.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-border p-5 shadow-3 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Download size={14} strokeWidth={2} aria-hidden /> Assigned Work from Team Leader
          </h2>
          <span className="text-micro bg-success/20 text-success px-2.5 py-0.5 rounded-full font-semibold border border-success/30">
            Inbox Clear
          </span>
        </div>
        <p className="text-xs text-fg-subtle italic text-center py-4">
          <Sparkles size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}All assigned operational tasks are completed. You're all caught up!
        </p>
      </div>
    );
  }

  const priorityStyles = {
    high: 'bg-destructive/10 text-destructive border-destructive/30',
    medium: 'bg-warning/10 text-warning border-warning/30',
    low: 'bg-primary/10 text-primary border-primary/30',
  };

  return (
    <div className="glass-panel rounded-2xl border border-border p-5 shadow-4 space-y-4">
      {/* Widget Title Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Download size={14} strokeWidth={2} aria-hidden /> Assigned Work from Team Leader
          </h2>
          <p className="text-micro text-fg-subtle mt-0.5">
            Operational task inbox dispatched by TL. Load contacts to Metadata or mark completed.
          </p>
        </div>
        <span className="text-xs bg-destructive/20 text-destructive border border-destructive/30 px-2.5 py-0.5 rounded-full font-bold">
          {assignments.length} Action Required
        </span>
      </div>

      {/* Assignment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {assignments.map((item) => (
          <div
            key={item._id}
            className="bg-background/80 border border-border rounded-xl p-4 flex flex-col justify-between hover:border-border-strong transition-all space-y-3"
          >
            {/* Top Bar: Company Name & Priority */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-micro uppercase font-bold px-2 py-0.5 rounded border ${
                    priorityStyles[item.priority]
                  }`}
                >
                  {item.priority} Priority
                </span>
                <span className="text-micro text-fg-subtle font-mono">
                  [{item.college_id?.college_code || 'COLLEGE'}]
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mt-2 flex items-center gap-1.5">
                <Building2 size={14} strokeWidth={2} aria-hidden /> {item.company_name}
              </h3>

              {/* HR Details */}
              {(item.hr_name || item.hr_mobile || item.hr_email) && (
                <div className="mt-1.5 text-xs text-fg-muted space-y-0.5 bg-background/60 p-2 rounded-lg border border-border/80 font-mono text-micro">
                  {item.hr_name && <p className="font-semibold text-fg">HR: {item.hr_name}</p>}
                  {item.hr_mobile && <p className="text-primary"><Smartphone size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}{item.hr_mobile}</p>}
                  {item.hr_email && <p className="text-purple-400"><Mail size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}{item.hr_email}</p>}
                </div>
              )}

              {/* Task Description */}
              <p className="text-xs text-fg-muted mt-2 bg-background/90 p-2 rounded border border-border/60 italic leading-relaxed">
                "{item.task_description}"
              </p>
            </div>

            {/* Action Buttons (Spec Section 9) */}
            <div className="pt-2 border-t border-border/80 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onLoadToMetadata(item._id)}
                disabled={item.is_loaded_to_metadata}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  item.is_loaded_to_metadata
                    ? 'bg-success/40 text-success border border-success/30 cursor-default'
                    : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30'
                }`}
              >
                <Zap size={14} strokeWidth={2} aria-hidden />
                <span>{item.is_loaded_to_metadata ? 'Loaded to Metadata ✓' : 'Load to Metadata'}</span>
              </button>

              <button
                type="button"
                onClick={() => onMarkComplete(item._id)}
                className="py-1.5 px-3 bg-success hover:bg-success text-white rounded-lg text-xs font-semibold shadow-1 transition-colors flex items-center gap-1 shrink-0"
              >
                <Check size={14} strokeWidth={2} aria-hidden /> Mark Done
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
