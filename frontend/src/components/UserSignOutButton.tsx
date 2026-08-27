'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { readSessionUser, type SessionUser } from '@/lib/session';
import { apiFetch } from '@/lib/api';

interface Props {
  className?: string;
}

export function UserSignOutButton({ className = '' }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    setUser(readSessionUser());
  }, []);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* network error — proceed with local sign-out anyway */
    }

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ipoms_token');
        localStorage.removeItem('ipoms_user');
        sessionStorage.removeItem('ipoms_nav_intro');
        sessionStorage.removeItem('ipoms_splash_seen');
      }
    } catch {
      /* storage error ignore */
    }

    // Smooth redirect to login
    router.push('/login');
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      title="Sign Out of iPOMS"
      aria-label="Sign out"
      disabled={isSigningOut}
      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-border bg-surface hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-800 text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-all shadow-2xs select-none group active:scale-95 cursor-pointer flex items-center justify-center ${className}`}
    >
      <LogOut size={16} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
