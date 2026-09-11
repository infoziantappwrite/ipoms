'use client';

import { useState, useCallback, useEffect } from 'react';
import { TrackerRow } from './TrackerRow';
import type { TrackerRow as TrackerRowType } from '../page';
import { ClipboardList, Copy, Check, CheckSquare } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  rows: TrackerRowType[];
  isReadOnly: boolean;
  onRowUpdate: (rowId: string, patch: Partial<TrackerRowType>) => Promise<void>;
  onEdit?: (row: TrackerRowType) => void;
  onDelete: (rowId: string) => Promise<void>;
  onDeleteSelected?: (rowIds: string[]) => Promise<void>;
  onCall?: (row: TrackerRowType) => void;
}

export function TrackerGrid({ rows, isReadOnly, onRowUpdate, onEdit, onDelete, onDeleteSelected, onCall }: Props) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectionTheme, setSelectionTheme] = useState<'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'pink' | 'orange'>('blue');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [copiedContact, setCopiedContact] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedBoth, setCopiedBoth] = useState(false);
  const [copiedEntireRow, setCopiedEntireRow] = useState(false);
  const { toast } = useToast();

  const effectiveTheme = isDeleteMode ? 'rose' : selectionTheme;
  const isAllSelected = rows.length > 0 && selectedRowIds.size === rows.length;
  const isSomeSelected = selectedRowIds.size > 0 && selectedRowIds.size < rows.length;

  // Broadcast selection count and delete mode to parent header
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('ipoms_tracker_selection_count', {
        detail: { count: selectedRowIds.size, isDeleteMode },
      })
    );
  }, [selectedRowIds.size, isDeleteMode]);

  const handleToggleSelectMode = useCallback(() => {
    triggerHaptic('selection');
    setIsDeleteMode(false);
    setIsSelectMode((prev) => !prev);
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    triggerHaptic('selection');
    if (selectedRowIds.size === rows.length) {
      setSelectedRowIds(new Set());
      setLastSelectedIndex(null);
    } else {
      setSelectedRowIds(new Set(rows.map((r) => r._id)));
      setLastSelectedIndex(0);
    }
  }, [rows, selectedRowIds.size]);

  const handleToggleSelectRow = useCallback(
    (rowId: string, rowIndex?: number, shiftKey?: boolean) => {
      triggerHaptic('selection');
      setIsSelectMode(true);

      // Handle Shift+Click range selection (like Excel / Google Sheets)
      if (shiftKey && lastSelectedIndex !== null && rowIndex !== undefined && rowIndex !== lastSelectedIndex) {
        const start = Math.min(lastSelectedIndex, rowIndex);
        const end = Math.max(lastSelectedIndex, rowIndex);
        const rangeRows = rows.slice(start, end + 1);

        setSelectedRowIds((prev) => {
          const next = new Set(prev);
          rangeRows.forEach((r) => next.add(r._id));
          return next;
        });
        setLastSelectedIndex(rowIndex);
        return;
      }

      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        if (next.has(rowId)) {
          next.delete(rowId);
        } else {
          next.add(rowId);
        }
        return next;
      });

      if (rowIndex !== undefined) {
        setLastSelectedIndex(rowIndex);
      }
    },
    [rows, lastSelectedIndex]
  );

  const handleClearSelection = useCallback(() => {
    triggerHaptic('light');
    setSelectedRowIds(new Set());
    setIsSelectMode(false);
    setIsDeleteMode(false);
    setLastSelectedIndex(null);
    setSelectionTheme('blue');
  }, []);

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleCopyContacts = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectionTheme('blue');
    const targetRows = selectedRowIds.size > 0
      ? rows.filter((r) => selectedRowIds.has(r._id))
      : rows;

    const contactNumbers = targetRows
      .map((r) => r.mobile_number?.trim())
      .filter((num): num is string => Boolean(num && num.length > 0));

    if (contactNumbers.length === 0) {
      toast(selectedRowIds.size > 0 ? 'No mobile numbers found in selected rows.' : 'No contact numbers available to copy.', 'warning');
      return;
    }

    const textToCopy = contactNumbers.join('\n');
    try {
      await copyToClipboard(textToCopy);
      triggerHaptic('success');
      setCopiedContact(true);
      toast(`Copied ${contactNumbers.length} contact number${contactNumbers.length > 1 ? 's' : ''}`, 'success');
      setTimeout(() => setCopiedContact(false), 2000);
    } catch {
      toast('Failed to copy contact numbers to clipboard', 'error');
    }
  }, [rows, selectedRowIds, toast]);

  const handleCopyEmails = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectionTheme('emerald');
    const targetRows = selectedRowIds.size > 0
      ? rows.filter((r) => selectedRowIds.has(r._id))
      : rows;

    const emailIds = targetRows
      .map((r) => r.email_id?.trim())
      .filter((email): email is string => Boolean(email && email.length > 0));

    if (emailIds.length === 0) {
      toast(selectedRowIds.size > 0 ? 'No email IDs found in selected rows.' : 'No email IDs available to copy.', 'warning');
      return;
    }

    const textToCopy = emailIds.join('\n');
    try {
      await copyToClipboard(textToCopy);
      triggerHaptic('success');
      setCopiedEmail(true);
      toast(`Copied ${emailIds.length} email ID${emailIds.length > 1 ? 's' : ''}`, 'success');
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      toast('Failed to copy email IDs to clipboard', 'error');
    }
  }, [rows, selectedRowIds, toast]);

  const handleCopyBoth = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectionTheme('purple');
    const targetRows = selectedRowIds.size > 0
      ? rows.filter((r) => selectedRowIds.has(r._id))
      : rows;

    const validRows = targetRows.filter(
      (r) => Boolean((r.mobile_number && r.mobile_number.trim()) || (r.email_id && r.email_id.trim()))
    );

    if (validRows.length === 0) {
      toast(selectedRowIds.size > 0 ? 'No mobile numbers or emails found in selected rows.' : 'No contact data available to copy.', 'warning');
      return;
    }

    // Format: "Mobile \t Email" (tab-separated per line for easy paste in Excel, Sheets & WhatsApp)
    const lines = validRows.map((r) => {
      const mobile = r.mobile_number?.trim() || '';
      const email = r.email_id?.trim() || '';
      return `${mobile}\t${email}`;
    });

    const textToCopy = lines.join('\n');
    try {
      await copyToClipboard(textToCopy);
      triggerHaptic('success');
      setCopiedBoth(true);
      toast(`Copied ${validRows.length} phone & email record${validRows.length > 1 ? 's' : ''}`, 'success');
      setTimeout(() => setCopiedBoth(false), 2000);
    } catch {
      toast('Failed to copy data to clipboard', 'error');
    }
  }, [rows, selectedRowIds, toast]);

  const handleCopyEntireRow = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    setSelectionTheme('pink');

    if (selectedRowIds.size === 0) {
      toast('Please select at least 1 row first to copy.', 'warning');
      return;
    }

    const targetRows = rows.filter((r) => selectedRowIds.has(r._id));

    if (targetRows.length === 0) {
      toast('No rows available to copy.', 'warning');
      return;
    }

    const outcomeLabels: Record<string, string> = {
      jd_received: 'JD Received',
      hiring_freezed: 'Hiring Freezed',
      hiring_completed: 'Hiring Completed',
      call_back: 'Call Back',
      hiring: 'Hiring',
      invite_mail: 'Invite Mail',
      not_hiring: 'Not Hiring',
      no_response: 'No Response',
      follow_up: 'Follow Up',
      in_connect: 'In Connect',
      invalid: 'Invalid',
      drive_completed: 'Drive Completed',
    };

    const formatTimeVal = (d?: string | Date) => {
      if (!d) return '';
      const date = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const dataRows = targetRows.map((r, i) => {
      const sNo = (r.serial_no || i + 1).toString();
      const startTime = formatTimeVal(r.call_start_time);
      const endTime = formatTimeVal(r.call_end_time);
      const duration = r.duration_formatted || '';
      const company = (r.company_name || '').replace(/[\t\n\r]+/g, ' ').trim();
      const hr = (r.hr_name || '').replace(/[\t\n\r]+/g, ' ').trim();
      const contact = (r.mobile_number || '').trim();
      const email = (r.email_id || '').trim();
      const coordinator = isReadOnly ? (r.coordinator_name || '').trim() : '';
      const outcome = r.outcome_status ? (outcomeLabels[r.outcome_status] || r.outcome_status) : '';
      const followUp = (r.follow_up_month || '').trim();
      const comments = (r.comments || '').replace(/[\t\n\r]+/g, ' ').trim();

      const cols = [
        sNo,
        startTime,
        endTime,
        duration,
        company,
        hr,
        contact,
        email,
        ...(isReadOnly ? [coordinator] : []),
        outcome,
        followUp,
        comments,
      ];

      return cols.join('\t');
    });

    const textToCopy = dataRows.join('\n');

    try {
      await copyToClipboard(textToCopy);
      triggerHaptic('success');
      setCopiedEntireRow(true);
      const count = selectedRowIds.size > 0 ? selectedRowIds.size : targetRows.length;
      toast(`Copied ${count} selected row${count > 1 ? 's' : ''}`, 'success');
      setTimeout(() => setCopiedEntireRow(false), 2000);
    } catch {
      toast('Failed to copy row data to clipboard', 'error');
    }
  }, [rows, selectedRowIds, isReadOnly, toast]);

  const handleCopyAll = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    setSelectionTheme('orange');
    if (rows.length === 0) {
      toast('No rows available to copy.', 'warning');
      return;
    }

    // Select all rows
    setSelectedRowIds(new Set(rows.map((r) => r._id)));
    setIsSelectMode(true);

    const outcomeLabels: Record<string, string> = {
      jd_received: 'JD Received',
      hiring_freezed: 'Hiring Freezed',
      hiring_completed: 'Hiring Completed',
      call_back: 'Call Back',
      hiring: 'Hiring',
      invite_mail: 'Invite Mail',
      not_hiring: 'Not Hiring',
      no_response: 'No Response',
      follow_up: 'Follow Up',
      in_connect: 'In Connect',
      invalid: 'Invalid',
      drive_completed: 'Drive Completed',
    };

    const formatTimeVal = (d?: string | Date) => {
      if (!d) return '';
      const date = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const dataRows = rows.map((r, i) => {
      const sNo = (r.serial_no || i + 1).toString();
      const startTime = formatTimeVal(r.call_start_time);
      const endTime = formatTimeVal(r.call_end_time);
      const duration = r.duration_formatted || '';
      const company = (r.company_name || '').replace(/[\t\n\r]+/g, ' ').trim();
      const hr = (r.hr_name || '').replace(/[\t\n\r]+/g, ' ').trim();
      const contact = (r.mobile_number || '').trim();
      const email = (r.email_id || '').trim();
      const coordinator = isReadOnly ? (r.coordinator_name || '').trim() : '';
      const outcome = r.outcome_status ? (outcomeLabels[r.outcome_status] || r.outcome_status) : '';
      const followUp = (r.follow_up_month || '').trim();
      const comments = (r.comments || '').replace(/[\t\n\r]+/g, ' ').trim();

      const cols = [
        sNo,
        startTime,
        endTime,
        duration,
        company,
        hr,
        contact,
        email,
        ...(isReadOnly ? [coordinator] : []),
        outcome,
        followUp,
        comments,
      ];

      return cols.join('\t');
    });

    const textToCopy = dataRows.join('\n');

    try {
      await copyToClipboard(textToCopy);
      triggerHaptic('success');
      setCopiedEntireRow(true);
      toast(`Copied all ${rows.length} rows to clipboard`, 'success');
      setTimeout(() => setCopiedEntireRow(false), 2000);
    } catch {
      toast('Failed to copy row data to clipboard', 'error');
    }
  }, [rows, isReadOnly, toast]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedRowIds.size === 0) return;
    const idsToDelete = Array.from(selectedRowIds);
    if (onDeleteSelected) {
      await onDeleteSelected(idsToDelete);
      const count = idsToDelete.length;
      setSelectedRowIds(new Set());
      setIsSelectMode(false);
      setIsDeleteMode(false);
      triggerHaptic('success');
      toast(`${count} ${count === 1 ? 'row' : 'rows'} deleted`, 'success');
    }
  }, [selectedRowIds, onDeleteSelected, toast]);

  const handleToggleDeleteMode = useCallback(() => {
    triggerHaptic('selection');
    if (selectedRowIds.size > 0 && isDeleteMode) {
      window.dispatchEvent(new CustomEvent('ipoms_tracker_open_delete_confirm'));
      return;
    }
    setIsDeleteMode((prev) => {
      const next = !prev;
      setIsSelectMode(next);
      return next;
    });
  }, [selectedRowIds.size, isDeleteMode]);

  // Listen for actions dispatched from top Actions dropdown / Header
  useEffect(() => {
    const handleToggleSelect = () => {
      handleToggleSelectMode();
    };

    const handleTriggerCopyAll = () => {
      handleCopyAll();
    };

    const handleTriggerCopyContacts = () => {
      handleCopyContacts({ stopPropagation: () => {} } as any);
    };

    const handleTriggerCopyEmails = () => {
      handleCopyEmails({ stopPropagation: () => {} } as any);
    };

    const handleTriggerCopyBoth = () => {
      handleCopyBoth({ stopPropagation: () => {} } as any);
    };

    const handleTriggerCopyEntireRow = () => {
      handleCopyEntireRow({ stopPropagation: () => {} } as any);
    };

    const handleExecuteDelete = () => {
      handleDeleteSelected();
    };

    const handleExitDelete = () => {
      setIsDeleteMode(false);
      setIsSelectMode(false);
      setSelectedRowIds(new Set());
    };

    window.addEventListener('ipoms_tracker_toggle_delete_mode', handleToggleDeleteMode);
    window.addEventListener('ipoms_tracker_toggle_select_mode', handleToggleSelect);
    window.addEventListener('ipoms_tracker_copy_all', handleTriggerCopyAll);
    window.addEventListener('ipoms_tracker_copy_contacts', handleTriggerCopyContacts);
    window.addEventListener('ipoms_tracker_copy_emails', handleTriggerCopyEmails);
    window.addEventListener('ipoms_tracker_copy_both', handleTriggerCopyBoth);
    window.addEventListener('ipoms_tracker_copy_entire_row', handleTriggerCopyEntireRow);
    window.addEventListener('ipoms_tracker_execute_delete_selected', handleExecuteDelete);
    window.addEventListener('ipoms_tracker_exit_delete_mode', handleExitDelete);

    return () => {
      window.removeEventListener('ipoms_tracker_toggle_delete_mode', handleToggleDeleteMode);
      window.removeEventListener('ipoms_tracker_toggle_select_mode', handleToggleSelect);
      window.removeEventListener('ipoms_tracker_copy_all', handleTriggerCopyAll);
      window.removeEventListener('ipoms_tracker_copy_contacts', handleTriggerCopyContacts);
      window.removeEventListener('ipoms_tracker_copy_emails', handleTriggerCopyEmails);
      window.removeEventListener('ipoms_tracker_copy_both', handleTriggerCopyBoth);
      window.removeEventListener('ipoms_tracker_copy_entire_row', handleTriggerCopyEntireRow);
      window.removeEventListener('ipoms_tracker_execute_delete_selected', handleExecuteDelete);
      window.removeEventListener('ipoms_tracker_exit_delete_mode', handleExitDelete);
    };
  }, [
    selectedRowIds,
    isDeleteMode,
    handleDeleteSelected,
    handleToggleDeleteMode,
    handleToggleSelectMode,
    handleCopyAll,
    handleCopyContacts,
    handleCopyEmails,
    handleCopyBoth,
    handleCopyEntireRow,
    toast,
  ]);

  // ── Sheet-like Keyboard Shortcuts: Ctrl+A (Select All), Ctrl+C (Copy Rows), Escape (Clear) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const activeEl = document.activeElement;
      const isEditingInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.getAttribute('contenteditable') === 'true');

      // 1. Escape: Clear Row Selection / Exit Delete Mode
      if (e.key === 'Escape') {
        if (selectedRowIds.size > 0 || isSelectMode || isDeleteMode) {
          e.preventDefault();
          handleClearSelection();
        }
        return;
      }

      // 2. Ctrl+A / Cmd+A: Copy All Rows (when not focused in an input/textarea)
      if (isCmdOrCtrl && (e.key === 'a' || e.key === 'A')) {
        if (!isEditingInput && rows.length > 0) {
          e.preventDefault();
          handleCopyAll(e as any);
        }
        return;
      }

      // 3. Ctrl+C / Cmd+C: Copy Selected Rows (ONLY when rows are selected)
      if (isCmdOrCtrl && (e.key === 'c' || e.key === 'C')) {
        const highlightedText = typeof window !== 'undefined' ? window.getSelection()?.toString() : '';
        // If the user has highlighted specific text with mouse in a cell or input, let browser native copy handle it
        if (highlightedText && highlightedText.trim().length > 0) {
          return;
        }

        // Only copy row data if rows are explicitly selected!
        if (!isEditingInput && selectedRowIds.size > 0) {
          e.preventDefault();
          handleCopyEntireRow(e as any);
        }
        return;
      }

      // 4. Shift+D / Shift+d: Delete Selected Rows (or Toggle Delete Mode)
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'd' || e.key === 'D')) {
        if (!isEditingInput) {
          e.preventDefault();
          if (selectedRowIds.size > 0) {
            window.dispatchEvent(new CustomEvent('ipoms_tracker_open_delete_confirm'));
          } else {
            handleToggleDeleteMode();
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, selectedRowIds, isSelectMode, isDeleteMode, handleDeleteSelected, handleToggleDeleteMode, handleClearSelection, handleCopyAll, handleCopyEntireRow, toast]);

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-400">
          <ClipboardList size={26} strokeWidth={1.75} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">
            {isReadOnly ? 'No Calls Logged on this Date' : 'Daily Calling Register Ready'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {isReadOnly
              ? 'There are no call records for the selected date.'
              : 'Click "Load Contacts" in the toolbar to populate your target company contacts for today.'}
          </p>
        </div>
      </div>
    );
  }

  const gridTemplate = isReadOnly
    ? 'grid-cols-[56px_100px_90px_90px_260px_200px_220px_250px_150px_180px_150px_minmax(260px,1fr)]'
    : 'grid-cols-[56px_100px_90px_90px_260px_200px_220px_250px_180px_150px_minmax(260px,1fr)]';

  return (
    <div className="flex-1 relative flex flex-col min-h-0">
      {/* Grid Container */}
      <div className="flex-1 overflow-auto rounded-xl border border-border bg-surface">
        <div className={isReadOnly ? 'min-w-[2016px]' : 'min-w-[1866px]'}>
          {/* Sticky Column Headers (Exact Sheet-grade CSS Grid) */}
          <div className={`sticky top-0 z-20 grid ${gridTemplate} divide-x divide-border bg-surface-sunken border-b border-border text-xs font-semibold text-fg-subtle uppercase tracking-wider shadow-2xs whitespace-nowrap select-none`}>
            {/* S.No / Select Toggle Button & Master Checkbox (Frozen Col 1) */}
            <div className="sticky left-0 top-0 z-30 bg-surface-sunken px-1.5 py-2 flex items-center justify-center gap-1 whitespace-nowrap">
              {isSelectMode || selectedRowIds.size > 0 ? (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  title={isAllSelected ? 'Deselect all rows' : isDeleteMode ? 'Select all rows to delete' : 'Select all rows to copy'}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 ${
                    effectiveTheme === 'rose'
                      ? isAllSelected
                        ? 'bg-rose-600 border-rose-600 text-white scale-105 ring-2 ring-rose-500/30'
                        : isSomeSelected
                        ? 'bg-rose-500/20 border-rose-500 text-rose-600'
                        : 'border-rose-400 dark:border-rose-500 hover:border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 ring-1 ring-rose-400/25 text-rose-600'
                      : effectiveTheme === 'emerald'
                      ? isAllSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white scale-105 ring-2 ring-emerald-500/30'
                        : isSomeSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600'
                        : 'border-emerald-400 dark:border-emerald-500 hover:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-400/25 text-emerald-600'
                      : effectiveTheme === 'purple'
                      ? isAllSelected
                        ? 'bg-purple-600 border-purple-600 text-white scale-105 ring-2 ring-purple-500/30'
                        : isSomeSelected
                        ? 'bg-purple-500/20 border-purple-500 text-purple-600'
                        : 'border-purple-400 dark:border-purple-500 hover:border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-400/25 text-purple-600'
                      : effectiveTheme === 'amber'
                      ? isAllSelected
                        ? 'bg-amber-600 border-amber-600 text-white scale-105 ring-2 ring-amber-500/30'
                        : isSomeSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-600'
                        : 'border-amber-400 dark:border-amber-500 hover:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-400/25 text-amber-600'
                      : isAllSelected
                      ? 'bg-blue-600 border-blue-600 text-white scale-105 ring-2 ring-blue-500/30'
                      : isSomeSelected
                      ? 'bg-blue-500/20 border-blue-500 text-blue-600'
                      : 'border-blue-400 dark:border-blue-500 hover:border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-400/25 text-blue-600'
                  }`}
                >
                  {isAllSelected && <Check size={11} strokeWidth={3} />}
                  {isSomeSelected && !isAllSelected && (
                    <span className={`w-2 h-0.5 rounded-full ${
                      effectiveTheme === 'rose' ? 'bg-rose-600' :
                      effectiveTheme === 'emerald' ? 'bg-emerald-600' :
                      effectiveTheme === 'purple' ? 'bg-purple-600' :
                      effectiveTheme === 'amber' ? 'bg-amber-600' : 'bg-blue-600'
                    }`} />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleSelectMode}
                  title="Click to enable selection mode (Select rows randomly)"
                  className="w-4 h-4 rounded border border-border-strong hover:border-primary bg-surface hover:bg-primary/10 text-fg-subtle hover:text-primary flex items-center justify-center transition-all cursor-pointer shadow-2xs group/btn"
                >
                  <CheckSquare size={11} strokeWidth={2.4} className="group-hover/btn:scale-110 transition-transform" />
                </button>
              )}
              <span className="text-[10px] font-bold text-fg-subtle">#</span>
            </div>

            {/* Start Time (Frozen Col 2) */}
            <div className="sticky left-[56px] top-0 z-30 bg-surface-sunken px-2.5 py-2.5 flex items-center whitespace-nowrap">Start Time</div>

            {/* End Time (Frozen Col 3) */}
            <div className="sticky left-[156px] top-0 z-30 bg-surface-sunken px-2.5 py-2.5 flex items-center whitespace-nowrap">End Time</div>

            {/* Duration (Frozen Col 4) */}
            <div className="sticky left-[246px] top-0 z-30 bg-surface-sunken px-2.5 py-2.5 flex items-center whitespace-nowrap">Duration</div>

            {/* Company Name (Frozen Col 5 with Right Divider) */}
            <div className="sticky left-[336px] top-0 z-30 bg-surface-sunken px-2.5 py-2.5 flex items-center whitespace-nowrap border-r-2 border-border-strong shadow-[6px_0_12px_-3px_rgba(0,0,0,0.12)] dark:shadow-[6px_0_12px_-3px_rgba(0,0,0,0.6)]">Company Name</div>

            <div className="bg-surface-sunken px-2.5 py-2.5 flex items-center whitespace-nowrap">HR Name</div>

            {/* Contact Header with Selective Copy Icon */}
            <div className="bg-surface-sunken px-2.5 py-2 flex items-center gap-1.5 whitespace-nowrap">
              <span>Contact</span>
              <button
                type="button"
                onClick={handleCopyContacts}
                title={
                  selectedRowIds.size > 0
                    ? `Copy mobile numbers for ${selectedRowIds.size} selected row(s)`
                    : 'Copy all loaded contact numbers'
                }
                className="w-5 h-5 rounded flex items-center justify-center bg-surface hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-border/80 hover:border-blue-400/40 transition-all cursor-pointer shadow-2xs active:scale-[0.96]"
              >
                {copiedContact ? (
                  <Check size={11} className="text-blue-600 stroke-[2.5]" />
                ) : (
                  <Copy size={11} strokeWidth={2} />
                )}
              </button>
            </div>

            {/* Email ID Header with Selective Copy Icon */}
            <div className="bg-surface-sunken px-2.5 py-2 flex items-center gap-1.5 whitespace-nowrap">
              <span>Email ID</span>
              <button
                type="button"
                onClick={handleCopyEmails}
                title={
                  selectedRowIds.size > 0
                    ? `Copy email IDs for ${selectedRowIds.size} selected row(s)`
                    : 'Copy all loaded email IDs'
                }
                className="w-5 h-5 rounded flex items-center justify-center bg-surface hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-border/80 hover:border-emerald-400/40 transition-all cursor-pointer shadow-2xs active:scale-[0.96]"
              >
                {copiedEmail ? (
                  <Check size={11} className="text-emerald-600 stroke-[2.5]" />
                ) : (
                  <Copy size={11} strokeWidth={2} />
                )}
              </button>
            </div>

            {isReadOnly && (
              <div className="bg-surface-sunken px-2.5 py-2.5 flex items-center whitespace-nowrap">Coordinator</div>
            )}
            <div className="bg-surface-sunken px-2.5 py-2.5 flex items-center whitespace-nowrap">Call Status</div>
            <div className="bg-surface-sunken px-2.5 py-2.5 flex items-center whitespace-nowrap">Follow Up</div>
            <div className="bg-surface-sunken px-2.5 py-2.5 flex items-center whitespace-nowrap">Comments</div>
          </div>

          {/* Rows with clear bordered separation */}
          <div className="divide-y divide-border border-b border-border">
            {rows.map((row, index) => (
              <TrackerRow
                key={row._id}
                row={row}
                index={index + 1}
                isSelected={selectedRowIds.has(row._id)}
                isSelectMode={isSelectMode}
                isDeleteMode={isDeleteMode}
                selectionTheme={effectiveTheme}
                isReadOnly={isReadOnly}
                onUpdate={(patch) => onRowUpdate(row._id, patch)}
                onEdit={onEdit}
                onDelete={() => onDelete(row._id)}
                onCall={onCall}
                onToggleSelect={handleToggleSelectRow}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



