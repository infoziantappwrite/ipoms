'use client';

import { useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  className?: string;
  variant?: 'icon' | 'compact' | 'pill';
  useGradient?: boolean;
}

export function FullScreenToggle({ className = '', variant = 'icon', useGradient = false }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    if (typeof document !== 'undefined') {
      setIsSupported(Boolean(document.fullscreenEnabled));
      document.addEventListener('fullscreenchange', checkFullscreen);
      return () => document.removeEventListener('fullscreenchange', checkFullscreen);
    }
  }, []);

  const handleToggle = useCallback(async () => {
    triggerHaptic('light');
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  }, []);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isFullscreen ? 'Exit Full Screen (F11 / Esc)' : 'Enter Full Screen Mode (F11)'}
      aria-label={isFullscreen ? 'Exit Full Screen Mode' : 'Enter Full Screen Mode'}
      style={useGradient ? { background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 25%, #0284c7 60%, #1d4ed8 100%)' } : undefined}
      className={`group flex items-center justify-center transition-all duration-200 active:scale-[0.992] cursor-pointer shadow-xs select-none rounded-lg ${
        useGradient
          ? 'text-white border-none shadow-sky-500/25 hover:brightness-110 active:scale-95'
          : 'bg-surface hover:bg-surface-raised border border-border text-fg-subtle hover:text-fg shadow-2xs'
      } ${className || 'w-9 h-9'}`}
    >
      {isFullscreen ? (
        <Minimize2 size={15} strokeWidth={2.2} className={`${useGradient ? 'text-white' : 'text-primary'} group-hover:scale-105 transition-transform`} />
      ) : (
        <Maximize2 size={15} strokeWidth={2.2} className={`${useGradient ? 'text-white' : 'group-hover:text-primary'} group-hover:scale-105 transition-transform`} />
      )}
    </button>
  );
}
