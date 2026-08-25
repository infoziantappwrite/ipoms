'use client';

import { useEffect, useState } from 'react';
import { AnimatedThemeIcon } from '@/components/icons/AnimatedIcons';
import { getStoredTheme, getResolvedTheme, toggleTheme, Theme } from '@/lib/theme';

interface Props {
  variant?: 'pill' | 'icon' | 'compact';
  className?: string;
}

export function ThemeToggle({ className = '' }: Props) {
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
      className={`group w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 hover:scale-105 cursor-pointer shadow-2xs border select-none bg-surface hover:bg-surface-raised border-border text-fg ${className}`}
    >
      <AnimatedThemeIcon isDark={isDark} size={18} />
    </button>
  );
}
