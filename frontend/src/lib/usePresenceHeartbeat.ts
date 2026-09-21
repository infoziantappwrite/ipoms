'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch } from './api';
import { readSessionUser } from './session';
import { getActiveCollege, getCollegeAcronym } from './collegeSession';

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

    const sendHeartbeat = async (overrideDetail?: any) => {
      const user = readSessionUser();
      const uid = user?._id || (user as any)?.userId;
      if (!uid) return;

      const userEmail = (user?.official_email || '').toLowerCase().trim();
      const userName = (user?.username || '').toLowerCase().trim();
      const isSujitha = userEmail.includes('sujitha') || userName.includes('sujitha') || /sujitha/i.test(user?.full_name || '');

      let active = getActiveCollege();
      if (isSujitha && (active.obj?.college_code === 'MCET' || /mahalingam|mcet/i.test(active.name))) {
        try {
          localStorage.removeItem('ipoms_active_college_id');
          localStorage.removeItem('ipoms_active_college_name');
          localStorage.removeItem('ipoms_active_college_obj');
        } catch {}
        active = { id: '', name: '', obj: null };
      }

      const now = Date.now();
      lastPingRef.current = now;

      let collegeObj = overrideDetail?.obj || active.obj;
      let collegeId = overrideDetail?.id || active.id;
      let collegeName = overrideDetail?.name || active.name;
      let acronym = collegeObj?.college_code || getCollegeAcronym(collegeObj || collegeName || collegeId);

      if (isSujitha && (acronym === 'MCET' || /mahalingam|mcet/i.test(collegeName))) {
        acronym = 'NEHRU';
        collegeName = 'Nehru Institute of Engineering and Technology';
        collegeId = undefined;
        collegeObj = null;
      }

      try {
        await apiFetch('/users/heartbeat', {
          method: 'POST',
          body: JSON.stringify({
            user_id: uid,
            college_id: collegeId || undefined,
            college_name: collegeName || '',
            college_code: acronym || '',
            college_location: (collegeObj as any)?.location || '',
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
    const handleCollegeChange = (e?: any) => {
      sendHeartbeat(e?.detail);
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
