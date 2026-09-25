'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { readSessionUser, updateSessionUser } from '@/lib/session';

/**
 * True when the signed-in person is a full-oversight Team Leader (`has_all_colleges_access`, e.g. Malvika
 * Kumar) - someone who monitors every college and does not place calls, so the Daily Tracker is read-only
 * for them.
 *
 * The flag is part of the login response now, but a session that was opened before that change does not
 * carry it, so it is looked up once from the person's own profile and stored back in the session.
 * Until it is known this is false: the server refuses the changes either way.
 */
export function useFullAccessViewer(): boolean {
  const [full, setFull] = useState(false);

  useEffect(() => {
    let alive = true;
    const user: any = readSessionUser();
    if (!user) return;
    if (typeof user.has_all_colleges_access === 'boolean') {
      setFull(user.has_all_colleges_access);
      return;
    }
    const id = user._id || user.id;
    if (!id) return;
    apiFetch<any>(`/profile/${id}`)
      .then((res) => {
        if (!alive || !res?.success || !res.data) return;
        const flag = Boolean(res.data.has_all_colleges_access);
        setFull(flag);
        try { updateSessionUser({ has_all_colleges_access: flag } as any, false); } catch { /* ignore */ }
      })
      .catch(() => { /* leave as false; the server still enforces it */ });
    return () => { alive = false; };
  }, []);

  return full;
}
