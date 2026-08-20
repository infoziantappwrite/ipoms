/**
 * Avatar initials that stay distinguishable across a real roster.
 *
 * A single letter collapses Monisha and Muthuvel onto the same "M", so the
 * default is two letters drawn from the first name — MO / MU. When a roster is
 * supplied and two people still collide at two letters, the prefix extends
 * until they separate (capped at 3, past which the avatar stops being an
 * avatar).
 */

const MAX = 3;

/** First name, letters only. "Muddu Muthuvel" -> "muddu". */
function firstName(fullName: string): string {
  const token = fullName.trim().split(/\s+/)[0] ?? '';
  return token.replace(/[^\p{L}]/gu, '').toLowerCase();
}

export function initialsFor(fullName: string, roster: string[] = []): string {
  const self = firstName(fullName);
  if (!self) return '?';

  const others = roster
    .map(firstName)
    .filter((n) => n && n !== self);

  for (let len = 2; len <= MAX; len++) {
    const mine = self.slice(0, len);
    if (!others.some((o) => o.slice(0, len) === mine)) return mine.toUpperCase();
  }

  return self.slice(0, MAX).toUpperCase();
}
