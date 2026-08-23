'use client';

export type RoleKey = 'admin' | 'team_leader' | 'coordinator';

export interface SessionUser {
  _id: string;
  full_name: string;
  official_email: string;
  role_codes: string[];
  profile_photo_url?: string;
  designation?: string;
  employee_id?: string;
}

const USER_KEY = 'ipoms_user';

/** Session-scoped flag: the drawer plays its open-then-settle intro once per sign-in. */
export const NAV_INTRO_KEY = 'ipoms_nav_intro';

/** Persisted across sessions: whatever the user last chose for themselves. */
export const NAV_COLLAPSED_KEY = 'ipoms_nav_collapsed';

export function readSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function roleOf(user: SessionUser | null): RoleKey {
  const codes = user?.role_codes ?? [];
  if (codes.includes('ADMINISTRATOR') || codes.includes('ADMIN')) return 'admin';
  if (codes.includes('TEAM_LEADER')) return 'team_leader';
  return 'coordinator';
}

export const ROLE_LABEL: Record<RoleKey, string> = {
  admin: 'Administrator',
  team_leader: 'Team Leader',
  coordinator: 'Placement Coordinator',
};

/** Marks the drawer intro as due — called once, on successful sign-in. */
export function armNavIntro() {
  try {
    window.sessionStorage.setItem(NAV_INTRO_KEY, 'pending');
  } catch { /* storage disabled */ }
}
