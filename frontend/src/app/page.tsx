'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SplashScreen } from '@/components/SplashScreen';
import { readSessionUser } from '@/lib/session';

/** 1.2-second smooth splash duration before proceeding to authentication or dashboard */
const SPLASH_MS = 1200;

export default function EntryPage() {
  const router = useRouter();
  const timer = useRef<number | null>(null);

  const leaveSplash = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const user = readSessionUser();
    if (user?._id) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    timer.current = window.setTimeout(() => {
      leaveSplash();
    }, SPLASH_MS);

    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [leaveSplash]);

  // Any keypress or click skips ahead
  useEffect(() => {
    const onKey = () => leaveSplash();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leaveSplash]);

  return <SplashScreen onSkip={leaveSplash} />;
}
