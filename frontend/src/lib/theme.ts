'use client';

export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'ipoms_theme';
export const MANUAL_OVERRIDE_KEY = 'ipoms_theme_manual_override';

declare global {
  interface Window {
    __ipoms_theme_interval_set?: boolean;
  }
}

/**
 * Evaluates the time-based auto theme schedule:
 * - 7:00 PM (19:00) to 5:59:59 AM (05:59) -> Dark theme
 * - 6:00 AM (06:00) to 6:59:59 PM (18:59) -> Light theme
 */
export function getScheduledTheme(): 'light' | 'dark' {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 19 || hour < 6) {
    return 'dark';
  }
  return 'light';
}

/**
 * Checks if the user has explicitly manually toggled/set the theme.
 */
export function hasManualOverride(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(MANUAL_OVERRIDE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Clears the manual override and returns to auto-scheduled theme switching.
 */
export function clearManualOverride() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(MANUAL_OVERRIDE_KEY);
    const scheduled = getScheduledTheme();
    applyTheme(scheduled, false);
  } catch {
    // ignore
  }
}

/**
 * Returns the currently active stored theme ('light', 'dark', or 'system').
 * If user manually chose a theme, returns that fixed choice.
 * Otherwise, follows the 7:00 PM - 6:00 AM auto-schedule.
 */
export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    if (hasManualOverride()) {
      const val = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (val === 'dark' || val === 'light' || val === 'system') return val;
    }
    return getScheduledTheme();
  } catch {
    return 'light';
  }
}

/**
 * Resolves 'system' to either 'dark' or 'light' based on the OS preference.
 */
export function getResolvedTheme(theme?: Theme): 'light' | 'dark' {
  const current = theme || getStoredTheme();
  if (current === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return getScheduledTheme();
  }
  return current;
}

/**
 * Applies the given theme to the <html> document element and persists it.
 * @param theme 'light' | 'dark' | 'system'
 * @param isManual boolean - if true, locks the theme fixed until toggled again
 */
export function applyTheme(theme: Theme, isManual: boolean = false) {
  if (typeof window === 'undefined') return;

  try {
    if (isManual) {
      localStorage.setItem(MANUAL_OVERRIDE_KEY, 'true');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }

  const resolved = getResolvedTheme(theme);
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  }

  window.dispatchEvent(
    new CustomEvent('ipoms_theme_changed', {
      detail: { theme, resolved, isManual: hasManualOverride() },
    })
  );
}

/**
 * Toggles between 'light' and 'dark' manually (locks user's explicit preference).
 */
export function toggleTheme(): 'light' | 'dark' {
  const current = getResolvedTheme();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(next, true);
  return next as 'light' | 'dark';
}

/**
 * Initializes theme engine on mount:
 * - Respects manual overrides if set
 * - Auto-applies 7:00 PM - 6:00 AM dark schedule if on default mode
 * - Runs a 30-second background watchdog to transition smoothly at 7:00 PM and 6:00 AM
 */
export function initTheme() {
  if (typeof window === 'undefined') return;

  const current = getStoredTheme();
  applyTheme(current, hasManualOverride());

  // 30-Second watchdog for time-based schedule transition
  if (!window.__ipoms_theme_interval_set) {
    window.__ipoms_theme_interval_set = true;
    setInterval(() => {
      if (!hasManualOverride()) {
        const scheduled = getScheduledTheme();
        const root = document.documentElement;
        const isCurrentlyDark = root.classList.contains('dark');
        if ((scheduled === 'dark' && !isCurrentlyDark) || (scheduled === 'light' && isCurrentlyDark)) {
          applyTheme(scheduled, false);
        }
      }
    }, 30000);
  }

  // Cross-tab synchronization
  const handleStorage = (e: StorageEvent) => {
    if ((e.key === THEME_STORAGE_KEY || e.key === MANUAL_OVERRIDE_KEY) && e.newValue) {
      applyTheme(getStoredTheme(), hasManualOverride());
    }
  };
  window.addEventListener('storage', handleStorage);

  // OS listener for system preference
  if (window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (getStoredTheme() === 'system' && !hasManualOverride()) {
        applyTheme('system', false);
      }
    };
    media.addEventListener('change', listener);
  }
}
