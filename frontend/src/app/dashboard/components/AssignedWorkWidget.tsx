'use client';

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
      <div className="glass-panel rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>📥</span> Assigned Work from Team Leader
          </h2>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/30">
            Inbox Clear
          </span>
        </div>
        <p className="text-xs text-slate-500 italic text-center py-4">
          ✨ All assigned operational tasks are completed. You're all caught up!
        </p>
      </div>
    );
  }

  const priorityStyles = {
    high: 'bg-red-500/10 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
      {/* Widget Title Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>📥</span> Assigned Work from Team Leader
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Operational task inbox dispatched by TL. Load contacts to Metadata or mark completed.
          </p>
        </div>
        <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full font-bold">
          {assignments.length} Action Required
        </span>
      </div>

      {/* Assignment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {assignments.map((item) => (
          <div
            key={item._id}
            className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all space-y-3"
          >
            {/* Top Bar: Company Name & Priority */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    priorityStyles[item.priority]
                  }`}
                >
                  {item.priority} Priority
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  [{item.college_id?.college_code || 'COLLEGE'}]
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mt-2 flex items-center gap-1.5">
                <span>🏢</span> {item.company_name}
              </h3>

              {/* HR Details */}
              {(item.hr_name || item.hr_mobile || item.hr_email) && (
                <div className="mt-1.5 text-xs text-slate-300 space-y-0.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 font-mono text-[11px]">
                  {item.hr_name && <p className="font-semibold text-slate-200">HR: {item.hr_name}</p>}
                  {item.hr_mobile && <p className="text-blue-400">📱 {item.hr_mobile}</p>}
                  {item.hr_email && <p className="text-purple-400">✉️ {item.hr_email}</p>}
                </div>
              )}

              {/* Task Description */}
              <p className="text-xs text-slate-300 mt-2 bg-slate-900/90 p-2 rounded border border-slate-800/60 italic leading-relaxed">
                "{item.task_description}"
              </p>
            </div>

            {/* Action Buttons (Spec Section 9) */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onLoadToMetadata(item._id)}
                disabled={item.is_loaded_to_metadata}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  item.is_loaded_to_metadata
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 cursor-default'
                    : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30'
                }`}
              >
                <span>⚡</span>
                <span>{item.is_loaded_to_metadata ? 'Loaded to Metadata ✓' : 'Load to Metadata'}</span>
              </button>

              <button
                type="button"
                onClick={() => onMarkComplete(item._id)}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1 shrink-0"
              >
                <span>✓</span> Mark Done
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
