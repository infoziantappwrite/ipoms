'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Monitor } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export type WhatsAppTarget = 'web' | 'app' | 'universal';

interface WhatsAppButtonProps {
  mobileNumber?: string;
  phone?: string;
  phoneNumber?: string;
  contactName?: string;
  name?: string;
  hrName?: string;
  companyName?: string;
  company?: string;
  size?: 'sm' | 'md';
  className?: string;
  showChoiceDialog?: boolean;
}

/**
 * Normalizes Indian and international phone numbers for WhatsApp API
 */
export function formatWhatsAppNumber(phone: string): string {
  const primaryNumber = phone.split(/[,;/]+/)[0] || '';
  const digits = primaryNumber.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  return digits;
}

export function WhatsAppButton(props: WhatsAppButtonProps) {
  const mobileNumber = props.mobileNumber || props.phoneNumber || props.phone || '';
  const contactName = props.contactName || props.hrName || props.name || '';
  const companyName = props.companyName || props.company || '';
  const className = props.className || '';

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openAbove: boolean }>({ top: 0, left: 0, openAbove: false });
  const [mounted, setMounted] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverHeight = 135;
    const popoverWidth = 200;
    const openAbove = rect.bottom + popoverHeight > window.innerHeight;

    const top = openAbove ? Math.max(10, rect.top - popoverHeight - 6) : rect.bottom + 6;
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - popoverWidth - 10));

    setCoords({ top, left, openAbove });
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      updatePosition();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  const openWhatsApp = useCallback(
    (target: WhatsAppTarget) => {
      if (!mobileNumber) return;
      const formatted = formatWhatsAppNumber(mobileNumber);
      if (!formatted) return;

      triggerHaptic('light');
      setIsOpen(false);

      if (target === 'web') {
        window.open(`https://web.whatsapp.com/send?phone=${formatted}`, '_blank', 'noopener,noreferrer');
      } else if (target === 'app') {
        window.location.href = `whatsapp://send?phone=${formatted}`;
      } else {
        window.open(`https://wa.me/${formatted}`, '_blank', 'noopener,noreferrer');
      }
    },
    [mobileNumber]
  );

  if (!mobileNumber) return null;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title={`Open WhatsApp options for ${contactName || companyName || mobileNumber}`}
        className="w-5 h-5 rounded-md bg-[#25D366]/15 hover:bg-[#25D366]/30 border border-[#25D366]/40 dark:border-[#25D366]/60 text-[#25D366] flex items-center justify-center transition-all hover:scale-110 active:scale-[0.992] cursor-pointer shrink-0 shadow-2xs group/wa"
      >
        <svg className="w-3 h-3 fill-[#25D366] group-hover/wa:fill-[#20ba5a] transition-colors" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      </button>

      {/* Portaled Popover with 100% Solid Opaque Background & High Z-Index */}
      {isOpen && mounted && createPortal(
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="fixed w-52 bg-white dark:bg-[#161D2E] border-2 border-slate-300 dark:border-slate-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] z-[99999] p-2.5 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150 text-fg select-none opacity-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-2 pt-0.5 pb-1.5 border-b border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#161D2E]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-[#25D366]/20 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 fill-[#25D366]" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">WhatsApp</span>
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 truncate max-w-[95px]" title={mobileNumber}>{mobileNumber}</span>
          </div>

          {/* Action Buttons with 100% Solid Opaque Background */}
          <div className="flex flex-col gap-1.5 bg-white dark:bg-[#161D2E]">
            {/* Option 1: WhatsApp Web */}
            <button
              type="button"
              onClick={() => openWhatsApp('web')}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-blue-500 transition-all active:scale-[0.992] cursor-pointer group shadow-2xs opacity-100"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <Globe size={14} />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">WhatsApp Web</span>
            </button>

            {/* Option 2: WhatsApp App */}
            <button
              type="button"
              onClick={() => openWhatsApp('app')}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-emerald-500 transition-all active:scale-[0.992] cursor-pointer group shadow-2xs opacity-100"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <Monitor size={14} />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">WhatsApp App</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
