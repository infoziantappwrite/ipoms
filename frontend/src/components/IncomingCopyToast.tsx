'use client';

import { useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';
import { useToast } from '@/components/ui/Toast';

/**
 * Shows a toast when another college copies Weekly Tracker companies to one of this person's colleges
 * ("One data received from ACET College"). The server writes an in-app notification for the receiving
 * coordinator (backend/src/lib/weeklyTransferRoutes.ts); this picks it up shortly after, shows it once,
 * and marks it read so it never repeats. Mounted once in AppShell.
 */
const TITLE = 'Weekly Tracker copy received';
const POLL_MS = 15_000;

export function IncomingCopyToast() {
  const { toast } = useToast();
  const shown = useRef<Set<string>>(new Set());

  useEffect(() => {
    let stopped = false;

    const check = async () => {
      const user: any = readSessionUser();
      const uid = user?._id || user?.id;
      if (!uid || document.visibilityState === 'hidden') return;
      try {
        const res: any = await apiFetch('/notifications?tab=unread&notification_type=system_update');
        const list: any[] = Array.isArray(res?.data?.notifications) ? res.data.notifications : Array.isArray(res?.data) ? res.data : [];
        for (const n of list) {
          if (stopped || n.title !== TITLE || shown.current.has(n._id)) continue;
          shown.current.add(n._id);
          toast(n.message, 'info');
          apiFetch(`/notifications/${n._id}/read`, { method: 'PATCH', body: JSON.stringify({ user_id: uid }) }).catch(() => {});
        }
      } catch {
        /* a failed poll just tries again next time */
      }
    };

    const first = window.setTimeout(check, 3000);
    const timer = window.setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [toast]);

  return null;
}
