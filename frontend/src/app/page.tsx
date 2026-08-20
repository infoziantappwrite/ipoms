'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SplashScreen } from '@/components/SplashScreen';

const SPLASH_MS = 2000;
const SEEN_KEY = 'ipoms_splash_seen';

function hasSeenSplash() {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // Private mode / storage blocked — treat as unseen and just show the splash.
    return false;
  }
}

function markSplashSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* no-op */
  }
}

/**
 * Entry gate.
 *
 *   first visit this browser session → splash for 2s → /login
 *   already splashed this session    → straight to /home
 *
 * sessionStorage is unavailable during SSR, so the decision has to happen in an
 * effect. We render null until it is made — one blank frame on an already-white
 * page, which is invisible, and avoids a flash of splash for return visits.
 *
 * The "seen" flag is written when the splash *finishes*, not when it starts.
 * React StrictMode double-invokes effects in dev; writing on entry meant the
 * second invocation read the flag the first had just written and bounced
 * straight to /home, so the splash never appeared.
 */
export default function EntryPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'checking' | 'splash'>('checking');
  const timer = useRef<number | null>(null);

  // `replace`, not `push`, so Back does not drop the user onto the splash again.
  const leaveSplash = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    markSplashSeen();
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (hasSeenSplash()) {
      router.replace('/home');
      return;
    }

    setPhase('splash');

    // Plain timeout, deliberately not tied to the CSS animation: the global
    // prefers-reduced-motion rule zeroes animation durations, and an
    // animation-coupled timer would strand those users here.
    timer.current = window.setTimeout(() => {
      markSplashSeen();
      router.replace('/login');
    }, SPLASH_MS);

    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [router]);

  // Any keypress skips ahead.
  useEffect(() => {
    if (phase !== 'splash') return;
    const onKey = () => leaveSplash();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, leaveSplash]);

  if (phase === 'checking') return null;

  return <SplashScreen onSkip={leaveSplash} />;
}
