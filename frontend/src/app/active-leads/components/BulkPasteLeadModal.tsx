'use client';

import React, { useState } from 'react';
import { X, ClipboardList, Sparkles, GraduationCap } from 'lucide-react';
import { SmoothLeadStatusDropdown, LeadStatus } from '@/components/ui/SmoothLeadStatusDropdown';
import { SmoothYearDropdown } from '@/components/ui/SmoothYearDropdown';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmitBulk: (lines: string[], academicYear: string, defaultStatus: LeadStatus) => Promise<boolean>;
}

export function BulkPasteLeadModal({ isOpen, onClose, onSubmitBulk }: Props) {
  const [pasteContent, setPasteContent] = useState('');
  const [academicYear, setAcademicYear] = useState('2027');
  const [defaultStatus, setDefaultStatus] = useState<LeadStatus>('Hiring');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const lines = pasteContent
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      setError('Please paste at least one company name');
      return;
    }

    setSubmitting(true);
    setError('');
    const ok = await onSubmitBulk(lines, academicYear, defaultStatus);
    setSubmitting(false);

    if (ok) {
      setPasteContent('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 text-fg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20 flex items-center justify-center">
              <ClipboardList size={16} />
            </span>
            <div>
              <h2 className="text-base font-bold text-fg">Bulk Paste Active Leads</h2>
              <p className="text-[11px] text-fg-subtle">
                Paste company names (one per line, or comma-separated with Role, CTC)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-sunken hover:bg-surface-raised text-fg-subtle hover:text-fg flex items-center justify-center border border-border transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Year & Default Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-fg mb-1">Target Hiring Year</label>
              <SmoothYearDropdown value={academicYear} onChange={setAcademicYear} />
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1">Default Initial Status</label>
              <SmoothLeadStatusDropdown value={defaultStatus} onChange={(s) => setDefaultStatus(s as LeadStatus)} />
            </div>
          </div>

          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-fg">
                Paste Leads List
              </label>
              <span className="text-[10px] font-bold text-primary font-mono">
                {lines.length} {lines.length === 1 ? 'line' : 'lines'} detected
              </span>
            </div>
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder={`Example formats:\nZoho Corporation, Software Engineer, 6.5 LPA\nAccenture\nTCS, Graduate Trainee, 4.0 LPA, Follow Up, September\nCognizant`}
              rows={7}
              className="w-full bg-surface-sunken border border-border rounded-xl p-3 text-xs text-fg placeholder:text-fg-disabled outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end pt-4 border-t border-border">
            <button
              type="submit"
              disabled={submitting || lines.length === 0}
              className="w-full sm:w-auto px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Sparkles size={14} strokeWidth={2} />
              <span>{submitting ? 'Importing…' : `Import ${lines.length} Leads`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
