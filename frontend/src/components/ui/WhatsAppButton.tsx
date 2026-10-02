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
  // 'sm' (default): a small, soft-rounded SQUARE badge sized to sit level with a single row of
  // mobile-number text — not a big circular icon. The source artwork is a solid-colour circle, so
  // getting an actual square silhouette means cropping its outer margin flush with the frame
  // (object-cover + overflow-hidden); because the circle is one flat colour, that crop only removes
  // empty background, never any part of the phone/chat glyph in the centre — nothing meaningful is
  // cut off, unlike the earlier cropping bug this was built to avoid. 'md' is kept uncropped and
  // circular for roomier contexts (e.g. the softphone panel) that want a larger tap target.
  const size = props.size || 'sm';
  const buttonSizeClass =
    size === 'sm'
      ? 'w-4 h-4 rounded-[5px] overflow-hidden'
      : 'w-5.5 h-5.5 rounded-full';
  const imageFitClass = size === 'sm' ? 'object-cover' : 'object-contain';

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
        className={`${buttonSizeClass} shrink-0 aspect-square flex items-center justify-center transition-transform hover:scale-110 active:scale-[0.95] cursor-pointer shadow-2xs group/wa`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/whatsapp-icon.png"
          alt="WhatsApp"
          className={`w-full h-full ${imageFitClass} pointer-events-none select-none`}
        />
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
              <div className="w-5 h-5 aspect-square rounded-full flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/whatsapp-icon.png"
                  alt="WhatsApp"
                  className="w-full h-full object-contain select-none"
                />
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
