'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftRight, X, Building2, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { SmoothSelect } from '@/components/ui/SmoothSelect';

interface CollegeOption {
  _id: string;
  college_name: string;
  college_code: string;
}

interface Props {
  isOpen: boolean;
  selectedCount: number;
  currentCollegeId: string;
  onClose: () => void;
  onConfirm: (targetCollegeId: string, targetCollege: CollegeOption, mode: 'move' | 'copy') => Promise<void>;
}

import { getCoordinatorSelectedColleges } from '@/lib/collegeSession';

export function MoveCollegeModal({
  isOpen,
  selectedCount,
  currentCollegeId,
  onClose,
  onConfirm,
}: Props) {
  const [colleges, setColleges] = useState<CollegeOption[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [loadingMode, setLoadingMode] = useState<'move' | 'copy' | null>(null);
  const [fetchingColleges, setFetchingColleges] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ targetId: string; targetObj: CollegeOption; mode: 'move' | 'copy' } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowWarningModal(false);
      setPendingAction(null);
      return;
    }
    setFetchingColleges(true);
    apiFetch<any>('/colleges')
      .then((res) => {
        if (res.success && Array.isArray(res.data?.colleges)) {
          const filtered = res.data.colleges.filter(
            (c: any) => String(c._id) !== String(currentCollegeId) && c.is_active !== false
          );
          setColleges(filtered);
          if (filtered.length > 0) {
            setSelectedTargetId(filtered[0]._id);
          }
        }
      })
      .catch((err) => console.error('[MoveCollegeModal] Fetch colleges error:', err))
      .finally(() => setFetchingColleges(false));
  }, [isOpen, currentCollegeId]);

  if (!isOpen) return null;

  const handleAction = async (mode: 'move' | 'copy') => {
    if (!selectedTargetId) return;

    const targetObj = colleges.find((c) => String(c._id) === String(selectedTargetId));
    if (!targetObj) return;

    // Check if target college is within current user's pre-selected focus colleges
    const focusCollegeIds = getCoordinatorSelectedColleges();
    const isFocusCollege = focusCollegeIds.includes(String(targetObj._id)) || focusCollegeIds.includes(String(targetObj.college_code));

    if (!isFocusCollege && mode === 'move') {
      // Trigger simple warning confirmation modal
      setPendingAction({ targetId: selectedTargetId, targetObj, mode });
      setShowWarningModal(true);
      return;
    }

    await executeAction(selectedTargetId, targetObj, mode);
  };

  const executeAction = async (targetId: string, targetObj: CollegeOption, mode: 'move' | 'copy') => {
    setLoadingMode(mode);
    try {
      await onConfirm(targetId, targetObj, mode);
      setShowWarningModal(false);
      setPendingAction(null);
      onClose();
    } catch (err) {
      console.error(`[MoveCollegeModal] ${mode} error:`, err);
    } finally {
      setLoadingMode(null);
    }
  };

  const collegeSelectOptions = colleges.map((c) => ({
    value: c._id,
    label: `${c.college_name} (${c.college_code})`,
    badge: c.college_code,
  }));

  const isLoading = loadingMode !== null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface text-fg rounded-2xl w-full max-w-2xl border border-border shadow-2xl p-6 space-y-4 animate-scaleIn">
        
        {/* Header with Top Right X Close Button */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ArrowLeftRight size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg">Move or Copy Companies</h3>
              <p className="text-[11px] text-fg-subtle">
                Re-assign or duplicate selected company calls and switch workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-7 h-7 rounded-lg hover:bg-surface-sunken text-fg-subtle hover:text-fg flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Content */}
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-900 dark:text-blue-200 text-xs font-medium leading-relaxed">
            You have selected <span className="font-bold underline">{selectedCount} company call row(s)</span>. Choose target college and action below:
          </div>

          <div>
            <label className="block text-xs font-semibold text-fg-muted mb-1.5 flex items-center gap-1.5">
              <Building2 size={13} className="text-primary" />
              <span>Target Destination College</span>
            </label>

            {fetchingColleges ? (
              <div className="flex items-center gap-2 text-fg-subtle py-2 text-xs">
                <Loader2 size={14} className="animate-spin text-primary" />
                Loading available colleges...
              </div>
            ) : colleges.length === 0 ? (
              <p className="text-xs text-rose-500 font-medium py-1">No other active colleges available.</p>
            ) : (
              <SmoothSelect
                value={selectedTargetId}
                onChange={setSelectedTargetId}
                icon={Building2}
                title="Select Target College"
                placeholder="Choose a college..."
                options={collegeSelectOptions}
                searchable={true}
                searchPlaceholder="Search college by name or code..."
              />
            )}
          </div>

          {/* Action Buttons (NO ICONS, NO CANCEL BUTTON) */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              disabled={isLoading || !selectedTargetId || colleges.length === 0}
              onClick={() => handleAction('copy')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98] text-center shadow-2xs shrink-0"
            >
              {loadingMode === 'copy' ? 'Copying Rows...' : 'Copy and Switch College'}
            </button>

            <button
              type="button"
              disabled={isLoading || !selectedTargetId || colleges.length === 0}
              onClick={() => handleAction('move')}
              className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-blue-700 text-primary-foreground text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98] text-center shadow-2xs shrink-0"
            >
              {loadingMode === 'move' ? 'Moving Rows...' : 'Move and Switch College'}
            </button>
          </div>
        </div>

      </div>

      {/* Out-of-Focus College Transfer Warning Confirmation Modal */}
      {showWarningModal && pendingAction && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface text-fg rounded-2xl w-full max-w-md border border-amber-500/30 shadow-2xl p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-fg">Confirm College Transfer</h4>
                <p className="text-[11px] text-fg-subtle">Transferring beyond focus selection</p>
              </div>
            </div>

            <p className="text-xs text-fg leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl font-medium">
              Do you still want to transfer these <span className="font-bold underline">{selectedCount} contact(s)</span> to <span className="font-bold">{pendingAction.targetObj.college_name} ({pendingAction.targetObj.college_code})</span> which is completely out of your focus selection college list for today?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowWarningModal(false);
                  setPendingAction(null);
                }}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-surface-sunken hover:bg-surface-raised text-fg-muted hover:text-fg text-xs font-semibold transition-all cursor-pointer border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeAction(pendingAction.targetId, pendingAction.targetObj, pendingAction.mode)}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-blue-700 text-primary-foreground text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
