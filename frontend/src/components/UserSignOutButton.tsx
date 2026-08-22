'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { readSessionUser, type SessionUser } from '@/lib/session';
import { apiFetch } from '@/lib/api';

export function UserSignOutButton() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    setUser(readSessionUser());
  }, []);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    // Best-effort: clears the httpOnly "remember me" cookie server-side so
    // this device can't silently refresh a new session after sign-out.
    // Local storage is cleared regardless, even if this call fails.
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
      className="p-2 rounded-xl border border-border bg-surface text-fg-muted hover:text-danger hover:border-danger/40 hover:bg-danger/10 transition-all shadow-1 select-none group active:scale-[0.95] cursor-pointer flex items-center justify-center"
    >
      <LogOut size={16} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5 text-fg-muted group-hover:text-danger" />
    </button>
  );
}
