'use client';

import { useState, useCallback, useEffect } from 'react';
import { TrackerRow, OUTCOMES, MONTHS } from './TrackerRow';
import type { TrackerRow as TrackerRowType } from '../page';
import { ClipboardList, Copy, CopyPlus, Check, CheckSquare, Loader2, X, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { triggerHaptic } from '@/lib/haptics';
import { formatTime, smartParseTime } from '@/lib/timeValidation';
import { validateAndNormalizeMultiEmail, validateAndNormalizeMultiMobile } from '@/lib/contactValidation';

const COLUMN_FIELDS = [
  'start_time',
  'end_time',
  'duration',
  'company_name',
  'hr_name',
  'mobile_number',
  'email_id',
  'outcome_status',
  'follow_up_month',
  'comments',
];

interface Props {
  rows: TrackerRowType[];
  isReadOnly: boolean;
  onRowUpdate: (rowId: string, patch: Partial<TrackerRowType>) => Promise<void>;
  onEdit?: (row: TrackerRowType) => void;
  onDelete: (rowId: string) => Promise<void>;
  onDeleteSelected?: (rowIds: string[]) => Promise<void>;
  onCall?: (row: TrackerRowType) => void;
  onCopyFromHistory?: (rows: TrackerRowType[]) => Promise<void>;
}

export function TrackerGrid({ rows, isReadOnly, onRowUpdate, onEdit, onDelete, onDeleteSelected, onCall, onCopyFromHistory }: Props) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectionTheme, setSelectionTheme] = useState<'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'pink' | 'orange'>('blue');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // ── Excel / Google Sheets-style Cell Selection & Drag Range
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [dragStartCell, setDragStartCell] = useState<{ rowIndex: number; colIndex: number; field: string } | null>(null);
  const [isDraggingCells, setIsDraggingCells] = useState(false);
  const [showCellDeleteConfirm, setShowCellDeleteConfirm] = useState(false);

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

  // ── Active Working Row Focus & Auto-Advancement ──
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Default activeRowId to the first pending/uncompleted row
  useEffect(() => {
    if (rows.length > 0) {
      if (!activeRowId || !rows.some((r) => r._id === activeRowId)) {
        const firstPending = rows.find((r) => !r.outcome_status && !r.is_skipped);
        setActiveRowId(firstPending ? firstPending._id : rows[0]._id);
      }
    }
  }, [rows, activeRowId]);

  const autoAdvanceRow = useCallback(
    (currentRowId: string) => {
      const currentIndex = rows.findIndex((r) => r._id === currentRowId);
      if (currentIndex === -1) return;

      let nextRow = rows.slice(currentIndex + 1).find((r) => !r.outcome_status && !r.is_skipped);
      if (!nextRow && currentIndex + 1 < rows.length) {
        nextRow = rows[currentIndex + 1];
      }

      if (nextRow) {
        setActiveRowId(nextRow._id);
        setTimeout(() => {
          const el = document.querySelector(`[data-row-id="${nextRow._id}"]`);
          if (el) {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 60);
      }
    },
    [rows]
  );

  const handleRowUpdateWithAutoAdvance = useCallback(
    async (rowId: string, patch: Partial<TrackerRowType>) => {
      const targetRow = rows.find((r) => r._id === rowId);

      await onRowUpdate(rowId, patch);

      if (!targetRow) return;

      const newOutcome = patch.outcome_status !== undefined ? patch.outcome_status : targetRow.outcome_status;
      const newFollowUpMonth = patch.follow_up_month !== undefined ? patch.follow_up_month : targetRow.follow_up_month;

      // Rule: If call outcome is 'follow_up', do NOT advance unless follow_up_month is set!
      if (newOutcome === 'follow_up') {
        if (!newFollowUpMonth) {
          setActiveRowId(rowId);
          return;
        }
      }

      // If call outcome status is set or follow_up_month was selected, auto-advance to next row!
      if (patch.outcome_status || (newOutcome && patch.follow_up_month)) {
        autoAdvanceRow(rowId);
      }
    },
    [rows, onRowUpdate, autoAdvanceRow]
  );

  // ── Cell Drag Range Selection (Excel / Google Sheets style)
  const handleCellMouseDown = useCallback(
    (rowId: string, rowIndex: number, field: string, e: React.MouseEvent) => {
      if (isReadOnly) return;
      const target = e.target as HTMLElement;
      const cellKey = `${rowId}:${field}`;

      // ── Ctrl / Cmd + Click: Toggle individual cell in disjoint random selection (even on inputs)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        triggerHaptic('light');
        setActiveRowId(rowId);
        const colIdx = COLUMN_FIELDS.indexOf(field);
        setDragStartCell({ rowIndex, colIndex: colIdx !== -1 ? colIdx : 0, field });

        const newSet = new Set(selectedCells);
        if (newSet.has(cellKey)) {
          newSet.delete(cellKey);
        } else {
          newSet.add(cellKey);
        }
        setSelectedCells(newSet);
        return;
      }

      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'BUTTON' ||
        target.closest('button')
      ) {
        if (selectedCells.size > 0 && !selectedCells.has(cellKey)) {
          setSelectedCells(new Set());
        }
        return;
      }

      e.preventDefault();
      triggerHaptic('light');
      setActiveRowId(rowId);
      const colIdx = COLUMN_FIELDS.indexOf(field);
      setIsDraggingCells(true);
      setDragStartCell({ rowIndex, colIndex: colIdx !== -1 ? colIdx : 0, field });

      if (e.shiftKey && dragStartCell) {
        const rMin = Math.min(dragStartCell.rowIndex, rowIndex);
        const rMax = Math.max(dragStartCell.rowIndex, rowIndex);
        const cMin = Math.min(dragStartCell.colIndex, colIdx);
        const cMax = Math.max(dragStartCell.colIndex, colIdx);

        const newSet = new Set<string>();
        for (let r = rMin; r <= rMax; r++) {
          const rowObj = rows[r];
          if (!rowObj) continue;
          for (let c = cMin; c <= cMax; c++) {
            const f = COLUMN_FIELDS[c];
            if (f) newSet.add(`${rowObj._id}:${f}`);
          }
        }
        setSelectedCells(newSet);
      } else {
        setSelectedCells(new Set([cellKey]));
      }
    },
    [isReadOnly, rows, dragStartCell, selectedCells]
  );

  const handleCellMouseEnter = useCallback(
    (rowId: string, rowIndex: number, field: string) => {
      if (!isDraggingCells || !dragStartCell || isReadOnly) return;

      const colIdx = COLUMN_FIELDS.indexOf(field);
      if (colIdx === -1) return;

      const rMin = Math.min(dragStartCell.rowIndex, rowIndex);
      const rMax = Math.max(dragStartCell.rowIndex, rowIndex);
      const cMin = Math.min(dragStartCell.colIndex, colIdx);
      const cMax = Math.max(dragStartCell.colIndex, colIdx);

      const newSet = new Set<string>();
      for (let r = rMin; r <= rMax; r++) {
        const rowObj = rows[r];
        if (!rowObj) continue;
        for (let c = cMin; c <= cMax; c++) {
          const f = COLUMN_FIELDS[c];
          if (f) newSet.add(`${rowObj._id}:${f}`);
        }
      }
      setSelectedCells(newSet);
    },
    [isDraggingCells, dragStartCell, isReadOnly, rows]
  );

  // Global mouseup to stop dragging
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDraggingCells) {
        setIsDraggingCells(false);
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDraggingCells]);

  // Request cell delete: opens in-app confirmation modal without clearing selection
  const handleRequestCellDelete = useCallback(() => {
    if (selectedCells.size === 0 || isReadOnly) return;
    triggerHaptic('warning');
    setShowCellDeleteConfirm(true);
  }, [selectedCells.size, isReadOnly]);

  // Confirm cell delete: clears cell values and closes modal while keeping selected cells selection intact
  const handleConfirmCellDelete = useCallback(async () => {
    if (selectedCells.size === 0 || isReadOnly) return;
    setShowCellDeleteConfirm(false);

    // Group cells by rowId
    const rowPatches: Record<string, Partial<TrackerRowType>> = {};

    selectedCells.forEach((cellKey) => {
      const [rowId, field] = cellKey.split(':');
      if (!rowId || !field) return;
      if (!rowPatches[rowId]) rowPatches[rowId] = {};

      switch (field) {
        case 'start_time':
          rowPatches[rowId].call_start_time = undefined;
          rowPatches[rowId].duration_seconds = undefined;
          rowPatches[rowId].duration_formatted = undefined;
          break;
        case 'end_time':
          rowPatches[rowId].call_end_time = undefined;
          rowPatches[rowId].duration_seconds = undefined;
          rowPatches[rowId].duration_formatted = undefined;
          break;
        case 'duration':
          rowPatches[rowId].duration_seconds = undefined;
          rowPatches[rowId].duration_formatted = undefined;
          break;
        case 'company_name':
          rowPatches[rowId].company_name = '';
          break;
        case 'hr_name':
          rowPatches[rowId].hr_name = '';
          break;
        case 'mobile_number':
          rowPatches[rowId].mobile_number = '';
          break;
        case 'email_id':
          rowPatches[rowId].email_id = '';
          break;
        case 'outcome_status':
          rowPatches[rowId].outcome_status = null as any;
          break;
        case 'follow_up_month':
          rowPatches[rowId].follow_up_month = null as any;
          break;
        case 'comments':
          rowPatches[rowId].comments = '';
          break;
      }
    });

    triggerHaptic('success');
    const totalCells = selectedCells.size;

    try {
      await Promise.all(
        Object.entries(rowPatches).map(([rowId, patch]) => onRowUpdate(rowId, patch))
      );
      toast(`Cleared values from ${totalCells} cell${totalCells > 1 ? 's' : ''}`, 'success');
    } catch (err) {
      console.error('Failed to clear cells', err);
      toast('Failed to clear selected cells', 'error');
    }
  }, [selectedCells, isReadOnly, onRowUpdate, toast]);

  // ── Copy Selected Cell Range (Excel TSV format for Ctrl+C & random disjoint selection support)
  const handleCopySelectedCells = useCallback(async () => {
    if (selectedCells.size === 0) return;

    const rowIndicesSet = new Set<number>();
    const colIndicesSet = new Set<number>();
    const selectedList: { rIdx: number; cIdx: number; val: string }[] = [];

    selectedCells.forEach((cellKey) => {
      const [rowId, field] = cellKey.split(':');
      const rIdx = rows.findIndex((r) => r._id === rowId);
      const cIdx = COLUMN_FIELDS.indexOf(field);
      if (rIdx !== -1 && cIdx !== -1) {
        rowIndicesSet.add(rIdx);
        colIndicesSet.add(cIdx);
        const rowObj = rows[rIdx];
        let val = '';
        if (rowObj) {
          switch (field) {
            case 'start_time':
              val = formatTime(rowObj.call_start_time);
              break;
            case 'end_time':
              val = formatTime(rowObj.call_end_time);
              break;
            case 'duration':
              val = rowObj.duration_formatted ?? '';
              break;
            case 'company_name':
              val = rowObj.company_name ?? '';
              break;
            case 'hr_name':
              val = rowObj.hr_name ?? '';
              break;
            case 'mobile_number':
              val = rowObj.mobile_number ?? '';
              break;
            case 'email_id':
              val = rowObj.email_id ?? '';
              break;
            case 'outcome_status':
              val = rowObj.outcome_status ?? '';
              break;
            case 'follow_up_month':
              val = rowObj.follow_up_month ?? '';
              break;
            case 'comments':
              val = rowObj.comments ?? '';
              break;
          }
        }
        selectedList.push({ rIdx, cIdx, val });
      }
    });

    if (selectedList.length === 0) return;

    const minRow = Math.min(...Array.from(rowIndicesSet));
    const maxRow = Math.max(...Array.from(rowIndicesSet));
    const minCol = Math.min(...Array.from(colIndicesSet));
    const maxCol = Math.max(...Array.from(colIndicesSet));

    const boundingBoxArea = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    let tsvText = '';

    if (boundingBoxArea === selectedCells.size) {
      // Solid continuous rectangular range
      const tsvRows: string[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        const rowObj = rows[r];
        if (!rowObj) continue;
        const rowVals: string[] = [];
        for (let c = minCol; c <= maxCol; c++) {
          const field = COLUMN_FIELDS[c];
          const cellKey = `${rowObj._id}:${field}`;
          if (selectedCells.has(cellKey)) {
            let val = '';
            switch (field) {
              case 'start_time':
                val = formatTime(rowObj.call_start_time);
                break;
              case 'end_time':
                val = formatTime(rowObj.call_end_time);
                break;
              case 'duration':
                val = rowObj.duration_formatted ?? '';
                break;
              case 'company_name':
                val = rowObj.company_name ?? '';
                break;
              case 'hr_name':
                val = rowObj.hr_name ?? '';
                break;
              case 'mobile_number':
                val = rowObj.mobile_number ?? '';
                break;
              case 'email_id':
                val = rowObj.email_id ?? '';
                break;
              case 'outcome_status':
                val = rowObj.outcome_status ?? '';
                break;
              case 'follow_up_month':
                val = rowObj.follow_up_month ?? '';
                break;
              case 'comments':
                val = rowObj.comments ?? '';
                break;
            }
            rowVals.push(val);
          } else {
            rowVals.push('');
          }
        }
        tsvRows.push(rowVals.join('\t'));
      }
      tsvText = tsvRows.join('\n');
    } else {
      // Disjoint random multi-cell selection
      selectedList.sort((a, b) => (a.rIdx !== b.rIdx ? a.rIdx - b.rIdx : a.cIdx - b.cIdx));
      tsvText = selectedList.map((item) => item.val).join('\n');
    }

    await copyToClipboard(tsvText);
    triggerHaptic('success');
    toast(`Copied ${selectedCells.size} cell(s) to clipboard`, 'success');
  }, [selectedCells, rows, toast]);

  // ── Paste Clipboard Data into Selected Cell Range (Strict Rules per Column)
  const handlePasteSelectedCells = useCallback(
    async (clipboardTextOverride?: string) => {
      if (isReadOnly) return;

      let text = clipboardTextOverride;
      if (!text) {
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            text = await navigator.clipboard.readText();
          }
        } catch (err) {
          console.warn('Clipboard API access blocked, fallback to keyboard event:', err);
        }
      }

      if (!text || !text.trim()) return;

      const rawLines = text.split(/\r?\n/);
      if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') {
        rawLines.pop();
      }
      const matrix = rawLines.map((line) => line.split('\t'));
      if (matrix.length === 0 || matrix[0].length === 0) return;

      let startRowIdx = 0;
      let startColIdx = 0;

      if (dragStartCell) {
        startRowIdx = dragStartCell.rowIndex;
        startColIdx = dragStartCell.colIndex;
      } else if (selectedCells.size > 0) {
        let minR = rows.length;
        let minC = COLUMN_FIELDS.length;

        selectedCells.forEach((cellKey) => {
          const [rowId, field] = cellKey.split(':');
          const rIdx = rows.findIndex((r) => r._id === rowId);
          const cIdx = COLUMN_FIELDS.indexOf(field);
          if (rIdx !== -1 && rIdx < minR) minR = rIdx;
          if (cIdx !== -1 && cIdx < minC) minC = cIdx;
        });

        if (minR < rows.length) startRowIdx = minR;
        if (minC < COLUMN_FIELDS.length) startColIdx = minC;
      } else if (activeRowId) {
        const rIdx = rows.findIndex((r) => r._id === activeRowId);
        if (rIdx !== -1) startRowIdx = rIdx;
      }

      const rowPatches: Record<string, Partial<TrackerRowType>> = {};
      let pastedCount = 0;
      const newSelectedCells = new Set<string>();

      matrix.forEach((matrixRow, rOffset) => {
        const targetRowIdx = startRowIdx + rOffset;
        if (targetRowIdx >= rows.length) return;
        const targetRow = rows[targetRowIdx];

        matrixRow.forEach((rawCellVal, cOffset) => {
          const targetColIdx = startColIdx + cOffset;
          if (targetColIdx >= COLUMN_FIELDS.length) return;
          const targetField = COLUMN_FIELDS[targetColIdx];
          const valStr = rawCellVal.trim();

          if (!rowPatches[targetRow._id]) rowPatches[targetRow._id] = {};

          let applied = false;

          // Apply strict per-column rules & constraints on paste
          switch (targetField) {
            case 'company_name': {
              // Rule: Alphanumeric + standard company symbols (&, -, ., /, etc.)
              const cleaned = valStr.replace(/[^\w\s.&/,'()\-\.]/gi, '').trim();
              rowPatches[targetRow._id].company_name = cleaned;
              applied = true;
              break;
            }
            case 'hr_name': {
              // Rule: Alphabetics ONLY! Strips digits 0-9 and non-name symbols
              const cleaned = valStr.replace(/[^a-zA-Z\s.'\-]/g, '').trim();
              rowPatches[targetRow._id].hr_name = cleaned;
              applied = true;
              break;
            }
            case 'mobile_number': {
              // Rule: Must be valid according to Indian mobile / landline TRAI standards
              if (!valStr) {
                rowPatches[targetRow._id].mobile_number = '';
                applied = true;
              } else {
                const multiRes = validateAndNormalizeMultiMobile(valStr);
                if (multiRes.valid) {
                  rowPatches[targetRow._id].mobile_number = multiRes.normalized;
                  applied = true;
                }
              }
              break;
            }
            case 'email_id': {
              // Rule: Must be valid professional email satisfying official IANA TLDs
              if (!valStr) {
                rowPatches[targetRow._id].email_id = '';
                applied = true;
              } else {
                const multiRes = validateAndNormalizeMultiEmail(valStr);
                if (multiRes.valid) {
                  rowPatches[targetRow._id].email_id = multiRes.normalized;
                  applied = true;
                }
              }
              break;
            }
            case 'start_time': {
              if (!valStr) {
                rowPatches[targetRow._id].call_start_time = undefined;
                applied = true;
              } else {
                const parsed = smartParseTime(valStr);
                if (parsed) {
                  rowPatches[targetRow._id].call_start_time = parsed.iso;
                  applied = true;
                }
              }
              break;
            }
            case 'end_time': {
              if (!valStr) {
                rowPatches[targetRow._id].call_end_time = undefined;
                applied = true;
              } else {
                const parsed = smartParseTime(valStr);
                if (parsed) {
                  rowPatches[targetRow._id].call_end_time = parsed.iso;
                  applied = true;
                }
              }
              break;
            }
            case 'outcome_status': {
              if (!valStr) {
                rowPatches[targetRow._id].outcome_status = null as any;
                applied = true;
              } else {
                const lower = valStr.toLowerCase().replace(/\s+/g, '_');
                const match = OUTCOMES.find((o) => o.value === lower || o.label.toLowerCase() === valStr.toLowerCase());
                if (match) {
                  rowPatches[targetRow._id].outcome_status = match.value;
                  applied = true;
                }
              }
              break;
            }
            case 'follow_up_month': {
              if (!valStr) {
                rowPatches[targetRow._id].follow_up_month = null as any;
                applied = true;
              } else {
                const match = MONTHS.find((m) => m.toLowerCase() === valStr.toLowerCase());
                if (match) {
                  rowPatches[targetRow._id].follow_up_month = match;
                  applied = true;
                }
              }
              break;
            }
            case 'comments': {
              rowPatches[targetRow._id].comments = valStr.slice(0, 200);
              applied = true;
              break;
            }
          }

          if (applied) {
            pastedCount++;
            newSelectedCells.add(`${targetRow._id}:${targetField}`);
          }
        });
      });

      if (pastedCount > 0) {
        triggerHaptic('success');
        setSelectedCells(newSelectedCells);
        try {
          await Promise.all(
            Object.entries(rowPatches).map(([rowId, patch]) => onRowUpdate(rowId, patch))
          );
          toast(`Pasted values into ${pastedCount} cell(s)`, 'success');
        } catch (err) {
          console.error('Failed to paste cells', err);
          toast('Failed to paste into selected cells', 'error');
        }
      }
    },
    [isReadOnly, dragStartCell, selectedCells, rows, activeRowId, onRowUpdate, toast]
  );

  // Global Keyboard Shortcuts: Ctrl+C (Copy), Ctrl+V (Paste), Del (Clear), Esc (Deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.getAttribute('contenteditable') === 'true');

      if (e.key === 'Escape') {
        if (showCellDeleteConfirm) {
          e.preventDefault();
          setShowCellDeleteConfirm(false);
          return;
        }
        if (selectedCells.size > 0) {
          e.preventDefault();
          setSelectedCells(new Set());
          return;
        }
      }

      const isCopy = (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C');
      const isPaste = (e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V');

      if (isCopy && selectedCells.size > 0 && !isInputActive) {
        e.preventDefault();
        handleCopySelectedCells();
        return;
      }

      if (isPaste && selectedCells.size > 0 && !isInputActive) {
        handlePasteSelectedCells();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCells.size > 0 && !isInputActive) {
        e.preventDefault();
        handleRequestCellDelete();
        return;
      }
    };

    const handleWindowPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

      if (selectedCells.size > 0 && !isInputActive) {
        const pasteText = e.clipboardData?.getData('text/plain');
        if (pasteText) {
          e.preventDefault();
          handlePasteSelectedCells(pasteText);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [selectedCells.size, showCellDeleteConfirm, handleCopySelectedCells, handlePasteSelectedCells, handleRequestCellDelete]);

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

    const dataRows = targetRows.map((r, i) => {
      const sNo = (r.serial_no || i + 1).toString();
      const startTime = formatTime(r.call_start_time);
      const endTime = formatTime(r.call_end_time);
      const duration = r.duration_formatted || '';
      const company = (r.company_name || '').replace(/[\t\n\r]+/g, ' ').trim();
      const hr = (r.hr_name || '').replace(/[\t\n\r]+/g, ' ').trim();
      const contact = (r.mobile_number || '').trim();
      const email = (r.email_id || '').trim();
      const coordinator = isReadOnly
        ? (() => {
            const code = (r.college_code || '').toUpperCase();
            if (['ACET', 'AIHT', 'KARPAGAM', 'KPR'].includes(code)) {
              if (!r.coordinator_name || r.coordinator_name === 'Administrator') {
                return 'A.Mohanaradha';
              }
            }
            return (r.coordinator_name || '').trim();
          })()
        : '';
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

    const dataRows = rows.map((r, i) => {
      const sNo = (r.serial_no || i + 1).toString();
      const startTime = formatTime(r.call_start_time);
      const endTime = formatTime(r.call_end_time);
      const duration = r.duration_formatted || '';
      const company = (r.company_name || '').replace(/[\t\n\r]+/g, ' ').trim();
      const hr = (r.hr_name || '').replace(/[\t\n\r]+/g, ' ').trim();
      const contact = (r.mobile_number || '').trim();
      const email = (r.email_id || '').trim();
      const coordinator = isReadOnly
        ? (() => {
            const code = (r.college_code || '').toUpperCase();
            if (['ACET', 'AIHT', 'KARPAGAM', 'KPR'].includes(code)) {
              if (!r.coordinator_name || r.coordinator_name === 'Administrator') {
                return 'A.Mohanaradha';
              }
            }
            return (r.coordinator_name || '').trim();
          })()
        : '';
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

  const [isCopyingToWorkspace, setIsCopyingToWorkspace] = useState(false);

  const handleCopySelectedToWorkspace = useCallback(async () => {
    if (selectedRowIds.size === 0) return;
    const targetRows = rows.filter((r) => selectedRowIds.has(r._id));
    if (targetRows.length === 0) return;

    try {
      setIsCopyingToWorkspace(true);
      if (onCopyFromHistory) {
        await onCopyFromHistory(targetRows);
      }
      setSelectedRowIds(new Set());
      setIsSelectMode(false);
      setLastSelectedIndex(null);
    } catch (err) {
      console.error('Failed to copy rows to workspace', err);
    } finally {
      setIsCopyingToWorkspace(false);
    }
  }, [rows, selectedRowIds, onCopyFromHistory]);

  const handleCopySingleRowToWorkspace = useCallback(async (row: TrackerRowType) => {
    if (onCopyFromHistory) {
      await onCopyFromHistory([row]);
    }
  }, [onCopyFromHistory]);

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

  // ── Sheet-like Keyboard Shortcuts: Ctrl+A (Select All), Ctrl+C (Copy Rows), Escape (Clear), Delete (Clear Cells) ──
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

      // 1. Escape: Clear Cell Selection / Row Selection / Exit Delete Mode
      if (e.key === 'Escape') {
        if (selectedCells.size > 0) {
          e.preventDefault();
          setSelectedCells(new Set());
          return;
        }
        if (selectedRowIds.size > 0 || isSelectMode || isDeleteMode) {
          e.preventDefault();
          handleClearSelection();
        }
        return;
      }

      // 2. Delete / Backspace: Clear Selected Cell Values (when cells are selected and not typing in an input)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingInput) {
        if (selectedCells.size > 0) {
          e.preventDefault();
          handleRequestCellDelete();
          return;
        }
      }

      // 3. Ctrl+A / Cmd+A: Copy All Rows (when not focused in an input/textarea)
      if (isCmdOrCtrl && (e.key === 'a' || e.key === 'A')) {
        if (!isEditingInput && rows.length > 0) {
          e.preventDefault();
          handleCopyAll(e as any);
        }
        return;
      }

      // 4. Ctrl+C / Cmd+C: Copy Selected Rows (ONLY when rows are selected)
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

      // 5. Shift+D / Shift+d: Delete Selected Rows (or Toggle Delete Mode)
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
  }, [
    rows,
    selectedRowIds,
    selectedCells,
    isSelectMode,
    isDeleteMode,
    handleDeleteSelected,
    handleRequestCellDelete,
    handleToggleDeleteMode,
    handleClearSelection,
    handleCopyAll,
    handleCopyEntireRow,
    toast,
  ]);

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-surface-sunken border border-border shadow-xs flex items-center justify-center text-fg-subtle">
          <ClipboardList size={26} strokeWidth={1.75} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-fg">
            {isReadOnly ? 'No Calls Logged for this Date' : 'Daily Calling Register Ready'}
          </p>
          <p className="text-xs text-fg-subtle mt-1 max-w-sm mx-auto">
            {isReadOnly
              ? 'There are no call records or scheduled calls for the selected date.'
              : 'Click "Load Contacts" or "Paste from Excel" in the toolbar to populate your target company contacts for today.'}
          </p>
        </div>
      </div>
    );
  }

  const gridTemplate = isReadOnly
    ? 'grid-cols-[56px_100px_90px_90px_260px_200px_240px_270px_150px_180px_150px_minmax(260px,1fr)]'
    : 'grid-cols-[56px_100px_90px_90px_260px_200px_240px_270px_180px_150px_minmax(260px,1fr)]';

  return (
    <div className="flex-1 relative flex flex-col min-h-0">
      {/* Grid Container */}
      <div className="flex-1 overflow-auto rounded-xl border border-border bg-surface">
        <div className={isReadOnly ? 'min-w-[2060px]' : 'min-w-[1910px]'}>
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
                isActive={activeRowId === row._id}
                onRowClick={() => setActiveRowId(row._id)}
                isSelectMode={isSelectMode}
                isDeleteMode={isDeleteMode}
                selectionTheme={effectiveTheme}
                isReadOnly={isReadOnly}
                onUpdate={(patch) => handleRowUpdateWithAutoAdvance(row._id, patch)}
                onEdit={onEdit}
                onDelete={() => onDelete(row._id)}
                onCall={onCall}
                onToggleSelect={handleToggleSelectRow}
                onCopySingle={isReadOnly ? handleCopySingleRowToWorkspace : undefined}
                isCellSelected={(field) => selectedCells.has(`${row._id}:${field}`)}
                onCellMouseDown={(field, e) => handleCellMouseDown(row._id, index, field, e)}
                onCellMouseEnter={(field) => handleCellMouseEnter(row._id, index, field)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Indicator for Selected Cells (Excel / Google Sheets style Copy, Paste, Delete) */}
      {!isReadOnly && selectedCells.size > 0 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-[#161D2E] border-2 border-slate-300 dark:border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.35)] rounded-2xl px-4 py-2 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200 opacity-100">
          <div className="flex items-center gap-2 pr-2.5 border-r border-border">
            <span className="w-5 h-5 rounded-full bg-blue-600 dark:bg-sky-500 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
              {selectedCells.size}
            </span>
            <span className="text-xs font-semibold text-fg whitespace-nowrap">
              Cell{selectedCells.size > 1 ? 's' : ''} Selected
            </span>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopySelectedCells}
            className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Copy selected cell values"
          >
            Copy
          </button>

          {/* Paste Button */}
          <button
            type="button"
            onClick={() => handlePasteSelectedCells()}
            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Paste clipboard values"
          >
            Paste
          </button>

          {/* Dustbin Icon Delete Button */}
          <button
            type="button"
            onClick={handleRequestCellDelete}
            className="w-7 h-7 rounded-xl bg-destructive/15 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 border border-destructive/20"
            title="Delete selected cell values"
          >
            <Trash2 size={13} strokeWidth={2.2} />
          </button>

          <button
            type="button"
            onClick={() => setSelectedCells(new Set())}
            className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface transition-colors cursor-pointer shadow-2xs"
            title="Deselect cells (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* In-App Confirmation Pop-Up Modal for Cell Value Deletion */}
      {showCellDeleteConfirm && (
        <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#161D2E] border-2 border-slate-300 dark:border-slate-700 shadow-2xl rounded-2xl p-5 max-w-xs w-full space-y-4 animate-in zoom-in-95 duration-150 relative opacity-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-fg">Delete Cell Values?</h3>
                <p className="text-xs text-fg-subtle mt-0.5">
                  Are you sure you want to clear values from {selectedCells.size} selected cell{selectedCells.size > 1 ? 's' : ''}?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowCellDeleteConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-fg transition-all cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCellDelete}
                className="px-4 py-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toolbar in History Mode when rows are selected */}
      {isReadOnly && selectedRowIds.size > 0 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-surface/95 dark:bg-zinc-900/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl px-4 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pr-2 border-r border-border">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-xs">
              {selectedRowIds.size}
            </span>
            <span className="text-xs font-semibold text-fg whitespace-nowrap">
              Row{selectedRowIds.size > 1 ? 's' : ''} Selected
            </span>
          </div>

          {/* Primary Action: Copy Selected to Today's Workspace */}
          <button
            type="button"
            onClick={handleCopySelectedToWorkspace}
            disabled={isCopyingToWorkspace}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary hover:bg-blue-700 text-primary-foreground text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {isCopyingToWorkspace ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CopyPlus size={14} strokeWidth={2.4} />
            )}
            <span>Copy to Today&apos;s Workspace</span>
          </button>

          {/* Secondary Action: Copy Text to Clipboard */}
          <button
            type="button"
            onClick={(e) => handleCopyEntireRow(e as any)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-sunken hover:bg-surface-raised text-fg border border-border text-xs font-medium transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            title="Copy selected row details as text"
          >
            <Copy size={13} strokeWidth={2} />
            <span className="hidden sm:inline">Copy Text</span>
          </button>

          {/* Secondary Action: Copy Contacts */}
          <button
            type="button"
            onClick={handleCopyContacts}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-sunken hover:bg-surface-raised text-blue-600 dark:text-blue-400 border border-border text-xs font-medium transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            title="Copy phone numbers from selected rows"
          >
            <span>Contacts</span>
          </button>

          {/* Secondary Action: Copy Emails */}
          <button
            type="button"
            onClick={handleCopyEmails}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-sunken hover:bg-surface-raised text-emerald-600 dark:text-emerald-400 border border-border text-xs font-medium transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            title="Copy email IDs from selected rows"
          >
            <span>Emails</span>
          </button>

          {/* Deselect / Cancel */}
          <button
            type="button"
            onClick={handleClearSelection}
            className="p-1.5 rounded-xl hover:bg-surface-sunken text-fg-subtle hover:text-fg transition-colors cursor-pointer text-xs ml-1"
            title="Clear selection (Esc)"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}



