'use client';

interface Props {
  conflictingRecord: any;
  pendingData: any;
  isExactDuplicate: boolean;
  onContinueSave: () => void;
  onCancel: () => void;
}

export function DuplicateWarningModal({
  conflictingRecord,
  pendingData,
  isExactDuplicate,
  onContinueSave,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-2xl w-full max-w-lg border border-amber-500/50 shadow-2xl p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <span className="text-2xl">{isExactDuplicate ? '🚫' : '⚠️'}</span>
          <div>
            <h3 className="text-sm font-bold text-white">
              {isExactDuplicate ? 'Exact Duplicate Record Blocked' : 'Possible Duplicate Contact Found'}
            </h3>
            <p className="text-[11px] text-amber-400">
              {isExactDuplicate
                ? 'An identical company, HR contact, and mobile already exist in the database.'
                : 'A contact with the same Company, HR name, and Mobile already exists.'}
            </p>
          </div>
        </div>

        {/* Side by Side Comparison (Spec Section 11) */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* New Entry */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
            <span className="text-[10px] text-blue-400 font-bold uppercase block">Pending New Entry</span>
            <div className="font-semibold text-white">{pendingData.company_name}</div>
            <div className="text-slate-300">HR: {pendingData.hr_name || '—'}</div>
            <div className="text-slate-400 font-mono text-[11px]">📞 {pendingData.primary_mobile || '—'}</div>
            <div className="text-slate-400 font-mono text-[11px]">✉️ {pendingData.primary_email || '—'}</div>
          </div>

          {/* Existing Match */}
          <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-500/30 space-y-1.5">
            <span className="text-[10px] text-amber-400 font-bold uppercase block">Existing Database Record</span>
            <div className="font-semibold text-amber-200">{conflictingRecord.company_name}</div>
            <div className="text-amber-100/90">HR: {conflictingRecord.hr_name || '—'}</div>
            <div className="text-amber-300/80 font-mono text-[11px]">📞 {conflictingRecord.primary_mobile || '—'}</div>
            <div className="text-amber-300/80 font-mono text-[11px]">✉️ {conflictingRecord.primary_email || '—'}</div>
          </div>
        </div>

        {/* Action Buttons (Spec Section 11: View Existing, Continue Save, Cancel) */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
          >
            Cancel
          </button>

          {!isExactDuplicate ? (
            <button
              type="button"
              onClick={onContinueSave}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              Continue & Save Anyway →
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
            >
              OK, Dismiss
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
