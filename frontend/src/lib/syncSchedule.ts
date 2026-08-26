import { readSessionUser, roleOf } from './session';

/**
 * Validates if the Sync Positives action is allowed based on time and user role.
 * Active Window: 7:00 AM (07:00) to 7:00 PM (19:00) daily.
 * Admin / Developer bypass: Always allowed 24/7.
 */
export function checkSyncPositivesSchedule(): {
  isAllowed: boolean;
  isDeveloper: boolean;
  message?: string;
  activeWindow: string;
} {
  const user = readSessionUser();
  const role = roleOf(user);
  const isDeveloper =
    role === 'admin' ||
    (user?.role_codes ?? []).some(
      (r) =>
        r.toUpperCase().includes('ADMIN') ||
        r.toUpperCase().includes('DEV') ||
        r.toUpperCase().includes('DEVELOPER')
    );

  // Developers & Admins have 24/7 bypass
  if (isDeveloper) {
    return {
      isAllowed: true,
      isDeveloper: true,
      activeWindow: '7:00 AM – 7:00 PM (Developer Access: 24/7 Active)',
    };
  }

  const now = new Date();
  const currentHour = now.getHours(); // 0 - 23

  // Active from 7:00 AM (07:00) up to 7:00 PM (19:00)
  const isWithinWorkingHours = currentHour >= 7 && currentHour < 19;

  if (!isWithinWorkingHours) {
    return {
      isAllowed: false,
      isDeveloper: false,
      message: 'Sync Positives is active daily between 7:00 AM and 7:00 PM. It is currently disabled.',
      activeWindow: '7:00 AM – 7:00 PM daily',
    };
  }

  return {
    isAllowed: true,
    isDeveloper: false,
    activeWindow: '7:00 AM – 7:00 PM daily',
  };
}
