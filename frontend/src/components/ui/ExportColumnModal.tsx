'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Image as ImageIcon,
  Check,
  X,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

export interface ExportColumnDefinition {
  id: string;
  label: string;
  defaultSelected?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  format: 'pdf' | 'image';
  title?: string;
  availableColumns: ExportColumnDefinition[];
  onGenerate: (selectedColumnIds: string[]) => void;
  reportBuilderHref?: string;
  submitLabel?: string;
}

export function ExportColumnModal({
  isOpen,
  onClose,
  format,
  title = 'Report',
  availableColumns,
  onGenerate,
  reportBuilderHref = '/reports',
  submitLabel,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return availableColumns
      .filter((c) => c.defaultSelected !== false)
      .map((c) => c.id);
  });

  // Reset to default selection whenever modal opens or availableColumns change
  useEffect(() => {
    if (isOpen) {
      const defaultIds = availableColumns
        .filter((c) => c.defaultSelected !== false)
        .map((c) => c.id);
      setSelectedIds(defaultIds.length > 0 ? defaultIds : availableColumns.map((c) => c.id));
    }
  }, [isOpen, availableColumns]);

  if (!isOpen || typeof document === 'undefined') return null;

  const toggleColumn = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length === 1) {
        alert('Please select at least one column for the export.');
        return;
      }
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(availableColumns.map((c) => c.id));
  };

  const handleResetDefault = () => {
    const defaultIds = availableColumns
      .filter((c) => c.defaultSelected !== false)
      .map((c) => c.id);
    setSelectedIds(defaultIds.length > 0 ? defaultIds : availableColumns.map((c) => c.id));
  };

  const handleProceed = () => {
    if (selectedIds.length === 0) {
      alert('Please select at least one column.');
      return;
    }
    onGenerate(selectedIds);
    onClose();
  };

  const isPdf = format === 'pdf';

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      {/* Solid Dark Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 select-none text-fg flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-raised/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
                isPdf
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
              }`}
            >
              {isPdf ? <FileText size={18} strokeWidth={2.2} /> : <ImageIcon size={18} strokeWidth={2.2} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-fg leading-tight">
                Customize {isPdf ? 'PDF' : 'Image'} Columns
              </h2>
              <p className="text-xs text-fg-subtle">
                {title} • Select the columns you want in your export
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-sunken hover:bg-surface-raised flex items-center justify-center text-fg-subtle hover:text-fg transition-colors cursor-pointer border border-border"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Quick Actions & Counter Bar */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <SlidersHorizontal size={13} strokeWidth={2.5} />
              <span>
                {selectedIds.length} of {availableColumns.length} Columns Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-fg-muted hover:text-primary transition-colors cursor-pointer px-2 py-0.5 rounded-lg hover:bg-surface-raised"
              >
                Select All
              </button>
              <span className="text-border">•</span>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-xs font-semibold text-fg-muted hover:text-primary transition-colors cursor-pointer px-2 py-0.5 rounded-lg hover:bg-surface-raised flex items-center gap-1"
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>
          </div>

          {/* Checkbox Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {availableColumns.map((col) => {
              const isSelected = selectedIds.includes(col.id);
              return (
                <div
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-primary/5 border-primary text-fg font-semibold shadow-xs ring-1 ring-primary/20'
                      : 'bg-surface-sunken border-border text-fg-muted hover:border-fg-subtle hover:bg-surface-raised'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'border border-border bg-surface'
                    }`}
                  >
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </div>
                  <span className="text-xs truncate">{col.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-raised/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-fg-muted hover:text-fg bg-surface hover:bg-surface-raised border border-border rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleProceed}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
              isPdf
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isPdf ? <FileText size={14} strokeWidth={2.2} /> : <ImageIcon size={14} strokeWidth={2.2} />}
            <span>{submitLabel || 'Generate Report'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
