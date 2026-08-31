'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, ChevronDown, FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';

interface Props {
  onExportExcel: () => void;
  onExportPdf?: () => void;
  onExportImage?: () => void;
  isExporting?: boolean;
  className?: string;
  iconOnly?: boolean;
  title?: string;
}

export function SmoothExportDropdown({
  onExportExcel,
  onExportPdf,
  onExportImage,
  isExporting = false,
  className = '',
  iconOnly = false,
  title = 'Export Data (Excel, PDF, Image)',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    ready: boolean;
  }>({
    top: 0,
    left: 0,
    placement: 'bottom',
    ready: false,
  });

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 160;
    const popoverWidth = 230;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    // Align to right edge of trigger button
    let left = rect.right - popoverWidth;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) left = 12;

    return {
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left,
      placement: placeAbove ? ('top' as const) : ('bottom' as const),
      ready: true,
    };
  }, []);

  const handleToggle = () => {
    if (isExporting) return;
    if (isOpen) {
      setIsOpen(false);
      setCoords((prev) => ({ ...prev, ready: false }));
      return;
    }
    const initialCoords = calculateCoords();
    if (initialCoords) {
      setCoords(initialCoords);
    }
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setCoords((prev) => ({ ...prev, ready: false }));
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => {
      const newCoords = calculateCoords();
      if (newCoords) setCoords(newCoords);
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, calculateCoords]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={isExporting}
        onClick={handleToggle}
        className={
          iconOnly
            ? `w-9 h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95 shrink-0 relative ${className}`
            : `px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap shrink-0 ${className}`
        }
        title={title}
        aria-label={title}
      >
        <Download size={iconOnly ? 16 : 14} strokeWidth={2.2} className="shrink-0" />
        {!iconOnly && (
          <>
            <span>{isExporting ? 'Exporting…' : 'Export'}</span>
            <ChevronDown
              size={13}
              strokeWidth={2.5}
              className={`transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '200px',
              zIndex: 99999,
              transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none',
              visibility: coords.ready ? 'visible' : 'hidden',
            }}
            className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden p-1.5 space-y-0.5 select-none animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Excel Option */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportExcel();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-fg hover:bg-surface-raised hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={15} strokeWidth={2.2} />
              </div>
              <span className="font-semibold text-xs text-fg">Excel Document</span>
            </button>

            {/* PDF Option */}
            {onExportPdf && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportPdf();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-fg hover:bg-surface-raised hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <FileText size={15} strokeWidth={2.2} />
                </div>
                <span className="font-semibold text-xs text-fg">PDF Document</span>
              </button>
            )}

            {/* Image Option */}
            {onExportImage && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportImage();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-fg hover:bg-surface-raised hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ImageIcon size={15} strokeWidth={2.2} />
                </div>
                <span className="font-semibold text-xs text-fg">Image File</span>
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
