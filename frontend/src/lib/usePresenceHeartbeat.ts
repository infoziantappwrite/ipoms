'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch } from './api';
import { readSessionUser } from './session';
import { getActiveCollege } from './collegeSession';

const HEARTBEAT_INTERVAL_MS = 25000; // 25 seconds

/**
 * usePresenceHeartbeat:
 * Automatically broadcasts the user's active college and online presence
 * to the backend every 25s, and immediately on college selection/route changes.
 */
export function usePresenceHeartbeat() {
  const pathname = usePathname();
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let mounted = true;

    const sendHeartbeat = async () => {
      const user = readSessionUser();
      const uid = user?._id || (user as any)?.userId;
      if (!uid) return;

      const active = getActiveCollege();
      const now = Date.now();
      lastPingRef.current = now;

      try {
        await apiFetch('/users/heartbeat', {
          method: 'POST',
          body: JSON.stringify({
            user_id: uid,
            college_id: active.id || undefined,
            college_name: active.name || '',
            college_code: active.obj?.college_code || '',
            college_location: (active.obj as any)?.location || '',
            current_page: pathname || (typeof window !== 'undefined' ? window.location.pathname : ''),
            is_online: true,
          }),
        });
      } catch (err) {
        // Silent catch for background heartbeat
      }
    };

    // 1. Initial immediate ping
    sendHeartbeat();

    // 2. Periodic interval
    timer = setInterval(() => {
      if (mounted) {
        sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    // 3. Trigger immediate ping on college switch
    const handleCollegeChange = () => {
      sendHeartbeat();
    };

    // 4. Trigger on tab visibility regain
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastPingRef.current > 10000) {
          sendHeartbeat();
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('ipoms_college_change' as any, handleCollegeChange);
      window.addEventListener('ipoms_focus_updated' as any, handleCollegeChange);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('ipoms_college_change' as any, handleCollegeChange);
        window.removeEventListener('ipoms_focus_updated' as any, handleCollegeChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [pathname]);
}
