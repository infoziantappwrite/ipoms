'use client';

import { College } from '@/components/CollegeSelector';
import { apiFetch } from './api';
import { readSessionUser } from './session';

export const ACTIVE_COLLEGE_ID_KEY = 'ipoms_active_college_id';
export const ACTIVE_COLLEGE_NAME_KEY = 'ipoms_active_college_name';
export const ACTIVE_COLLEGE_OBJ_KEY = 'ipoms_active_college_obj';
export const COORDINATOR_SELECTED_COLLEGES_KEY = 'ipoms_coordinator_selected_colleges';

export function getCoordinatorSelectedColleges(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COORDINATOR_SELECTED_COLLEGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
    }
  } catch {}
  
  // Fallback to currently active single college if available
  const active = getActiveCollege();
  return active.id ? [active.id] : [];
}

export function setCoordinatorSelectedColleges(ids: string[]): string[] {
  if (typeof window === 'undefined') return ids;
  const sanitized = Array.from(new Set(ids.filter(Boolean))).slice(0, 3);
  try {
    if (sanitized.length > 0) {
      localStorage.setItem(COORDINATOR_SELECTED_COLLEGES_KEY, JSON.stringify(sanitized));
      // Ensure the first selected college is also the active college session if not already in selection
      const currentActive = getActiveCollege();
      if (!currentActive.id || !sanitized.includes(currentActive.id)) {
        // Will be updated when college list loads
      }
    }
    window.dispatchEvent(
      new CustomEvent('ipoms_coordinator_colleges_changed', {
        detail: { selectedIds: sanitized },
      })
    );
  } catch {}
  return sanitized;
}

export function sortCollegesWithPriority(
  allColleges: College[],
  explicitSelectedIds?: string[]
): (College & { isPinned?: boolean })[] {
  if (!allColleges || allColleges.length === 0) return [];
  const selectedIds = explicitSelectedIds && explicitSelectedIds.length > 0
    ? explicitSelectedIds
    : getCoordinatorSelectedColleges();

  const pinned: (College & { isPinned?: boolean })[] = [];
  const unpinned: (College & { isPinned?: boolean })[] = [];

  const selectedSet = new Set(selectedIds);

  for (const col of allColleges) {
    if (selectedSet.has(col._id)) {
      pinned.push({ ...col, isPinned: true });
    } else {
      unpinned.push({ ...col, isPinned: false });
    }
  }

  // 1. Sort selected/pinned colleges alphabetically by college_name
  pinned.sort((a, b) => a.college_name.localeCompare(b.college_name));

  // 2. Sort remaining colleges alphabetically by college_name
  unpinned.sort((a, b) => a.college_name.localeCompare(b.college_name));

  // Pinned colleges appear as the top 1, 2, or 3 items
  return [...pinned, ...unpinned];
}

export function getActiveCollege(): { id: string; name: string; obj: College | null } {
  if (typeof window === 'undefined') return { id: '', name: '', obj: null };
  try {
    const id = localStorage.getItem(ACTIVE_COLLEGE_ID_KEY) || '';
    const name = localStorage.getItem(ACTIVE_COLLEGE_NAME_KEY) || '';
    const objStr = localStorage.getItem(ACTIVE_COLLEGE_OBJ_KEY);
    let obj: College | null = null;
    if (objStr) {
      try {
        obj = JSON.parse(objStr);
      } catch {}
    }
    return { id, name, obj };
  } catch {
    return { id: '', name: '', obj: null };
  }
}

export function setActiveCollege(id: string, name: string, obj?: College | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      localStorage.setItem(ACTIVE_COLLEGE_ID_KEY, id);
      localStorage.setItem(ACTIVE_COLLEGE_NAME_KEY, name || '');
      if (obj) {
        localStorage.setItem(ACTIVE_COLLEGE_OBJ_KEY, JSON.stringify(obj));
      } else {
        localStorage.removeItem(ACTIVE_COLLEGE_OBJ_KEY);
      }
    }
    window.dispatchEvent(new CustomEvent('ipoms_college_change', { detail: { id, name, obj } }));
  } catch {}
}

export async function resolveDefaultCollege(): Promise<{ id: string; name: string; obj: College | null }> {
  const current = getActiveCollege();
  if (current.id) return current;

  // Check user session colleges
  const user = readSessionUser();
  if ((user as any)?.colleges && (user as any).colleges.length > 0) {
    const firstCol = (user as any).colleges[0];
    const id = typeof firstCol === 'string' ? firstCol : firstCol._id;
    const name = typeof firstCol === 'string' ? '' : firstCol.college_name;
    const obj = typeof firstCol === 'string' ? null : firstCol;
    if (id) {
      setActiveCollege(id, name, obj);
      return { id, name, obj };
    }
  }

  // Fetch available colleges list
  try {
    const res = await apiFetch('/colleges');
    if (res.success && Array.isArray((res.data as any)?.colleges) && (res.data as any).colleges.length > 0) {
      const first = (res.data as any).colleges[0];
      setActiveCollege(first._id, first.college_name, first);
      return { id: first._id, name: first.college_name, obj: first };
    }
  } catch {}

  return { id: '', name: '', obj: null };
}
