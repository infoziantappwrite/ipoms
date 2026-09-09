'use client';

import { useState, useEffect, useRef } from 'react';
import { FolderOpen, Phone, Mail, Calendar, Copy, Check, GripVertical } from 'lucide-react';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import { CompanyTypeDropdown } from './CompanyTypeDropdown';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { validateAndNormalizeIndianMobile, validateAndNormalizeEmail } from '@/lib/contactValidation';
import { useToast } from '@/components/ui/Toast';
import { triggerHaptic } from '@/lib/haptics';

export interface WeeklyRow {
  _id: string;
  company_name: string;
  job_role: string;
  contact_number?: string;
  mobile_numbers?: string[];
  email_id?: string;
  email_ids?: string[];
  jd_received_date?: string;
  db_shared_date?: string;
  cdc_reference?: string;
  company_type?: string;
  ctc_lpa?: string;
  eligible_batch?: string;
  pipeline_section: string;
  is_pinned_top: boolean;
  current_status_text: string;
  follow_up_date?: string;
  drive_date?: string;
  registered_count?: number;
  shortlisted_count?: number;
  selected_count?: number;
  order_index?: number;
  last_status_updated_at?: string;
}

interface Props {
  rows: WeeklyRow[];
  sectionKey: string;
  isDeleteMode?: boolean;
  selectedRowIds?: string[];
  onToggleSelectRow?: (rowId: string) => void;
  onToggleSelectAll?: () => void;
  onUpdateRow: (rowId: string, patch: Partial<WeeklyRow>) => Promise<void>;
  onMoveSection: (rowId: string, newSection: string) => Promise<void>;
  onTogglePin: (rowId: string) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
  onReorderRows?: (newRows: WeeklyRow[]) => void;
  onMoveRowCrossSection?: (
    rowId: string,
    sourceSectionKey: string,
    targetSectionKey: string,
    targetIndex?: number
  ) => void;
  onEditRow?: (row: WeeklyRow) => void;
}

async function copyToClipboard(text: string) {
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
}

