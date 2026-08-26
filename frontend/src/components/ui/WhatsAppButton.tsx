'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Globe, Monitor, ExternalLink, Check, Settings2, Sparkles, MessageCircle } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export type WhatsAppTarget = 'web' | 'app' | 'universal';

interface WhatsAppButtonProps {
  mobileNumber?: string;
  contactName?: string;
  companyName?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const PREF_KEY = 'ipoms_whatsapp_preference';
const REMEMBER_KEY = 'ipoms_whatsapp_remember';

/**
 * Normalizes Indian and international phone numbers for WhatsApp API
 */
export function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // 10-digit Indian numbers (e.g. 9876123401 -> 919876123401)
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // 11-digit starting with 0 (e.g. 09876123401 -> 919876123401)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  return digits;
}

export function WhatsAppButton({
  mobileNumber,
  contactName,
  companyName,
  size = 'sm',
  className = '',
}: WhatsAppButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [savedPref, setSavedPref] = useState<WhatsAppTarget | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREF_KEY) as WhatsAppTarget | null;
      const isRemembered = localStorage.getItem(REMEMBER_KEY) === 'true';
      if (saved && isRemembered) {
        setSavedPref(saved);
        setRememberChoice(true);
      }
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const openWhatsApp = useCallback(
    (target: WhatsAppTarget) => {
      if (!mobileNumber) return;
      const formatted = formatWhatsAppNumber(mobileNumber);
      if (!formatted) return;

      triggerHaptic('light');

      // Save preference if remember is checked
      if (rememberChoice) {
        try {
          localStorage.setItem(PREF_KEY, target);
          localStorage.setItem(REMEMBER_KEY, 'true');
          setSavedPref(target);
        } catch {
          // ignore
        }
      }

      setIsOpen(false);

      if (target === 'web') {
        // WhatsApp Web in browser tab
        window.open(`https://web.whatsapp.com/send?phone=${formatted}`, '_blank', 'noopener,noreferrer');
      } else if (target === 'app') {
        // WhatsApp Desktop application protocol (Windows / Mac)
        window.location.href = `whatsapp://send?phone=${formatted}`;
      } else {
        // Universal wa.me link
        window.open(`https://wa.me/${formatted}`, '_blank', 'noopener,noreferrer');
      }
    },
    [mobileNumber, rememberChoice],
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setIsOpen((prev) => !prev);
  };

  if (!mobileNumber) return null;

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={handleClick}
        title={`Open WhatsApp chat with ${contactName || companyName || mobileNumber}`}
        className="w-5 h-5 rounded-md bg-[#25D366]/15 hover:bg-[#25D366]/30 border border-[#25D366]/40 dark:border-[#25D366]/60
                   text-[#25D366] flex items-center justify-center transition-all hover:scale-110 active:scale-90 cursor-pointer shrink-0 shadow-2xs group/wa"
      >
        <svg className="w-3 h-3 fill-[#25D366] group-hover/wa:fill-[#20ba5a] transition-colors" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      </button>

      {/* ── Origin-Anchored WhatsApp Choice Popover ────────────────────── */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 w-48 bg-surface/98 backdrop-blur-md border border-border rounded-2xl shadow-3 z-50 p-2 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 text-fg select-none origin-top-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-1.5 pt-0.5 pb-1 border-b border-border/60">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#25D366]/20 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 fill-[#25D366]" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-fg">WhatsApp</span>
            </div>
            <span className="text-[10px] font-mono text-fg-subtle">{mobileNumber}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-1">
            {/* Option 1: WhatsApp Web */}
            <button
              type="button"
              onClick={() => openWhatsApp('web')}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left bg-surface-sunken/60 hover:bg-surface-raised border border-border/70 hover:border-primary/40 transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Globe size={14} />
              </div>
              <span className="text-xs font-semibold text-fg">WhatsApp Web</span>
            </button>

            {/* Option 2: WhatsApp App */}
            <button
              type="button"
              onClick={() => openWhatsApp('app')}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left bg-surface-sunken/60 hover:bg-surface-raised border border-border/70 hover:border-emerald-500/40 transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Monitor size={14} />
              </div>
              <span className="text-xs font-semibold text-fg">WhatsApp App</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
