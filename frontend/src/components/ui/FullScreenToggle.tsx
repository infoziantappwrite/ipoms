'use client';

import { useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  className?: string;
  variant?: 'icon' | 'compact' | 'pill';
}

export function FullScreenToggle({ className = '', variant = 'icon' }: Props) {
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
      className={`group w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-[0.992] cursor-pointer shadow-2xs border select-none bg-surface hover:bg-surface-raised border-border text-fg-subtle hover:text-fg ${className}`}
    >
      {isFullscreen ? (
        <Minimize2 size={16} strokeWidth={2.2} className="text-primary group-hover:scale-105 transition-transform" />
      ) : (
        <Maximize2 size={16} strokeWidth={2.2} className="group-hover:text-primary group-hover:scale-105 transition-transform" />
      )}
    </button>
  );
}