export function WeeklyTable({
  rows,
  sectionKey,
  isDeleteMode = false,
  selectedRowIds = [],
  onToggleSelectRow,
  onToggleSelectAll,
  onUpdateRow,
  onMoveSection,
  onTogglePin,
  onDeleteRow,
  onReorderRows,
  onMoveRowCrossSection,
  onEditRow,
}: Props) {
  const { toast } = useToast();
  const [copiedContact, setCopiedContact] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const isCompletedSection = sectionKey === 'completed';
  const hasFollowUpColumn = ['drive_in_progress', 'in_drive', 'companies_in_drive', 'upcoming_drives', 'in_progress', 'pipeline', 'follow_ups_due_today'].includes(sectionKey);
  const hasContactAndEmail = ['drive_in_progress', 'in_drive', 'companies_in_drive', 'upcoming_drives', 'in_progress', 'pipeline'].includes(sectionKey);
  const hasJdDbDates = ['drive_in_progress', 'in_drive', 'companies_in_drive', 'upcoming_drives', 'in_progress'].includes(sectionKey);

  // Local rows state for real-time optimistic swapping
  const [localRows, setLocalRows] = useState<WeeklyRow[]>(rows);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [crossSectionOverIndex, setCrossSectionOverIndex] = useState<number | null>(null);
  const [isTableDragOver, setIsTableDragOver] = useState(false);

  useEffect(() => {
    // If in pipeline, auto-sort by follow_up_date ascending (dated first, undated second)
    if (sectionKey === 'pipeline') {
      const sorted = [...rows].sort((a, b) => {
        const dateA = a.follow_up_date ? new Date(a.follow_up_date).getTime() : null;
        const dateB = b.follow_up_date ? new Date(b.follow_up_date).getTime() : null;
        if (dateA !== null && dateB !== null) {
          if (dateA !== dateB) return dateA - dateB;
        } else if (dateA !== null && dateB === null) {
          return -1;
        } else if (dateA === null && dateB !== null) {
          return 1;
        }
        const orderA = typeof a.order_index === 'number' ? a.order_index : 0;
        const orderB = typeof b.order_index === 'number' ? b.order_index : 0;
        if (orderA !== orderB) return orderA - orderB;
        return 0;
      });
      setLocalRows(sorted);
    } else {
      setLocalRows(rows);
    }
  }, [rows, sectionKey]);

  // Global drag cleanup and Escape key listener
  useEffect(() => {
    const handleGlobalReset = () => {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setCrossSectionOverIndex(null);
      setIsTableDragOver(false);
      (window as any).__ipoms_dragged_weekly_row = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleGlobalReset();
      }
    };

    window.addEventListener('dragend', handleGlobalReset);
    window.addEventListener('drop', handleGlobalReset);
    window.addEventListener('mouseup', handleGlobalReset);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('dragend', handleGlobalReset);
      window.removeEventListener('drop', handleGlobalReset);
      window.removeEventListener('mouseup', handleGlobalReset);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDragStart = (index: number, e: React.DragEvent) => {
    const row = localRows[index];
    if (!row) return;
    const item = {
      rowId: row._id,
      sourceSectionKey: sectionKey,
      sourceIndex: index,
      companyName: row.company_name,
    };
    (window as any).__ipoms_dragged_weekly_row = item;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.setData('text/plain', row._id);
    triggerHaptic('selection');
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const globalDragged = (window as any).__ipoms_dragged_weekly_row;
    if (globalDragged && globalDragged.sourceSectionKey !== sectionKey) {
      if (crossSectionOverIndex !== index) {
        setCrossSectionOverIndex(index);
      }
    } else {
      if (dragOverIndex !== index) {
        setDragOverIndex(index);
      }
    }
  };

  const handleDrop = (targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const globalDragged = (window as any).__ipoms_dragged_weekly_row;
    let dragData: any = globalDragged;
    if (!dragData) {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) dragData = JSON.parse(raw);
      } catch {}
    }

    if (!dragData) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setCrossSectionOverIndex(null);
      return;
    }

    if (dragData.sourceSectionKey !== sectionKey) {
      // ── Cross-Section Drop: Move row from sourceSection to targetSection at targetIndex ──
      if (onMoveRowCrossSection) {
        onMoveRowCrossSection(dragData.rowId, dragData.sourceSectionKey, sectionKey, targetIndex);
      }
    } else {
      // ── Intra-Section Drop: Reorder rows within this section ──
      const srcIdx = draggedIndex !== null ? draggedIndex : dragData.sourceIndex;
      if (srcIdx === targetIndex || srcIdx === null || srcIdx === undefined) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        setCrossSectionOverIndex(null);
        return;
      }

      const updated = [...localRows];
      const [moved] = updated.splice(srcIdx, 1);
      updated.splice(targetIndex, 0, moved);

      // Explicitly re-index order_index sequentially (0, 1, 2, ...)
      const sequenced = updated.map((r, i) => ({ ...r, order_index: i }));

      setLocalRows(sequenced);
      triggerHaptic('medium');

      if (onReorderRows) {
        onReorderRows(sequenced);
      }
    }

    (window as any).__ipoms_dragged_weekly_row = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
    setCrossSectionOverIndex(null);
    setIsTableDragOver(false);
  };

  const handleDragEnd = () => {
    (window as any).__ipoms_dragged_weekly_row = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
    setCrossSectionOverIndex(null);
    setIsTableDragOver(false);
  };

  if (localRows.length === 0) {
    return (
      <div
        onDragOver={(e) => {
          const globalDragged = (window as any).__ipoms_dragged_weekly_row;
          if (globalDragged && globalDragged.sourceSectionKey !== sectionKey) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!isTableDragOver) setIsTableDragOver(true);
          }
        }}
        onDragLeave={() => setIsTableDragOver(false)}
        onDrop={(e) => {
          setIsTableDragOver(false);
          const globalDragged = (window as any).__ipoms_dragged_weekly_row;
          let dragData: any = globalDragged;
          if (!dragData) {
            try {
              const raw = e.dataTransfer.getData('application/json');
              if (raw) dragData = JSON.parse(raw);
            } catch {}
          }
          if (dragData && dragData.sourceSectionKey !== sectionKey) {
            e.preventDefault();
            e.stopPropagation();
            onMoveRowCrossSection?.(dragData.rowId, dragData.sourceSectionKey, sectionKey, 0);
            (window as any).__ipoms_dragged_weekly_row = null;
          }
        }}
        className={`py-8 text-center flex flex-col items-center justify-center gap-2 transition-all ${
          isTableDragOver
            ? 'bg-primary/10 border-2 border-dashed border-primary rounded-lg py-10 scale-[0.99]'
            : ''
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-surface-sunken border border-border flex items-center justify-center text-fg-subtle">
          <FolderOpen size={18} strokeWidth={1.75} className={isTableDragOver ? 'text-primary' : ''} />
        </div>
        <p className={`text-xs font-medium ${isTableDragOver ? 'text-primary font-bold animate-pulse' : 'text-fg-subtle'}`}>
          {isTableDragOver ? 'Drop company here to move into this section' : 'No companies in this section'}
        </p>
      </div>
    );
  }

  // Copy contact numbers for this section
  const handleCopyContacts = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetRows = selectedRowIds.length > 0
      ? localRows.filter((r) => selectedRowIds.includes(r._id))
      : localRows;

    const contactNumbers = targetRows
      .map((r) => r.contact_number?.trim() || (r.mobile_numbers && r.mobile_numbers[0]?.trim()))
      .filter((num): num is string => Boolean(num && num.length > 0));

    if (contactNumbers.length === 0) {
      toast(selectedRowIds.length > 0 ? 'No contact numbers found in selected rows.' : 'No contact numbers available in this section to copy.', 'warning');
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
  };

  // Copy email IDs for this section
  const handleCopyEmails = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetRows = selectedRowIds.length > 0
      ? localRows.filter((r) => selectedRowIds.includes(r._id))
      : localRows;

    const emailIds = targetRows
      .map((r) => r.email_id?.trim() || (r.email_ids && r.email_ids[0]?.trim()))
      .filter((email): email is string => Boolean(email && email.length > 0));

    if (emailIds.length === 0) {
      toast(selectedRowIds.length > 0 ? 'No email IDs found in selected rows.' : 'No email IDs available in this section to copy.', 'warning');
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
  };

  // Dynamically calculate the email column width based on the longest email in the dataset
  const longestEmailLength = localRows.reduce((max, r) => {
    const email = r.email_id || (r.email_ids && r.email_ids[0]) || '';
    return email.length > max ? email.length : max;
  }, 0);

  // Each character in 12px font is ~7.5px - 8px. Plus email icon (20px) + copy button (24px) + gap/padding (40px) + extra safety margin (24px).
  // Minimum width 220px, dynamically scaling up to fit full email ID without truncation.
  const dynamicEmailWidth = hasContactAndEmail
    ? Math.max(220, Math.ceil(longestEmailLength * 8) + 76)
    : 0;

  // Compute sticky offsets
  const deleteColWidth = 40;
  const sNoWidth = 48;
  const companyWidth = 200;
  const contactWidth = 160;

  const sNoLeft = isDeleteMode ? deleteColWidth : 0;
  const companyLeft = sNoLeft + sNoWidth;
  const contactLeft = companyLeft + companyWidth;
  const emailLeft = contactLeft + contactWidth;
  const roleLeft = hasContactAndEmail ? emailLeft + dynamicEmailWidth : companyLeft + companyWidth;
  const ctcLeft = roleLeft + 160;
  const sectionSelectedCount = localRows.filter((r) => selectedRowIds.includes(r._id)).length;
  const isAllSectionSelected = localRows.length > 0 && sectionSelectedCount === localRows.length;
  const isPartiallySectionSelected = sectionSelectedCount > 0 && sectionSelectedCount < localRows.length;

  return (
    <div className="overflow-x-auto bg-white dark:bg-[#161D2E]">
      <table className="w-full text-xs text-left border-separate border-spacing-0 bg-white dark:bg-[#161D2E]">
        <thead>
          <tr className="bg-[#F1F5F9] dark:bg-[#0D111C] text-fg-muted font-semibold border-b border-border uppercase tracking-wider text-micro select-none">
            {isDeleteMode && (
              <th
                style={{ left: 0 }}
                className="sticky z-30 bg-[#F1F5F9] dark:bg-[#0D111C] py-2.5 px-2 w-10 min-w-[40px] max-w-[40px] text-center border-b border-border"
              >
                <input
                  type="checkbox"
                  checked={isAllSectionSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isPartiallySectionSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                  title={isAllSectionSelected ? "Deselect all in this section" : "Select all in this section"}
                />
              </th>
            )}

            {/* Frozen 1: S.No */}
            <th
              style={{ left: sNoLeft }}
              className="sticky z-30 bg-[#F1F5F9] dark:bg-[#0D111C] py-2.5 px-3 w-12 min-w-[48px] max-w-[48px] text-center border-b border-border"
              title="Drag or long-press row to reorder"
            >
              S.No
            </th>

            {/* Frozen 2: Company Name */}
            <th
              style={{ left: companyLeft }}
              className="sticky z-30 bg-[#F1F5F9] dark:bg-[#0D111C] py-2.5 px-3 w-[200px] min-w-[200px] max-w-[200px] text-left border-b border-border"
            >
              Company Name <span className="text-rose-500 font-bold">*</span>
            </th>
            
            {/* Frozen 3 & 4 (if hasContactAndEmail): Contact & Email with small copy buttons */}
            {hasContactAndEmail && (
              <>
                <th
                  style={{ left: contactLeft }}
                  className="sticky z-30 bg-[#F1F5F9] dark:bg-[#0D111C] py-2 px-3 w-[160px] min-w-[160px] max-w-[160px] text-left border-b border-border select-none"
                  title="Contact Number"
                >
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Phone size={13} strokeWidth={2.5} />
                    <span className="font-bold text-[11px] uppercase tracking-wider">Contact</span>
                    <button
                      type="button"
                      onClick={handleCopyContacts}
                      title={
                        selectedRowIds.length > 0
                          ? `Copy contact numbers for ${selectedRowIds.length} selected row(s)`
                          : 'Copy all contact numbers in this section'
                      }
                      className="w-5 h-5 rounded flex items-center justify-center bg-white dark:bg-[#161D2E] hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-border/80 hover:border-blue-400/40 transition-all cursor-pointer shadow-2xs active:scale-[0.95] ml-0.5"
                    >
                      {copiedContact ? (
                        <Check size={11} strokeWidth={2.8} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy size={11} strokeWidth={2} />
                      )}
                    </button>
                  </div>
                </th>
                <th
                  style={{ left: emailLeft, width: dynamicEmailWidth, minWidth: dynamicEmailWidth }}
                  className="sticky z-30 bg-[#F1F5F9] dark:bg-[#0D111C] py-2 px-3 text-left border-b border-border select-none"
                  title="Email ID"
                >
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    <Mail size={13} strokeWidth={2.5} />
                    <span className="font-bold text-[11px] uppercase tracking-wider">Email</span>
                    <button
                      type="button"
                      onClick={handleCopyEmails}
                      title={
                        selectedRowIds.length > 0
                          ? `Copy email IDs for ${selectedRowIds.length} selected row(s)`
                          : 'Copy all email IDs in this section'
                      }
                      className="w-5 h-5 rounded flex items-center justify-center bg-white dark:bg-[#161D2E] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-border/80 hover:border-indigo-400/40 transition-all cursor-pointer shadow-2xs active:scale-[0.95] ml-0.5"
                    >
                      {copiedEmail ? (
                        <Check size={11} strokeWidth={2.8} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy size={11} strokeWidth={2} />
                      )}
                    </button>
                  </div>
                </th>
              </>
            )}

            {/* Frozen 5: Role */}
            <th
              style={{ left: roleLeft }}
              className="sticky z-30 bg-[#F1F5F9] dark:bg-[#0D111C] py-2.5 px-3 w-[160px] min-w-[160px] max-w-[160px] border-b border-border"
            >
              Role <span className="text-rose-500 font-bold">*</span>
            </th>

            {/* Frozen 6: CTC (Last Frozen Column with solid border & shadow) */}
            <th
              style={{ left: ctcLeft }}
              className="sticky z-30 bg-[#F1F5F9] dark:bg-[#0D111C] py-2.5 px-3 w-[95px] min-w-[95px] max-w-[95px] border-b border-border border-r-2 border-border/80 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.45)]"
            >
              CTC <span className="text-rose-500 font-bold">*</span>
            </th>

            {/* ── Scrollable Headers (z-0 relative) ── */}
            <th className="py-2.5 px-3 min-w-[240px] border-b border-border bg-[#F1F5F9] dark:bg-[#0D111C]">
              <span title="Free-text notes only — to move a company between Pipeline / In Progress / Completed etc., use Edit instead.">
                Status <span className="text-rose-500 font-bold">*</span>
              </span>
            </th>
            <th className="py-2.5 px-3 min-w-[190px] border-b border-border bg-[#F1F5F9] dark:bg-[#0D111C]">
              Company Type
            </th>

            {/* ── Last Date Columns (Follow Up Date) ── */}
            {hasFollowUpColumn && (
              <th className="py-2.5 px-3 min-w-[140px] text-center border-b border-border bg-[#F1F5F9] dark:bg-[#0D111C]" title="Follow Up Date">
                <div className="inline-flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Calendar size={13} strokeWidth={2.5} />
                  <span className="font-bold text-[11px] uppercase tracking-wider">Follow Up</span>
                </div>
              </th>
            )}

            {/* ── JD Date and DB Date (Companies in Drive & Companies in Progress Only) ── */}
            {hasJdDbDates && (
              <>
                <th className="py-2.5 px-3 min-w-[135px] text-center border-b border-border bg-[#F1F5F9] dark:bg-[#0D111C]" title="JD Received Date">
                  <div className="inline-flex items-center justify-center gap-1 text-sky-600 dark:text-sky-400">
                    <span className="font-extrabold text-[11px]">JD</span>
                    <Calendar size={12} strokeWidth={2.5} />
                  </div>
                </th>
                <th className="py-2.5 px-3 min-w-[135px] text-center border-b border-border bg-[#F1F5F9] dark:bg-[#0D111C]" title="Database Shared Date">
                  <div className="inline-flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="font-extrabold text-[11px]">DB</span>
                    <Calendar size={12} strokeWidth={2.5} />
                  </div>
                </th>
              </>
            )}

            {isCompletedSection && (
              <th className="py-2.5 px-3 min-w-[120px] text-center border-b border-border bg-[#F1F5F9] dark:bg-[#0D111C]">Offers Received</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 font-normal">
          {localRows.map((row, idx) => (
            <TableRow
              key={row._id}
              row={row}
              index={idx + 1}
              isCompletedSection={isCompletedSection}
              hasFollowUpColumn={hasFollowUpColumn}
              hasContactAndEmail={hasContactAndEmail}
              hasJdDbDates={hasJdDbDates}
              isDeleteMode={isDeleteMode}
              isSelected={selectedRowIds.includes(row._id)}
              onToggleSelect={() => onToggleSelectRow && onToggleSelectRow(row._id)}
              onUpdateRow={onUpdateRow}
              onMoveSection={onMoveSection}
              onTogglePin={onTogglePin}
              onDeleteRow={onDeleteRow}
              onEditRow={onEditRow}
              dynamicEmailWidth={dynamicEmailWidth}
              sNoLeft={sNoLeft}
              companyLeft={companyLeft}
              contactLeft={contactLeft}
              emailLeft={emailLeft}
              roleLeft={roleLeft}
              ctcLeft={ctcLeft}
              isBeingDragged={draggedIndex === idx}
              isCrossSectionDropTarget={crossSectionOverIndex === idx}
              isDropTargetAbove={dragOverIndex === idx && draggedIndex !== null && draggedIndex > idx}
              isDropTargetBelow={dragOverIndex === idx && draggedIndex !== null && draggedIndex < idx}
              onDragStart={(e) => handleDragStart(idx, e)}
              onDragOver={(e) => handleDragOver(idx, e)}
              onDrop={(e) => handleDrop(idx, e)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({
  row,
  index,
  isCompletedSection,
  hasFollowUpColumn,
  hasContactAndEmail,
  hasJdDbDates,
  isDeleteMode,
  isSelected,
  onToggleSelect,
  onUpdateRow,
  onMoveSection,
  onTogglePin,
  onDeleteRow,
  onEditRow,
  dynamicEmailWidth,
  sNoLeft,
  companyLeft,
  contactLeft,
  emailLeft,
  roleLeft,
  ctcLeft,
  isBeingDragged = false,
  isCrossSectionDropTarget = false,
  isDropTargetAbove = false,
  isDropTargetBelow = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  row: WeeklyRow;
  index: number;
  isCompletedSection: boolean;
  hasFollowUpColumn: boolean;
  hasContactAndEmail: boolean;
  hasJdDbDates: boolean;
  isDeleteMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onUpdateRow: (id: string, updates: Partial<WeeklyRow>) => Promise<void>;
  onMoveSection: (id: string, targetSection: string) => Promise<void>;
  onTogglePin: (id: string) => Promise<void>;
  onDeleteRow: (id: string) => Promise<void>;
  onEditRow?: (row: WeeklyRow) => void;
  dynamicEmailWidth: number;
  sNoLeft: number;
  companyLeft: number;
  contactLeft: number;
  emailLeft: number;
  roleLeft: number;
  ctcLeft: number;
  isBeingDragged?: boolean;
  isCrossSectionDropTarget?: boolean;
  isDropTargetAbove?: boolean;
  isDropTargetBelow?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>('');

  const startEdit = (field: string, val: any) => {
    setEditingField(field);
    setTempValue(val);
  };

  const commitEdit = (field: string) => {
    if (editingField === field) {
      if (['company_name', 'job_role', 'ctc_lpa', 'current_status_text'].includes(field)) {
        const strVal = String(tempValue ?? '').trim();
        if (!strVal) {
          const fieldLabels: Record<string, string> = {
            company_name: 'Company Name',
            job_role: 'Role',
            ctc_lpa: 'CTC',
            current_status_text: 'Status',
          };
          alert(`${fieldLabels[field] || field} is mandatory and cannot be empty.`);
          return;
        }
      }

      if (field === 'contact_number') {
        const val = String(tempValue ?? '').trim();
        if (val) {
          const res = validateAndNormalizeIndianMobile(val);
          if (!res.valid) {
            alert(res.error || 'Invalid Indian mobile number');
            return;
          }
          onUpdateRow(row._id, { contact_number: res.normalized, mobile_numbers: [res.normalized] });
        } else {
          onUpdateRow(row._id, { contact_number: '', mobile_numbers: [] });
        }
        setEditingField(null);
        return;
      }

      if (field === 'email_id') {
        const val = String(tempValue ?? '').trim();
        if (val) {
          const res = validateAndNormalizeEmail(val);
          if (!res.valid) {
            alert(res.error || 'Invalid email format');
            return;
          }
          onUpdateRow(row._id, { email_id: res.normalized, email_ids: [res.normalized] });
        } else {
          onUpdateRow(row._id, { email_id: '', email_ids: [] });
        }
        setEditingField(null);
        return;
      }

      onUpdateRow(row._id, { [field]: typeof tempValue === 'string' ? tempValue.trim() : tempValue });
      setEditingField(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') commitEdit(field);
    if (e.key === 'Escape') setEditingField(null);
  };

  // 100% Solid opaque backgrounds with zero transparency so scrolled content never bleeds through
  const stickyBg = isSelected
    ? 'bg-indigo-50 dark:bg-indigo-950/60 group-hover/row:bg-indigo-100/90 dark:group-hover/row:bg-indigo-900/70'
    : row.is_pinned_top
    ? 'bg-[#EFF6FF] dark:bg-[#1E293B] group-hover/row:bg-[#DBEAFE] dark:group-hover/row:bg-[#253349]'
    : 'bg-white dark:bg-[#161D2E] group-hover/row:bg-[#F8FAFC] dark:group-hover/row:bg-[#1E2738]';

  const nonStickyBg = isSelected
    ? 'bg-indigo-50 dark:bg-indigo-950/60 group-hover/row:bg-indigo-100/90 dark:group-hover/row:bg-indigo-900/70'
    : row.is_pinned_top
    ? 'bg-[#EFF6FF] dark:bg-[#1E293B] group-hover/row:bg-[#DBEAFE] dark:group-hover/row:bg-[#253349]'
    : 'bg-white dark:bg-[#161D2E] group-hover/row:bg-[#F8FAFC] dark:group-hover/row:bg-[#1E2738]';

  return (
    <tr
      draggable={!isDeleteMode && editingField === null}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group/row transition-all duration-150 relative ${
        isSelected ? 'font-medium' : row.is_pinned_top ? 'font-medium' : ''
      } ${
        isBeingDragged
          ? 'opacity-40 scale-[0.995] bg-primary/10 dark:bg-primary/20 shadow-inner'
          : ''
      } ${
        isCrossSectionDropTarget
          ? 'border-t-2 border-t-primary bg-primary/10 dark:bg-primary/20 shadow-[0_-4px_12px_rgba(59,130,246,0.45)]'
          : ''
      } ${
        isDropTargetAbove
          ? 'border-t-2 border-t-primary shadow-[0_-3px_10px_rgba(59,130,246,0.35)]'
          : ''
      } ${
        isDropTargetBelow
          ? 'border-b-2 border-b-primary shadow-[0_3px_10px_rgba(59,130,246,0.35)]'
          : ''
      }`}
    >
      {/* Checkbox in selection/delete mode */}
      {isDeleteMode && (
        <td
          style={{ left: 0 }}
          className={`sticky z-20 py-2.5 px-2 w-10 min-w-[40px] max-w-[40px] text-center border-b border-border/60 ${stickyBg}`}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
          />
        </td>
      )}

      {/* 1. S.No & Excel-like Drag Grip Handle (Frozen) */}
      <td
        style={{ left: sNoLeft }}
        className={`sticky z-20 py-2.5 px-1.5 w-12 min-w-[48px] max-w-[48px] text-center text-fg-subtle font-mono text-micro font-medium border-b border-border/60 select-none cursor-grab active:cursor-grabbing group/sno ${stickyBg}`}
        title="Hold or drag to swap row position (Excel-like row reordering)"
      >
        <div className="flex items-center justify-center gap-0.5 w-full">
          <GripVertical
            size={12}
            strokeWidth={2.2}
            className="text-fg-subtle/30 group-hover/sno:text-primary group-hover/row:text-fg-subtle shrink-0 transition-colors"
          />
          <span className="tabular-nums font-semibold">{index}</span>
        </div>
      </td>

      {/* 2. Company Name (Frozen with natural word wrapping) */}
      <td
        style={{ left: companyLeft }}
        className={`sticky z-20 py-2.5 px-3 w-[200px] min-w-[200px] max-w-[200px] font-semibold text-fg border-b border-border/60 ${stickyBg}`}
      >
        <div className="flex items-center gap-1.5">
          {editingField === 'company_name' ? (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => commitEdit('company_name')}
              onKeyDown={(e) => handleKeyDown(e, 'company_name')}
              autoFocus
              className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full outline-none shadow-xs font-bold"
            />
          ) : (
            <span
              onClick={() => startEdit('company_name', row.company_name)}
              className="cursor-pointer hover:text-primary transition-colors font-bold whitespace-normal break-words leading-snug"
              title={row.company_name}
            >
              {row.company_name}
            </span>
          )}
        </div>
      </td>

      {/* 2b. Contact (Frozen - Drive, In Progress, Pipeline) */}
      {hasContactAndEmail && (
        <td
          style={{ left: contactLeft }}
          className={`sticky z-20 py-2.5 px-3 w-[160px] min-w-[160px] max-w-[160px] text-fg font-mono tabular-nums text-xs whitespace-nowrap border-b border-border/60 ${stickyBg}`}
        >
          {editingField === 'contact_number' ? (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => commitEdit('contact_number')}
              onKeyDown={(e) => handleKeyDown(e, 'contact_number')}
              placeholder="10-digit mobile"
              autoFocus
              className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-28 outline-none shadow-xs font-mono"
            />
          ) : (
            <div className="flex items-center gap-1.5 group/contact whitespace-nowrap">
              {row.contact_number || (row.mobile_numbers && row.mobile_numbers[0]) ? (
                <>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={`tel:${row.contact_number || row.mobile_numbers?.[0]}`}
                      title={`Call ${row.contact_number || row.mobile_numbers?.[0]}`}
                      className="w-5 h-5 rounded-md bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/40 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all hover:scale-105 active:scale-[0.992] cursor-pointer shrink-0 shadow-2xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone size={11} strokeWidth={2.5} />
                    </a>
                    <WhatsAppButton
                      mobileNumber={row.contact_number || row.mobile_numbers?.[0] || ''}
                      companyName={row.company_name}
                    />
                  </div>
                  <span
                    onClick={() => startEdit('contact_number', row.contact_number || row.mobile_numbers?.[0] || '')}
                    className="cursor-pointer hover:text-primary transition-colors font-medium select-all whitespace-nowrap inline-block"
                    title="Click to edit contact number"
                  >
                    {row.contact_number || row.mobile_numbers?.[0]}
                  </span>
                </>
              ) : (
                <span
                  onClick={() => startEdit('contact_number', '')}
                  className="cursor-pointer text-fg-disabled hover:text-primary italic text-[11px] transition-colors whitespace-nowrap"
                  title="Click to add contact number"
                >
                  + Add Contact
                </span>
              )}
            </div>
          )}
        </td>
      )}

      {/* 2c. Email ID (Frozen - Drive, In Progress, Pipeline) */}
      {hasContactAndEmail && (
        <td
          style={{ left: emailLeft, width: dynamicEmailWidth, minWidth: dynamicEmailWidth }}
          className={`sticky z-20 py-2.5 px-3 text-fg text-xs whitespace-nowrap border-b border-border/60 ${stickyBg}`}
        >
          {editingField === 'email_id' ? (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => commitEdit('email_id')}
              onKeyDown={(e) => handleKeyDown(e, 'email_id')}
              placeholder="e.g. hr@company.com"
              autoFocus
              className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full max-w-[340px] outline-none shadow-xs"
            />
          ) : (
            <div className="flex items-center gap-1.5 group/email whitespace-nowrap">
              {row.email_id || (row.email_ids && row.email_ids[0]) ? (
                <>
                  <a
                    href={`mailto:${row.email_id || row.email_ids?.[0]}`}
                    title={`Send email to ${row.email_id || row.email_ids?.[0]}`}
                    className="w-5 h-5 rounded-md bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-all hover:scale-105 active:scale-[0.992] cursor-pointer shrink-0 shadow-2xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail size={11} strokeWidth={2.5} />
                  </a>
                  <span
                    onClick={() => startEdit('email_id', row.email_id || row.email_ids?.[0] || '')}
                    className="cursor-pointer hover:text-primary transition-colors select-all whitespace-nowrap font-normal text-fg"
                    title={`Click to edit: ${row.email_id || row.email_ids?.[0]}`}
                  >
                    {row.email_id || row.email_ids?.[0]}
                  </span>
                </>
              ) : (
                <span
                  onClick={() => startEdit('email_id', '')}
                  className="cursor-pointer text-fg-disabled hover:text-primary italic text-[11px] transition-colors whitespace-nowrap"
                  title="Click to add email"
                >
                  + Add Email
                </span>
              )}
            </div>
          )}
        </td>
      )}

      {/* 3. Role (Frozen) */}
      <td
        style={{ left: roleLeft }}
        className={`sticky z-20 py-2.5 px-3 w-[160px] min-w-[160px] max-w-[160px] text-fg-muted border-b border-border/60 ${stickyBg}`}
      >
        {editingField === 'job_role' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('job_role')}
            onKeyDown={(e) => handleKeyDown(e, 'job_role')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full outline-none shadow-xs"
          />
        ) : (
          <div
            onClick={() => startEdit('job_role', row.job_role)}
            className="cursor-pointer hover:text-primary transition-colors flex flex-wrap gap-1"
          >
            {row.job_role.split(',').map((r, i) => (
              <span
                key={i}
                className="bg-surface-sunken border border-border text-fg-muted px-1.5 py-0.5 rounded text-micro truncate max-w-[150px]"
              >
                {r.trim()}
              </span>
            ))}
          </div>
        )}
      </td>

      {/* 4. CTC (Frozen - End of Frozen Zone with solid border and shadow) */}
      <td
        style={{ left: ctcLeft }}
        className={`sticky z-20 py-2.5 px-3 w-[95px] min-w-[95px] max-w-[95px] text-emerald-600 dark:text-emerald-400 font-mono font-medium border-b border-border/60 border-r-2 border-border/80 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.45)] ${stickyBg}`}
      >
        {editingField === 'ctc_lpa' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('ctc_lpa')}
            onKeyDown={(e) => handleKeyDown(e, 'ctc_lpa')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full outline-none shadow-xs"
          />
        ) : (
          <span
            onClick={() => startEdit('ctc_lpa', row.ctc_lpa)}
            className="cursor-pointer hover:text-primary transition-colors font-bold"
          >
            {row.ctc_lpa || <span className="text-fg-disabled italic">—</span>}
          </span>
        )}
      </td>

      {/* ── Scrollable Body Columns (z-0 relative) ── */}
      {/* 5. Status */}
      <td className={`py-2.5 px-3 text-fg-muted border-b border-border/60 relative z-0 ${nonStickyBg}`}>
        {editingField === 'current_status_text' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('current_status_text')}
            onKeyDown={(e) => handleKeyDown(e, 'current_status_text')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full outline-none shadow-xs"
          />
        ) : (
          <span
            onClick={() => startEdit('current_status_text', row.current_status_text)}
            className="cursor-pointer hover:text-primary transition-colors break-words leading-relaxed whitespace-pre-wrap max-w-[320px] inline-block"
            title={row.current_status_text}
          >
            {row.current_status_text || <span className="text-fg-disabled italic">—</span>}
          </span>
        )}
      </td>

      {/* 5b. Company Type */}
      <td className={`py-2.5 px-3 whitespace-nowrap border-b border-border/60 relative z-0 ${nonStickyBg}`} onClick={(e) => e.stopPropagation()}>
        <CompanyTypeDropdown
          value={row.company_type}
          onChange={(newType) => onUpdateRow(row._id, { company_type: newType })}
        />
      </td>

      {/* ── Follow Up Date Column ── */}
      {hasFollowUpColumn && (
        <td className={`py-2.5 px-3 text-center whitespace-nowrap border-b border-border/60 relative z-0 ${nonStickyBg}`} onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex items-center justify-center">
            <SmoothDatePicker
              value={(() => {
                if (!row.follow_up_date) return '';
                try {
                  const d = new Date(row.follow_up_date);
                  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                  return row.follow_up_date.length === 10 ? row.follow_up_date : '';
                } catch {
                  return '';
                }
              })()}
              onChange={(newDate) => {
                onUpdateRow(row._id, { follow_up_date: newDate || undefined });
              }}
              minDate={(() => {
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const d = String(now.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
              })()}
              placeholder="Set date"
              usePortal={true}
              clearable={true}
              variant="pill"
              size="sm"
              theme="navy"
            />
          </div>
        </td>
      )}

      {/* ── JD Received & Database Shared Dates (Companies in Drive & Companies in Progress ONLY) ── */}
      {hasJdDbDates && (
        <>
          {/* JD Received Date */}
          <td className={`py-2.5 px-3 text-center whitespace-nowrap border-b border-border/60 relative z-0 ${nonStickyBg}`} onClick={(e) => e.stopPropagation()}>
            <div className="inline-flex items-center justify-center">
              <SmoothDatePicker
                value={(() => {
                  if (!row.jd_received_date) return '';
                  try {
                    const d = new Date(row.jd_received_date);
                    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                    return row.jd_received_date.length === 10 ? row.jd_received_date : '';
                  } catch {
                    return '';
                  }
                })()}
                onChange={(newDate) => {
                  onUpdateRow(row._id, { jd_received_date: newDate || undefined });
                }}
                placeholder="Set JD Date"
                usePortal={true}
                clearable={true}
                variant="pill"
                size="sm"
                theme="navy"
              />
            </div>
          </td>

          {/* Database Shared Date */}
          <td className={`py-2.5 px-3 text-center whitespace-nowrap border-b border-border/60 relative z-0 ${nonStickyBg}`} onClick={(e) => e.stopPropagation()}>
            <div className="inline-flex items-center justify-center">
              <SmoothDatePicker
                value={(() => {
                  if (!row.db_shared_date) return '';
                  try {
                    const d = new Date(row.db_shared_date);
                    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                    return row.db_shared_date.length === 10 ? row.db_shared_date : '';
                  } catch {
                    return '';
                  }
                })()}
                onChange={(newDate) => {
                  onUpdateRow(row._id, { db_shared_date: newDate || undefined });
                }}
                placeholder="Set DB Date"
                usePortal={true}
                clearable={true}
                variant="pill"
                size="sm"
                theme="navy"
              />
            </div>
          </td>
        </>
      )}

      {/* Offers Received (Completed Section Only) */}
      {isCompletedSection && (
        <td className={`py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400 border-b border-border/60 relative z-0 ${nonStickyBg}`}>
          {editingField === 'selected_count' ? (
            <input
              type="number"
              min="0"
              max="50"
              step="1"
              value={tempValue}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setTempValue(0);
                  return;
                }
                const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
                if (isNaN(num) || num < 0) setTempValue(0);
                else if (num > 50) setTempValue(50);
                else setTempValue(num);
              }}
              onKeyDown={(e) => {
                if (['-', '+', '.', 'e', 'E'].includes(e.key)) {
                  e.preventDefault();
                } else {
                  handleKeyDown(e, 'selected_count');
                }
              }}
              onBlur={() => commitEdit('selected_count')}
              autoFocus
              className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg text-center w-16 outline-none shadow-xs font-mono font-bold"
            />
          ) : (
            <span
              onClick={() => startEdit('selected_count', row.selected_count || 0)}
              className="cursor-pointer hover:underline inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
            >
              {row.selected_count ?? 0}
            </span>
          )}
        </td>
      )}
    </tr>
  );
}
