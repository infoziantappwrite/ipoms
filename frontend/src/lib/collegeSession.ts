'use client';

import { College } from '@/components/CollegeSelector';
import { apiFetch } from './api';
import { readSessionUser } from './session';

export const ACTIVE_COLLEGE_ID_KEY = 'ipoms_active_college_id';
export const ACTIVE_COLLEGE_NAME_KEY = 'ipoms_active_college_name';
export const ACTIVE_COLLEGE_OBJ_KEY = 'ipoms_active_college_obj';
export const COORDINATOR_SELECTED_COLLEGES_KEY = 'ipoms_coordinator_selected_colleges';
export const COORDINATOR_FOCUS_DATE_KEY = 'ipoms_coordinator_focus_date';
export const COORDINATOR_FOCUS_WEEK_KEY = 'ipoms_coordinator_focus_week';
export const COORDINATOR_FOCUS_LOCKED_KEY = 'ipoms_coordinator_focus_locked';
export const ALL_COLLEGES_CACHE_KEY = 'ipoms_cached_all_colleges';

let memoryCachedColleges: College[] = [];

/** Returns YYYY-MM-DD for today */
function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the ISO date (YYYY-MM-DD) of Monday for the given date's week.
 * Standard work week cycle: Monday (day 1) through Sunday (day 0).
 */
export function getCurrentWeekMondayKey(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayStr = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

export function getCachedColleges(): College[] {
  if (memoryCachedColleges && memoryCachedColleges.length > 0) {
    return memoryCachedColleges;
  }
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALL_COLLEGES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCachedColleges = parsed;
        return parsed;
      }
    }
  } catch {}
  return [];
}

export function setCachedColleges(list: College[]): void {
  if (!Array.isArray(list) || list.length === 0) return;
  memoryCachedColleges = list;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ALL_COLLEGES_CACHE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('ipoms_colleges_loaded', { detail: { colleges: list } }));
  } catch {}
}

export async function fetchAllCollegesCached(): Promise<College[]> {
  const cached = getCachedColleges();
  try {
    const res = await apiFetch('/colleges');
    if (res.success && Array.isArray((res.data as any)?.colleges) && (res.data as any).colleges.length > 0) {
      const liveList: College[] = (res.data as any).colleges;
      setCachedColleges(liveList);
      return liveList;
    }
  } catch (err) {
    console.warn('[Colleges] Background fetch failed, using cached list', err);
  }
  return cached;
}

/**
 * Check if the user has locked focus for the current work week (Monday through Sunday)
 * - On Monday (new week): Needs lock confirmation
 * - From Tuesday to Sunday: Persists locked state without repeatedly prompting
 */
export function isFocusLockedToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const locked = localStorage.getItem(COORDINATOR_FOCUS_LOCKED_KEY) === 'true';
    if (!locked) return false;

    const currentWeekMonday = getCurrentWeekMondayKey();
    const weekKey = localStorage.getItem(COORDINATOR_FOCUS_WEEK_KEY);
    const legacyDate = localStorage.getItem(COORDINATOR_FOCUS_DATE_KEY);

    // If locked for current week Monday-Sunday
    if (weekKey === currentWeekMonday) {
      const selected = getCoordinatorSelectedColleges();
      return selected.length >= 1 && selected.length <= 4;
    }

    // Check legacy single-day date: if it fell in the current week, upgrade it
    if (legacyDate) {
      const legacyMonday = getCurrentWeekMondayKey(new Date(legacyDate));
      if (legacyMonday === currentWeekMonday) {
        localStorage.setItem(COORDINATOR_FOCUS_WEEK_KEY, currentWeekMonday);
        const selected = getCoordinatorSelectedColleges();
        return selected.length >= 1 && selected.length <= 4;
      }
    }

    // If a new week (Monday) has started and wasn't locked yet
    return false;
  } catch {
    return false;
  }
}

/** Whether the user has an active focus selection (used by navigation guards) */
export function hasActiveDailyFocus(): boolean {
  return isFocusLockedToday();
}

/** Locks focus for 1 to 4 colleges for the entire week (Monday through Sunday) */
export function lockDailyFocus(ids: string[]): boolean {
  if (typeof window === 'undefined') return false;
  const sanitized = Array.from(new Set(ids.filter(Boolean))).slice(0, 4);
  if (sanitized.length === 0 || sanitized.length > 4) {
    return false;
  }

  try {
    const today = getTodayKey();
    const currentWeekMonday = getCurrentWeekMondayKey();
    localStorage.setItem(COORDINATOR_SELECTED_COLLEGES_KEY, JSON.stringify(sanitized));
    localStorage.setItem(COORDINATOR_FOCUS_DATE_KEY, today);
    localStorage.setItem(COORDINATOR_FOCUS_WEEK_KEY, currentWeekMonday);
    localStorage.setItem(COORDINATOR_FOCUS_LOCKED_KEY, 'true');

    // Auto-set the first selected college as the active college session if not already set
    const all = getCachedColleges();
    const firstCol = all.find((c) => c._id === sanitized[0]);
    if (firstCol) {
      setActiveCollege(firstCol._id, firstCol.college_name, firstCol);
    }

    window.dispatchEvent(
      new CustomEvent('ipoms_focus_updated', {
        detail: { selectedIds: sanitized, isLocked: true, date: today, weekKey: currentWeekMonday },
      })
    );
    window.dispatchEvent(
      new CustomEvent('ipoms_coordinator_colleges_changed', {
        detail: { selectedIds: sanitized },
      })
    );
    return true;
  } catch {
    return false;
  }
}

/** Unlocks focus so user can modify their selection on the Dashboard */
export function unlockDailyFocus(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COORDINATOR_FOCUS_LOCKED_KEY, 'false');
    window.dispatchEvent(
      new CustomEvent('ipoms_focus_updated', {
        detail: { selectedIds: getCoordinatorSelectedColleges(), isLocked: false },
      })
    );
  } catch {}
}

/** Preserves weekly focus on login if already locked for current week */
export function clearDailyFocusOnLogin(): void {
  if (typeof window === 'undefined') return;
  try {
    if (isFocusLockedToday()) {
      return;
    }
    localStorage.setItem(COORDINATOR_FOCUS_LOCKED_KEY, 'false');
    window.dispatchEvent(
      new CustomEvent('ipoms_focus_updated', {
        detail: { selectedIds: getCoordinatorSelectedColleges(), isLocked: false },
      })
    );
  } catch {}
}

export function getCoordinatorSelectedColleges(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COORDINATOR_SELECTED_COLLEGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 4);
      }
    }
  } catch {}
  return [];
}

export function setCoordinatorSelectedColleges(ids: string[]): string[] {
  if (typeof window === 'undefined') return ids;
  const sanitized = Array.from(new Set(ids.filter(Boolean))).slice(0, 4);
  try {
    if (sanitized.length > 0) {
      localStorage.setItem(COORDINATOR_SELECTED_COLLEGES_KEY, JSON.stringify(sanitized));
    } else {
      localStorage.removeItem(COORDINATOR_SELECTED_COLLEGES_KEY);
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
