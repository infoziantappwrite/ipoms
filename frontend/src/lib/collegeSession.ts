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
  is_shared_slot?: boolean;
  other_handlers_count?: number;
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

export const DEFAULT_OFFICIAL_COLLEGES: CollegeOccupancy[] = [
  { _id: 'col_karpagam', college_code: 'KARPAGAM', college_name: 'Karpagam College of Engineering', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/karpagam.png' },
  { _id: 'col_mcet', college_code: 'MCET', college_name: 'Dr. Mahalingam College of Engineering and Technology', location: 'Pollachi, Tamil Nadu', logo_url: '/college-logos/MCET.png' },
  { _id: 'col_acet', college_code: 'ACET', college_name: 'Achariya College of Engineering Technology', location: 'Puducherry', logo_url: '/college-logos/acet.png' },
  { _id: 'col_kpr', college_code: 'KPR', college_name: 'KPR Institute of Engineering and Technology', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/kpr.png' },
  { _id: 'col_aiht', college_code: 'AIHT', college_name: 'Anand Institute of Higher Technology', location: 'Chennai, Tamil Nadu', logo_url: '/college-logos/aiht.png' },
  { _id: 'col_kamaraj', college_code: 'KAMARAJ', college_name: 'Kamaraj College of Engineering and Technology', location: 'Virudhunagar, Tamil Nadu', logo_url: '/college-logos/kamaraj.png' },
  { _id: 'col_ngp', college_code: 'NGP', college_name: 'Dr. N.G.P. Institute of Technology', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/ngp.png' },
  { _id: 'col_mkce', college_code: 'MKCE', college_name: 'M.Kumarasamy College of Engineering', location: 'Karur, Tamil Nadu', logo_url: '/college-logos/mkce.png' },
  { _id: 'col_acew', college_code: 'ACEW', college_name: 'Arunachala College of Engineering for Women', location: 'Kanyakumari, Tamil Nadu', logo_url: '/college-logos/acew.png' },
  { _id: 'col_npr', college_code: 'NPR', college_name: 'NPR College of Engineering and Technology', location: 'Natham / Dindigul, Tamil Nadu', logo_url: '/college-logos/npr.png' },
  { _id: 'col_kiot', college_code: 'KIOT', college_name: 'Knowledge Institute of Technology', location: 'Salem, Tamil Nadu', logo_url: '/college-logos/kiot.jfif' },
  { _id: 'col_klu', college_code: 'KLU', college_name: 'Kalasalingam Academy of Research and Education', location: 'Virudhunagar, Tamil Nadu', logo_url: '/college-logos/klu.png' },
  { _id: 'col_smvec', college_code: 'SMVEC', college_name: 'Sri Manakula Vinayagar Engineering College', location: 'Puducherry', logo_url: '/college-logos/smvec.png' },
  { _id: 'col_dsu', college_code: 'DSU', college_name: 'Dhanalakshmi Srinivasan University', location: 'Perambalur / Trichy, Tamil Nadu', logo_url: '/college-logos/dsu.png' },
  { _id: 'col_psna', college_code: 'PSNA', college_name: 'PSNA College of Engineering and Technology', location: 'Dindigul, Tamil Nadu', logo_url: '/college-logos/psna.png' },
  { _id: 'col_sona', college_code: 'SONA', college_name: 'Sona College of Technology', location: 'Salem, Tamil Nadu', logo_url: '/college-logos/sona.png' },
  { _id: 'col_mec', college_code: 'MEC', college_name: 'Muthayammal Engineering College', location: 'Singlandhapuram, Tamil Nadu', logo_url: '/college-logos/MEC.png' },
  { _id: 'col_ngce', college_code: 'NGCE', college_name: 'Narayanaguru College of Engineering', location: 'Kanyakumari, Tamil Nadu', logo_url: '/college-logos/ngce.png' },
  { _id: 'col_hits', college_code: 'HITS', college_name: 'Hindustan Institute of Technology and Science', location: 'Chennai, Tamil Nadu', logo_url: '/college-logos/hits.png' },
  { _id: 'col_nehru', college_code: 'NEHRU', college_name: 'Nehru Institute of Technology', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/nehru.png' },
  { _id: 'col_marephra', college_code: 'MAREPHRAM', college_name: 'Mar Ephraem College of Engineering and Technology', location: 'Kanyakumari, Tamil Nadu', logo_url: '/college-logos/marephraem.png' },
];

/**
 * Official Default Weekly Pre-Selected Allocations for Coordinators and Team Leader.
 * Every Monday / Weekly Reset, these colleges are automatically selected by default for each person.
 */
export const DEFAULT_OFFICIAL_ALLOCATIONS: Record<string, string[]> = {
  // Mohana: KARPAGAM, AIHT, ACHARIYA (ACET), KPR
  'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
  'mohana': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
  'mohanaradha': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
  'a.mohanaradha': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
  'mohanaradha a': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],

  // Thirisha: PSNA, DSU, SMVEC
  'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
  'thirisha': ['PSNA', 'DSU', 'SMVEC'],
  'thirisha r': ['PSNA', 'DSU', 'SMVEC'],

  // Malvika: KLU, NGCE
  'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
  'malavika': ['KLU', 'NGCE'],
  'malvika': ['KLU', 'NGCE'],
  'malavika ramesh': ['KLU', 'NGCE'],

  // Lizenya: NPR, KIOT, ACEW
  'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
  'lizenya': ['NPR', 'KIOT', 'ACEW'],
  'lizenya r': ['NPR', 'KIOT', 'ACEW'],

  // Megala: NGP, KAMARAJ
  'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ'],
  'megala': ['NGP', 'KAMARAJ'],
  'megaladevi': ['NGP', 'KAMARAJ'],
  'megaladevi p s': ['NGP', 'KAMARAJ'],
  'megaladevi ps': ['NGP', 'KAMARAJ'],

  // Tamil / Seshmitha: MCET, MEC
  'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
  'tamil': ['MCET', 'MEC'],
  'seshmitha': ['MCET', 'MEC'],
  'tamilselvi': ['MCET', 'MEC'],
  'seshmitha tamilselvi': ['MCET', 'MEC'],
  'seshmitha tamilselvi r': ['MCET', 'MEC'],

  // Sujitha (Team Leader): NEHRU, MAREPHRAM, KPR, HITS, SONA
  'sujitha_s@infoziant.com': ['NEHRU', 'MAREPHRAM', 'KPR', 'HITS', 'SONA'],
  'sujitha': ['NEHRU', 'MAREPHRAM', 'KPR', 'HITS', 'SONA'],
  'sujitha s': ['NEHRU', 'MAREPHRAM', 'KPR', 'HITS', 'SONA'],
};

/** Resolves default official college IDs for the current user */
export function getDefaultOfficialCollegeIdsForUser(user?: any): string[] {
  const sessionUser = user || readSessionUser();
  if (!sessionUser) return [];

  const email = (sessionUser.official_email || sessionUser.email || '').toLowerCase().trim();
  const username = (sessionUser.username || '').toLowerCase().trim();
  const fullName = (sessionUser.full_name || '').toLowerCase().trim();

  let codes = DEFAULT_OFFICIAL_ALLOCATIONS[email] || DEFAULT_OFFICIAL_ALLOCATIONS[username] || DEFAULT_OFFICIAL_ALLOCATIONS[fullName];
  if (!codes) {
    for (const [key, val] of Object.entries(DEFAULT_OFFICIAL_ALLOCATIONS)) {
      if (
        (email && email.includes(key)) ||
        (username && username.includes(key)) ||
        (fullName && (fullName.includes(key) || key.includes(fullName)))
      ) {
        codes = val;
        break;
      }
    }
  }

  if (!codes || codes.length === 0) return [];

  const allKnown = getCachedColleges();
  const matchedIds: string[] = [];
  for (const code of codes) {
    const found = allKnown.find(
      (c) =>
        c.college_code?.toUpperCase() === code.toUpperCase() ||
        c._id === code ||
        c._id === `col_${code.toLowerCase()}`
    );
    if (found) {
      matchedIds.push(found._id);
    }
  }
  return matchedIds;
}

export function getCachedColleges(): CollegeOccupancy[] {
  if (memoryCachedColleges && memoryCachedColleges.length > 0) {
    return memoryCachedColleges;
  }
  if (typeof window !== 'undefined') {
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
  }
  return DEFAULT_OFFICIAL_COLLEGES;
}

export function getCollegeAcronym(college?: { college_code?: string; college_name?: string; _id?: string; id?: string; college_id?: string } | string | null): string {
  if (!college) return '';
  if (typeof college === 'string') {
    const raw = college.trim();
    if (raw.length <= 8 && !raw.includes(' ') && raw === raw.toUpperCase()) return raw;
    const allKnown = getCachedColleges();
    const match = allKnown.find((c) =>
      c._id === raw ||
      c.college_code.toUpperCase() === raw.toUpperCase() ||
      c.college_name.toLowerCase() === raw.toLowerCase() ||
      raw.toLowerCase().includes(c.college_name.toLowerCase()) ||
      c.college_name.toLowerCase().includes(raw.toLowerCase())
    );
    if (match?.college_code) return match.college_code.toUpperCase();
    const words = raw.split(/\s+/).filter((w) => !['of', 'and', '&', 'for', 'in', 'the'].includes(w.toLowerCase()));
    if (words.length > 0) {
      return words.map((w) => w[0]?.toUpperCase() || '').join('').slice(0, 6);
    }
    return raw;
  }

  if (college.college_code && college.college_code.trim()) {
    return college.college_code.toUpperCase().trim();
  }

  const idToMatch = college._id || college.id || (college as any).college_id;
  const nameToMatch = (college.college_name || '').toLowerCase().trim();

  const allKnown = getCachedColleges();
  const match = allKnown.find((c) => {
    if (idToMatch && (c._id === idToMatch || String(c._id) === String(idToMatch))) return true;
    if (nameToMatch && c.college_name.toLowerCase().trim() === nameToMatch) return true;
    if (nameToMatch && (c.college_name.toLowerCase().includes(nameToMatch) || nameToMatch.includes(c.college_name.toLowerCase()))) return true;
    return false;
  });

  if (match && match.college_code) {
    return match.college_code.toUpperCase();
  }

  if (college.college_name) {
    const words = college.college_name.split(/\s+/).filter((w) => !['of', 'and', '&', 'for', 'in', 'the'].includes(w.toLowerCase()));
    if (words.length > 0) {
      return words.map((w) => w[0]?.toUpperCase() || '').join('').slice(0, 6);
    }
  }

  return '';
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
    const user = readSessionUser();
    const queryParams = new URLSearchParams();
    const userId = user ? (user._id || (user as any).id) : null;
    if (userId) {
      queryParams.set('user_id', String(userId));
    }
    if (user?.official_email) {
      queryParams.set('email', user.official_email);
    }
    const qStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const res = await apiFetch(`/colleges/focus-matrix${qStr}`);
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
    const user = readSessionUser();
    const queryParams = new URLSearchParams();
    const userId = user ? (user._id || (user as any).id) : null;
    if (userId) {
      queryParams.set('user_id', String(userId));
    }
    if (user?.official_email) {
      queryParams.set('email', user.official_email);
    }
    const qStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const res = await apiFetch(`/colleges/focus-matrix${qStr}`);
    if (res.success && res.data) {
      const liveList: CollegeOccupancy[] = (res.data as any).colleges || [];
      const focusData = (res.data as any).current_user_focus || {};
      const weekKey = (res.data as any).week_key || getCurrentWeekMondayKey();
      const isLocked = Boolean(focusData.is_locked);
      let selectedIds = Array.isArray(focusData.selected_college_ids) ? focusData.selected_college_ids : [];

      // If no selection on backend yet, fallback to default official allocations for current user
      if (selectedIds.length === 0) {
        selectedIds = getDefaultOfficialCollegeIdsForUser(user);
      }

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
  const allKnown = getCachedColleges();
  const resolvedInputIds = ids.map((id) => {
    const match = allKnown.find(
      (c) =>
        c._id === id ||
        (c.college_code && c.college_code.toUpperCase() === id.toUpperCase()) ||
        (c.college_code && c.college_code.toUpperCase() === id.replace(/^col_/i, '').toUpperCase())
    );
    return match ? match._id : id;
  });

  const sanitized = Array.from(new Set(resolvedInputIds.filter(Boolean))).slice(0, 5);
  if (sanitized.length === 0 || sanitized.length > 5) {
    return { success: false, message: 'Please select between 1 and 5 partner colleges.' };
  }

  try {
    const user = readSessionUser();
    const userId = user ? (user._id || (user as any).id) : null;
    const bodyPayload: any = { college_ids: sanitized };
    if (userId) bodyPayload.user_id = userId;
    if (user?.official_email) bodyPayload.email = user.official_email;

    const res = await apiFetch('/colleges/lock-focus', {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
    });

    if (!res.success) {
      const errMsg = (res as any)?.error?.message || (res as any)?.message || 'Failed to lock college focus.';
      return { success: false, message: errMsg };
    }

    const returnedIds: string[] =
      Array.isArray((res.data as any)?.selected_college_ids) && (res.data as any).selected_college_ids.length > 0
        ? (res.data as any).selected_college_ids
        : sanitized;
    const weekKey = (res.data as any)?.week_key || getCurrentWeekMondayKey();
    const today = getTodayKey();

    if (typeof window !== 'undefined') {
      localStorage.setItem(COORDINATOR_SELECTED_COLLEGES_KEY, JSON.stringify(returnedIds));
      localStorage.setItem(COORDINATOR_FOCUS_DATE_KEY, today);
      localStorage.setItem(COORDINATOR_FOCUS_WEEK_KEY, weekKey);
      localStorage.setItem(COORDINATOR_FOCUS_LOCKED_KEY, 'true');

      // Update cached colleges is_selected_by_me flags to match exact locked selection
      const updatedCache = getCachedColleges().map((c) => {
        const isSelected = returnedIds.some(
          (sid) =>
            sid === String(c._id) ||
            (c.college_code && sid.toUpperCase() === c.college_code.toUpperCase()) ||
            (c.college_code && sid.toLowerCase() === `col_${c.college_code.toLowerCase()}`)
        );
        return {
          ...c,
          is_selected_by_me: isSelected,
          is_occupied: (c.other_handlers_count ?? 0) >= 2 && !isSelected,
        };
      });
      setCachedColleges(updatedCache);

      // Auto-set first selected college as active session if current active is not in focus
      const currentActive = getActiveCollege();
      const isCurrentInFocus = returnedIds.some(
        (id) =>
          id === currentActive.id ||
          (currentActive.obj && (id === currentActive.obj.college_code || id === currentActive.obj._id))
      );
      if (!isCurrentInFocus || !currentActive.id) {
        const firstCol = updatedCache.find((c) =>
          returnedIds.some(
            (sid) =>
              sid === String(c._id) ||
              (c.college_code && sid.toUpperCase() === c.college_code.toUpperCase())
          )
        );
        if (firstCol) {
          setActiveCollege(firstCol._id, firstCol.college_name, firstCol);
        }
      }

      window.dispatchEvent(
        new CustomEvent('ipoms_focus_updated', {
          detail: { selectedIds: returnedIds, isLocked: true, date: today, weekKey },
        })
      );
      window.dispatchEvent(
        new CustomEvent('ipoms_coordinator_colleges_changed', {
          detail: { selectedIds: returnedIds },
        })
      );
      window.dispatchEvent(
        new CustomEvent('ipoms_colleges_loaded', {
          detail: { colleges: updatedCache },
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
    const user = readSessionUser();
    const userId = user ? (user._id || (user as any).id) : null;
    const bodyPayload: any = {};
    if (userId) bodyPayload.user_id = userId;
    if (user?.official_email) bodyPayload.email = user.official_email;

    const res = await apiFetch('/colleges/unlock-focus', {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
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
      return selected.length >= 1 && selected.length <= 5;
    }

    // Check legacy single-day date: if it fell in the current week, upgrade it
    if (legacyDate) {
      const legacyMonday = getCurrentWeekMondayKey(new Date(legacyDate));
      if (legacyMonday === currentWeekMonday) {
        localStorage.setItem(COORDINATOR_FOCUS_WEEK_KEY, currentWeekMonday);
        const selected = getCoordinatorSelectedColleges();
        return selected.length >= 1 && selected.length <= 5;
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

/** Locks focus for 1 to 5 colleges for the entire week (Monday through Sunday) */
export function lockDailyFocus(ids: string[]): boolean {
  if (typeof window === 'undefined') return false;
  const sanitized = Array.from(new Set(ids.filter(Boolean))).slice(0, 5);
  if (sanitized.length === 0 || sanitized.length > 5) {
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

/** Purges all active college and focus selections from browser storage on logout or user switch */
export function clearAllCollegeSessionState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_COLLEGE_ID_KEY);
    localStorage.removeItem(ACTIVE_COLLEGE_NAME_KEY);
    localStorage.removeItem(ACTIVE_COLLEGE_OBJ_KEY);
    localStorage.removeItem(COORDINATOR_SELECTED_COLLEGES_KEY);
    localStorage.removeItem(COORDINATOR_FOCUS_DATE_KEY);
    localStorage.removeItem(COORDINATOR_FOCUS_WEEK_KEY);
    localStorage.removeItem(COORDINATOR_FOCUS_LOCKED_KEY);
    sessionStorage.removeItem(ACTIVE_COLLEGE_ID_KEY);
    sessionStorage.removeItem(ACTIVE_COLLEGE_NAME_KEY);
    sessionStorage.removeItem(ACTIVE_COLLEGE_OBJ_KEY);

    window.dispatchEvent(new CustomEvent('ipoms_college_change', { detail: { id: '', name: '', obj: null } }));
    window.dispatchEvent(new CustomEvent('ipoms_focus_updated', { detail: { selectedIds: [], isLocked: false } }));
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
  const sessionUser = readSessionUser();
  const officialDefaults = getDefaultOfficialCollegeIdsForUser(sessionUser);

  try {
    const raw = localStorage.getItem(COORDINATOR_SELECTED_COLLEGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If official defaults exist for this specific user, ensure at least one parsed college matches their official roster
        if (officialDefaults.length > 0) {
          const isValidForUser = parsed.some((id) =>
            officialDefaults.includes(String(id)) || officialDefaults.includes(String(id).toUpperCase())
          );
          if (isValidForUser) {
            return parsed.slice(0, 5);
          }
        } else {
          return parsed.slice(0, 5);
        }
      }
    }
  } catch {}

  // Fallback to official allocation for current user if not yet stored or invalid
  if (officialDefaults.length > 0) {
    try {
      localStorage.setItem(COORDINATOR_SELECTED_COLLEGES_KEY, JSON.stringify(officialDefaults));
    } catch {}
    return officialDefaults;
  }
  return [];
}

export function setCoordinatorSelectedColleges(ids: string[]): string[] {
  if (typeof window === 'undefined') return ids;
  const sanitized = Array.from(new Set(ids.filter(Boolean))).slice(0, 5);
  try {
    if (sanitized.length > 0) {
      localStorage.setItem(COORDINATOR_SELECTED_COLLEGES_KEY, JSON.stringify(sanitized));
    } else {
      localStorage.removeItem(COORDINATOR_SELECTED_COLLEGES_KEY);
    }

    // Update cached colleges is_selected_by_me flag to strictly match
    const updatedCache = getCachedColleges().map((c) => {
      const isSelected = sanitized.includes(String(c._id)) || sanitized.includes(String(c.college_code));
      return {
        ...c,
        is_selected_by_me: isSelected,
        is_occupied: (c.other_handlers_count ?? 0) >= 2 && !isSelected,
      };
    });
    setCachedColleges(updatedCache);

    window.dispatchEvent(
      new CustomEvent('ipoms_coordinator_colleges_changed', {
        detail: { selectedIds: sanitized },
      })
    );
    window.dispatchEvent(
      new CustomEvent('ipoms_focus_updated', {
        detail: { selectedIds: sanitized, isLocked: isFocusLockedToday() },
      })
    );
    window.dispatchEvent(
      new CustomEvent('ipoms_colleges_loaded', {
        detail: { colleges: updatedCache },
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

  const selectedSet = new Set(selectedIds.map((s) => String(s).toLowerCase().trim()));

  for (const col of allColleges) {
    // If selectedIds has items, STRICTLY match against selectedSet.
    // If selectedIds is empty (e.g. unconfigured), fallback to is_selected_by_me.
    const isExplicitlyPinned =
      selectedIds.length > 0
        ? selectedSet.has(String(col._id).toLowerCase().trim()) ||
          selectedSet.has(String(col.college_code).toLowerCase().trim())
        : Boolean((col as any).is_selected_by_me);

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
    if ((!obj || !obj.college_code) && (id || name)) {
      const all = getCachedColleges();
      const match = all.find(c =>
        (id && (c._id === id || String(c._id) === String(id) || c.college_code?.toUpperCase() === id.toUpperCase())) ||
        (name && (c.college_name.toLowerCase() === name.toLowerCase() || c.college_name.toLowerCase().includes(name.toLowerCase())))
      );
      if (match) {
        obj = match;
        try {
          localStorage.setItem(ACTIVE_COLLEGE_OBJ_KEY, JSON.stringify(match));
        } catch {}
      }
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
      let resolvedObj = obj;
      if (!resolvedObj || !resolvedObj.college_code) {
        const allKnown = getCachedColleges();
        resolvedObj = allKnown.find(c =>
          c._id === id ||
          String(c._id) === String(id) ||
          c.college_code?.toUpperCase() === id.toUpperCase() ||
          (name && c.college_name.toLowerCase() === name.toLowerCase())
        ) || resolvedObj || null;
      }
      if (resolvedObj) {
        localStorage.setItem(ACTIVE_COLLEGE_OBJ_KEY, JSON.stringify(resolvedObj));
      } else {
        localStorage.removeItem(ACTIVE_COLLEGE_OBJ_KEY);
      }
      window.dispatchEvent(new CustomEvent('ipoms_college_change', { detail: { id, name, obj: resolvedObj } }));
    }
  } catch {}
}

// Official focus college allocations mapping for coordinators and team leaders
export const DEFAULT_COORDINATOR_COLLEGE_ROSTER: Record<string, string[]> = {
  'sujitha_s@infoziant.com': ['NEHRU', 'MAREPHRAM', 'KPR', 'HITS', 'SONA'],
  'sujitha': ['NEHRU', 'MAREPHRAM', 'KPR', 'HITS', 'SONA'],
  'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
  'seshmitha': ['MCET', 'MEC'],
  'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
  'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
  'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
  'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
  'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ'],
};

export async function resolveDefaultCollege(): Promise<{ id: string; name: string; obj: College | null }> {
  const focusedIds = getCoordinatorSelectedColleges();
  const current = getActiveCollege();
  const all = getCachedColleges();
  const user = readSessionUser();

  const userEmail = (user?.official_email || '').toLowerCase().trim();
  const userName = (user?.username || '').toLowerCase().trim();
  const isSujitha = userEmail.includes('sujitha') || userName.includes('sujitha') || /sujitha/i.test(user?.full_name || '');
  const isTamil = userEmail.includes('tamil') || userName.includes('seshmitha') || /tamil/i.test(user?.full_name || '');

  // Safety check: Sujitha handles HITS, NEHRU, KPR, SONA, MAREPHRAM. She does NOT handle MCET (MCET is handled by Tamil Selvi).
  if (isSujitha && (current.obj?.college_code === 'MCET' || /mahalingam|mcet/i.test(current.name))) {
    localStorage.removeItem(ACTIVE_COLLEGE_ID_KEY);
    localStorage.removeItem(ACTIVE_COLLEGE_NAME_KEY);
    localStorage.removeItem(ACTIVE_COLLEGE_OBJ_KEY);
    current.id = '';
    current.name = '';
    current.obj = null;
  }

  // 1. If user has an active college set in session/localStorage, check if valid and preserve it
  if (current.id) {
    if (!(isSujitha && (current.obj?.college_code === 'MCET' || /mahalingam|mcet/i.test(current.name)))) {
      return current;
    }
  }

  // 2. If coordinator has active focus colleges, prioritize active focus
  if (focusedIds.length > 0) {
    const validFocusedIds = isSujitha ? focusedIds.filter(id => id.toUpperCase() !== 'MCET') : focusedIds;
    const currentCollegeCode = current.obj?.college_code || getCollegeAcronym(current.id || current.name || current.obj);
    const isCurrentInFocus = current.id && validFocusedIds.some(
      (fid) => {
        const fLower = String(fid).toLowerCase().trim();
        const fCode = fLower.replace(/^col_/i, '');
        const cIdLower = String(current.id).toLowerCase().trim();
        const cCodeLower = String(currentCollegeCode).toLowerCase().trim();
        const cObjIdLower = String(current.obj?._id || '').toLowerCase().trim();
        return (
          fLower === cIdLower ||
          fLower === cCodeLower ||
          fLower === cObjIdLower ||
          fCode === cCodeLower ||
          (fCode && cIdLower.includes(fCode))
        );
      }
    );
    if (isCurrentInFocus && current.id) {
      return current;
    }

    const firstFocused = all.find(
      (c) =>
        validFocusedIds.map((f) => f.toLowerCase()).includes(String(c._id).toLowerCase()) ||
        validFocusedIds.map((f) => f.toLowerCase()).includes(String(c.college_code).toLowerCase())
    );
    if (firstFocused) {
      setActiveCollege(firstFocused._id, firstFocused.college_name, firstFocused);
      return { id: firstFocused._id, name: firstFocused.college_name, obj: firstFocused };
    }
  }

  // 3. Check official roster by user email/username
  const officialCodes = DEFAULT_COORDINATOR_COLLEGE_ROSTER[userEmail] || DEFAULT_COORDINATOR_COLLEGE_ROSTER[userName];
  if (officialCodes && officialCodes.length > 0) {
    const matched = all.find((c) => officialCodes.some((code) => code.toUpperCase() === c.college_code?.toUpperCase()));
    if (matched) {
      setActiveCollege(matched._id, matched.college_name, matched);
      return { id: matched._id, name: matched.college_name, obj: matched };
    }
  }

  // 4. Check user session colleges / assigned_college_ids
  const userAssigned = (user as any)?.assigned_college_ids || (user as any)?.colleges;
  if (Array.isArray(userAssigned) && userAssigned.length > 0) {
    const firstCol = userAssigned[0];
    const id = typeof firstCol === 'string' ? firstCol : firstCol._id;
    const matched = all.find(c => String(c._id) === String(id) || c.college_code === id);
    if (matched) {
      setActiveCollege(matched._id, matched.college_name, matched);
      return { id: matched._id, name: matched.college_name, obj: matched };
    }
  }

  // 5. Fetch available colleges list from API
  try {
    const res = await apiFetch('/colleges');
    if (res.success && Array.isArray((res.data as any)?.colleges) && (res.data as any).colleges.length > 0) {
      const collegesList: College[] = (res.data as any).colleges;
      let target = collegesList[0];
      if (isSujitha) {
        target = collegesList.find(c => c.college_code === 'NEHRU' || c.college_code === 'HITS') || target;
      } else if (isTamil) {
        target = collegesList.find(c => c.college_code === 'MCET' || c.college_code === 'MEC') || target;
      }
      if (target) {
        setActiveCollege(target._id, target.college_name, target);
        return { id: target._id, name: target.college_name, obj: target };
      }
    }
  } catch {}

  return { id: '', name: '', obj: null };
}
