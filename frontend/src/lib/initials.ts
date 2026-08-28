/**
 * Avatar initials that stay clean, standard, and distinguishable across the app.
 * E.g.:
 * - "Megala Devi" / "megaladevi" -> "MD"
 * - "Mohana Radha" / "mohanaradha" / "A. Mohanaradha" -> "MR" / "AM"
 * - "Thirisha R" -> "TR"
 * - "Kavya S" -> "KS"
 */

export function initialsFor(fullName: string, roster: string[] = []): string {
  if (!fullName || typeof fullName !== 'string') return '??';
  
  const raw = fullName.trim();
  if (!raw) return '??';

  // 1. Check known compound names or specific aliases
  const lower = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (lower.startsWith('megaladevi') || lower.startsWith('megala')) {
    return 'MD';
  }
  if (lower === 'mohanaradha' || lower.startsWith('mohana')) {
    return 'MR';
  }

  // 2. Multi-word split (handles spaces, dots, dashes, underscores)
  const words = raw
    .replace(/[._\-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    // If first word is a single initial letter (e.g. "A." in "A. Mohanaradha")
    // and there are 2 words, "AM" or if 3 words "A. Mohana Radha" -> "MR"
    if (words.length === 2) {
      const first = words[0].charAt(0).toUpperCase();
      const second = words[1].charAt(0).toUpperCase();
      return `${first}${second}`;
    }
    // 3+ words: take first meaningful word & second word
    const first = words[0].length > 1 ? words[0].charAt(0) : words[1].charAt(0);
    const second = words[0].length > 1 ? words[1].charAt(0) : (words[2]?.charAt(0) || words[1].charAt(0));
    return `${first}${second}`.toUpperCase();
  }

  // 3. Single word with camelCase (e.g. "megalaDevi")
  const camelMatch = raw.match(/^[a-z]+([A-Z])/);
  if (camelMatch && camelMatch[1]) {
    return `${raw.charAt(0).toUpperCase()}${camelMatch[1].toUpperCase()}`;
  }

  // 4. Single word: take first 2 letters
  const cleanSingle = raw.replace(/[^a-zA-Z]/g, '');
  if (cleanSingle.length >= 2) {
    return cleanSingle.substring(0, 2).toUpperCase();
  }

  return cleanSingle.substring(0, 1).toUpperCase() || '??';
}

