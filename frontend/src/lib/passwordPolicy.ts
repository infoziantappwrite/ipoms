/**
 * iPOMS password policy.
 *
 * Mirror of backend/src/lib/passwordPolicy.ts, kept identical so the form can
 * give live feedback without a round trip. The BACKEND copy is authoritative:
 * this one is a convenience for the user, never the enforcement point. If the
 * two ever drift, the server wins and the form is the bug.
 *
 * Rules (per the operations brief):
 *   - at least 9 characters
 *   - at least one lowercase letter
 *   - at least one uppercase letter
 *   - at least one digit
 *   - at least one of @ or .
 *   - NO other special characters (a deliberate allowlist, not a blocklist:
 *     these passwords are read aloud and retyped across sites, so the charset
 *     is kept narrow on purpose)
 */

export const PASSWORD_MIN_LENGTH = 9;

/** The only punctuation permitted, per the brief. */
const ALLOWED_SPECIALS = '@.';

/** Anything outside letters, digits, and the two allowed specials. */
const DISALLOWED = /[^A-Za-z0-9@.]/;

export interface PasswordCheck {
  id: string;
  label: string;
  passed: boolean;
}

/** Per-rule results, for rendering a live checklist under the field. */
export function checkPassword(password: string): PasswordCheck[] {
  const pw = password ?? '';
  return [
    { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, passed: pw.length >= PASSWORD_MIN_LENGTH },
    { id: 'lower', label: 'One lowercase letter (a–z)', passed: /[a-z]/.test(pw) },
    { id: 'upper', label: 'One uppercase letter (A–Z)', passed: /[A-Z]/.test(pw) },
    { id: 'digit', label: 'One number (0–9)', passed: /[0-9]/.test(pw) },
    { id: 'special', label: 'One special character (@ or .)', passed: /[@.]/.test(pw) },
    { id: 'charset', label: 'Only letters, numbers, @ and .', passed: pw.length > 0 && !DISALLOWED.test(pw) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return checkPassword(password).every((r) => r.passed);
}

/** First unmet rule, phrased for a user. Null when the password is valid. */
export function firstPasswordError(password: string): string | null {
  const failed = checkPassword(password).find((r) => !r.passed);
  if (!failed) return null;
  if (failed.id === 'charset') {
    return `Password may only contain letters, numbers, and the characters ${ALLOWED_SPECIALS.split('').join(' or ')}.`;
  }
  // Not lowercased: it would turn the "(A–Z)" hint into "(a–z)".
  return `Password must contain: ${failed.label}.`;
}
