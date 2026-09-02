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

export interface CollegeOccupancy extends College {
  is_occupied?: boolean;
  occupied_by?: { user_id: string; name: string; email: string } | null;
  is_selected_by_me?: boolean;
}

let memoryCachedColleges: CollegeOccupancy[] = [];

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

export function getCachedColleges(): CollegeOccupancy[] {
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

export function setCachedColleges(list: CollegeOccupancy[]): void {
  if (!Array.isArray(list) || list.length === 0) return;
  memoryCachedColleges = list;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ALL_COLLEGES_CACHE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('ipoms_colleges_loaded', { detail: { colleges: list } }));
  } catch {}
}

export async function fetchAllCollegesCached(): Promise<CollegeOccupancy[]> {
  const cached = getCachedColleges();
  try {
    const res = await apiFetch('/colleges/focus-matrix');
    if (res.success && Array.isArray((res.data as any)?.colleges) && (res.data as any).colleges.length > 0) {
      const liveList: CollegeOccupancy[] = (res.data as any).colleges;
      setCachedColleges(liveList);

      const focusData = (res.data as any)?.current_user_focus;
      if (focusData && typeof window !== 'undefined') {
        if (focusData.is_locked) {
          localStorage.setItem(COORDINATOR_FOCUS_LOCKED_KEY, 'true');
          localStorage.setItem(COORDINATOR_FOCUS_WEEK_KEY, focusData.week_key || getCurrentWeekMondayKey());
          if (Array.isArray(focusData.selected_college_ids) && focusData.selected_college_ids.length > 0) {
            localStorage.setItem(COORDINATOR_SELECTED_COLLEGES_KEY, JSON.stringify(focusData.selected_college_ids));
          }
        }
      }

      return liveList;
    }
  } catch (err) {
    console.warn('[Colleges] Background focus-matrix fetch failed, using cached list', err);
  }
  return cached;
}

/**
 * Real-time fetch of college occupancy focus matrix from backend
 */
export async function fetchCollegeFocusMatrix(): Promise<{
  colleges: CollegeOccupancy[];
  isLocked: boolean;
  selectedIds: string[];
  weekKey: string;
}> {
  try {
    const res = await apiFetch('/colleges/focus-matrix');
    if (res.success && res.data) {
      const liveList: CollegeOccupancy[] = (res.data as any).colleges || [];
      const focusData = (res.data as any).current_user_focus || {};
      const weekKey = (res.data as any).week_key || getCurrentWeekMondayKey();
      const isLocked = Boolean(focusData.is_locked);
      const selectedIds = Array.isArray(focusData.selected_college_ids) ? focusData.selected_college_ids : [];

      if (liveList.length > 0) {
        setCachedColleges(liveList);
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(COORDINATOR_FOCUS_WEEK_KEY, weekKey);
        localStorage.setItem(COORDINATOR_FOCUS_LOCKED_KEY, isLocked ? 'true' : 'false');
        if (selectedIds.length > 0) {
          localStorage.setItem(COORDINATOR_SELECTED_COLLEGES_KEY, JSON.stringify(selectedIds));
        }
      }

      return {
        colleges: liveList,
        isLocked,
        selectedIds,
        weekKey,
      };
    }
  } catch (err) {
    console.error('Failed to fetch college focus matrix:', err);
  }

  return {
    colleges: getCachedColleges(),
    isLocked: isFocusLockedToday(),
    selectedIds: getCoordinatorSelectedColleges(),
    weekKey: getCurrentWeekMondayKey(),
  };
}

/**
 * Locks focus on the backend and synchronizes local storage & events
 */
export async function lockDailyFocusApi(ids: string[]): Promise<{ success: boolean; message?: string }> {
  const sanitized = Array.from(new Set(ids.filter(Boolean))).slice(0, 4);
  if (sanitized.length === 0 || sanitized.length > 4) {
    return { success: false, message: 'Please select between 1 and 4 partner colleges.' };
  }

  try {
    const res = await apiFetch('/colleges/lock-focus', {
      method: 'POST',
      body: JSON.stringify({ college_ids: sanitized }),
    });

    if (!res.success) {
      const errMsg = (res as any)?.error?.message || (res as any)?.message || 'Failed to lock college focus.';
      return { success: false, message: errMsg };
    }

    const weekKey = (res.data as any)?.week_key || getCurrentWeekMondayKey();
    const today = getTodayKey();

    if (typeof window !== 'undefined') {
      localStorage.setItem(COORDINATOR_SELECTED_COLLEGES_KEY, JSON.stringify(sanitized));
      localStorage.setItem(COORDINATOR_FOCUS_DATE_KEY, today);
      localStorage.setItem(COORDINATOR_FOCUS_WEEK_KEY, weekKey);
      localStorage.setItem(COORDINATOR_FOCUS_LOCKED_KEY, 'true');

      // Auto-set first selected college as active session
      const all = getCachedColleges();
      const firstCol = all.find((c) => c._id === sanitized[0]);
      if (firstCol) {
        setActiveCollege(firstCol._id, firstCol.college_name, firstCol);
      }

      window.dispatchEvent(
        new CustomEvent('ipoms_focus_updated', {
          detail: { selectedIds: sanitized, isLocked: true, date: today, weekKey },
        })
      );
      window.dispatchEvent(
        new CustomEvent('ipoms_coordinator_colleges_changed', {
          detail: { selectedIds: sanitized },
        })
      );
    }

    return {
      success: true,
      message: (res as any)?.message || 'Active college focus locked successfully!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error while locking focus.',
    };
  }
}

/**
 * Unlocks focus on the backend so coordinator can adjust selection
 */
export async function unlockDailyFocusApi(): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch('/colleges/unlock-focus', {
      method: 'POST',
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(COORDINATOR_FOCUS_LOCKED_KEY, 'false');
      window.dispatchEvent(
        new CustomEvent('ipoms_focus_updated', {
          detail: { selectedIds: getCoordinatorSelectedColleges(), isLocked: false },
        })
      );
    }

    return {
      success: true,
      message: (res as any)?.message || 'Focus unlocked. You can now adjust your partner institutions.',
    };
  } catch (err: any) {
    unlockDailyFocus(); // Fallback to local unlock
    return { success: true, message: 'Focus unlocked locally.' };
  }
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

  const selectedSet = new Set(selectedIds.map(s => String(s).toLowerCase().trim()));

  for (const col of allColleges) {
    const isExplicitlyPinned =
      selectedSet.has(String(col._id).toLowerCase()) ||
      selectedSet.has(String(col.college_code).toLowerCase()) ||
      Boolean((col as any).is_selected_by_me);

    if (isExplicitlyPinned) {
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
