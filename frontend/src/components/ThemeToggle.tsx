'use client';

import { useEffect, useState } from 'react';
import { AnimatedThemeIcon } from '@/components/icons/AnimatedIcons';
import { getStoredTheme, getResolvedTheme, toggleTheme, Theme } from '@/lib/theme';

interface Props {
  variant?: 'pill' | 'icon' | 'compact';
  className?: string;
  useGradient?: boolean;
}

export function ThemeToggle({ className = '', useGradient = false }: Props) {
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    setCurrentTheme(getStoredTheme());
    setResolvedTheme(getResolvedTheme());

    const handleThemeChange = (e: any) => {
      if (e.detail) {
        setCurrentTheme(e.detail.theme);
        setResolvedTheme(e.detail.resolved);
      }
    };

    window.addEventListener('ipoms_theme_changed', handleThemeChange);
    return () => window.removeEventListener('ipoms_theme_changed', handleThemeChange);
  }, []);

  const handleToggle = () => {
    const next = toggleTheme();
    setResolvedTheme(next);
    setCurrentTheme(next);
  };

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-xl bg-surface-sunken border border-border animate-pulse ${className}`} />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      style={useGradient ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
      className={`group flex items-center justify-center transition-all duration-200 active:scale-[0.992] cursor-pointer shadow-xs select-none rounded-lg ${
        useGradient
          ? 'text-white border-none shadow-blue-500/25 hover:brightness-110 active:scale-95'
          : 'bg-surface hover:bg-surface-raised border border-border text-fg shadow-2xs'
      } ${className || 'w-9 h-9'}`}
    >
      <AnimatedThemeIcon isDark={isDark} size={16} className={useGradient ? 'text-white' : undefined} />
    </button>
  );
}
