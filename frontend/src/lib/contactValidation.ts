/**
 * Contact Validation & Normalization for Indian Mobile Numbers & Professional Emails
 * Strictly enforces official IANA Top-Level Domains (TLDs) and Indian Telecom (TRAI) numbering standards.
 */

export interface ValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
  suggestion?: string;
}

/**
 * Validates and normalizes Indian Mobile Numbers.
 * Rules:
 * 1. Accepts with or without +91, 91, 0, spaces, dashes, parentheses.
 * 2. Must resolve to exactly 10 digits.
 * 3. Indian mobile numbers must start with 6, 7, 8, or 9 (TRAI standard).
 */
export function validateAndNormalizeIndianMobile(raw: string): ValidationResult {
  if (!raw || !raw.trim()) {
    return { valid: false, normalized: '', error: 'Mobile number cannot be empty' };
  }

  // Remove common formatters (spaces, dashes, parentheses, dots)
  let cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, '');

  // Strip international / trunk prefixes
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0091')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Check if purely numeric
  if (!/^\d+$/.test(cleaned)) {
    return {
      valid: false,
      normalized: raw,
      error: `"${raw}" contains invalid characters. Numbers only.`,
    };
  }

  // Check length
  if (cleaned.length !== 10) {
    return {
      valid: false,
      normalized: cleaned,
      error: `Mobile number must be 10 digits (currently ${cleaned.length} digits: "${cleaned}").`,
    };
  }

  // Check Indian starting digit (6, 7, 8, 9)
  if (!/^[6-9]/.test(cleaned)) {
    return {
      valid: false,
      normalized: cleaned,
      error: `Indian mobile numbers must start with 6, 7, 8, or 9 (starts with "${cleaned[0]}").`,
    };
  }

  return {
    valid: true,
    normalized: cleaned,
  };
}

// ── Official & Recognized Top-Level Domains (TLDs) & Multi-part Extensions ────

/**
 * All ISO 3166-1 alpha-2 Country Code TLDs (ccTLDs)
 */
const CC_TLDS = new Set([
  'ac', 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az',
  'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bm', 'bn', 'bo', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz',
  'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
  'de', 'dj', 'dk', 'dm', 'do', 'dz',
  'ec', 'ee', 'eg', 'er', 'es', 'et', 'eu',
  'fi', 'fj', 'fk', 'fm', 'fo', 'fr',
  'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy',
  'hk', 'hm', 'hn', 'hr', 'ht', 'hu',
  'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it',
  'je', 'jm', 'jo', 'jp',
  'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz',
  'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly',
  'ma', 'mc', 'md', 'me', 'mf', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz',
  'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz',
  'om',
  'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py',
  'qa',
  're', 'ro', 'rs', 'ru', 'rw',
  'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'sv', 'sx', 'sy', 'sz',
  'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz',
  'ua', 'ug', 'uk', 'us', 'uy', 'uz',
  'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu',
  'wf', 'ws',
  'ye', 'yt',
  'za', 'zm', 'zw',
]);

/**
 * Standard generic Top-Level Domains (gTLDs) & Business Extensions
 */
const GENERIC_TLDS = new Set([
  // Original Core
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro',
  // Sponsored & Community
  'aero', 'asia', 'cat', 'coop', 'jobs', 'mobi', 'museum', 'post', 'tel', 'travel', 'xxx',
  // Modern Tech & Business
  'ai', 'io', 'app', 'dev', 'tech', 'cloud', 'global', 'online', 'site', 'store', 'shop', 'agency',
  'group', 'digital', 'world', 'live', 'space', 'solutions', 'services', 'consulting', 'careers',
  'work', 'team', 'network', 'systems', 'software', 'ltd', 'inc', 'corp', 'media', 'studio',
  'press', 'news', 'academy', 'institute', 'college', 'university', 'school', 'center', 'management',
  'international', 'direct', 'expert', 'zone', 'today', 'life', 'care', 'tips', 'xyz', 'top',
  'club', 'vip', 'design', 'art', 'link', 'click', 'one', 'run', 'page', 'social', 'pub', 'buzz',
  'icu', 'win', 'bid', 'trade', 'web', 'host', 'website', 'guru', 'ninja', 'capital', 'finance',
  'ventures', 'holdings', 'enterprises', 'industries', 'foundation', 'hospital', 'health', 'clinic',
  'pharmacy', 'law', 'legal', 'attorney', 'security', 'engineer', 'engineering', 'construction',
  'builders', 'estate', 'properties', 'realty', 'community', 'city', 'town', 'country', 'associates',
  'partners', 'llc', 'gmbh', 'hub', 'fyi', 'help', 'how', 'wiki', 'bio', 'eco', 'green', 'earth',
  'energy', 'solar', 'data', 'analytics', 'company', 'firm', 'works', 'events', 'show', 'house',
  'security', 'security', 'consulting', 'consulting', 'financial', 'insurance', 'marketing',
  'ventures', 'holdings', 'capital', 'fund', 'exchange', 'money', 'credit', 'bank', 'investments',
  'center', 'works', 'tech', 'media', 'news', 'press', 'network', 'space', 'zone',
]);

/**
 * Common typo mappings for instant user correction suggestions
 */
const TLD_TYPO_MAP: Record<string, string> = {
  'cpm': 'com',
  'con': 'com',
  'comm': 'com',
  'coom': 'com',
  'cmo': 'com',
  'xom': 'com',
  'vom': 'com',
  'fom': 'com',
  'cim': 'com',
  'ogr': 'org',
  'orgg': 'org',
  'nte': 'net',
  'nett': 'net',
  'eddu': 'edu',
  'ed': 'edu',
  'i': 'in',
  'inn': 'in',
  'iin': 'in',
};

const DOMAIN_TYPO_MAP: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmai.co.in': 'gmail.com',
  'gamil.co.in': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.co.in': 'yahoo.co.in',
  'outlok.com': 'outlook.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'redifmail.com': 'rediffmail.com',
};

/**
 * Validates and normalizes Email addresses according to official IANA domain registries.
 * Rules:
 * 1. Must contain an "@" symbol with username and domain.
 * 2. Allowed special characters in username: . _ % + -
 * 3. Cannot start/end with dot or have consecutive dots in local part.
 * 4. Domain must have valid dot-separated labels (e.g. gmail.com, tcs.co.in, iitb.ac.in).
 * 5. Domain TLD (e.g. .com, .in, .co.in, .edu, .org) MUST be a genuine valid IANA domain extension.
 *    Typos like ".cpm", ".con", ".comm" are rejected.
 */
export function validateAndNormalizeEmail(raw: string): ValidationResult {
  if (!raw || !raw.trim()) {
    return { valid: false, normalized: '', error: 'Email ID cannot be empty' };
  }

  const cleaned = raw.trim().toLowerCase();

  if (!cleaned.includes('@')) {
    return {
      valid: false,
      normalized: cleaned,
      error: `"${raw}" is missing the "@" symbol. (e.g. hr@company.com)`,
    };
  }

  const parts = cleaned.split('@');
  if (parts.length !== 2) {
    return {
      valid: false,
      normalized: cleaned,
      error: `"${raw}" contains multiple "@" symbols. Only one "@" allowed.`,
    };
  }

  const [local, domain] = parts;
  if (!local) {
    return {
      valid: false,
      normalized: cleaned,
      error: 'Email ID is missing username before "@".',
    };
  }

  if (!domain) {
    return {
      valid: false,
      normalized: cleaned,
      error: 'Email ID is missing domain name after "@".',
    };
  }

  // ── Local part (username) validation ──
  if (local.startsWith('.') || local.endsWith('.')) {
    return {
      valid: false,
      normalized: cleaned,
      error: 'Email username cannot start or end with a dot.',
    };
  }

  if (local.includes('..')) {
    return {
      valid: false,
      normalized: cleaned,
      error: 'Email username cannot contain consecutive dots (..).',
    };
  }

  const localRegex = /^[a-zA-Z0-9._%+-]+$/;
  if (!localRegex.test(local)) {
    return {
      valid: false,
      normalized: cleaned,
      error: `Username "${local}" contains invalid characters. Only letters, numbers, and . _ % + - allowed.`,
    };
  }

  // ── Domain part validation ──
  // Check for common domain typos (e.g. @gmai.cpm -> @gmail.com)
  if (DOMAIN_TYPO_MAP[domain]) {
    const suggested = DOMAIN_TYPO_MAP[domain];
    return {
      valid: false,
      normalized: `${local}@${suggested}`,
      error: `Did you mean "${local}@${suggested}" instead of "@${domain}"?`,
      suggestion: `${local}@${suggested}`,
    };
  }

  // Domain must contain at least one dot (e.g. domain.com or sub.domain.co.in)
  if (!domain.includes('.')) {
    return {
      valid: false,
      normalized: cleaned,
      error: `Domain "@${domain}" is missing extension (e.g. @${domain}.com or @${domain}.in).`,
    };
  }

  const domainLabels = domain.split('.');
  // Check for empty labels (e.g. domain..com or domain.)
  if (domainLabels.some((label) => !label || label.trim().length === 0)) {
    return {
      valid: false,
      normalized: cleaned,
      error: `Domain "${domain}" has empty dot references (e.g. double dots "..").`,
    };
  }

  // Validate each domain label format (letters, digits, hyphens, no start/end hyphen)
  for (const label of domainLabels) {
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) {
      return {
        valid: false,
        normalized: cleaned,
        error: `Domain part "${label}" contains invalid characters. Letters, numbers, and hyphens only.`,
      };
    }
  }

  // ── Top-Level Domain (TLD) Verification ──
  const tld = domainLabels[domainLabels.length - 1];

  // Check known typo list first
  if (TLD_TYPO_MAP[tld]) {
    const suggestedTld = TLD_TYPO_MAP[tld];
    const fixedDomain = [...domainLabels.slice(0, -1), suggestedTld].join('.');
    return {
      valid: false,
      normalized: `${local}@${fixedDomain}`,
      error: `Invalid domain extension ".${tld}". Did you mean ".${suggestedTld}" (${local}@${fixedDomain})?`,
      suggestion: `${local}@${fixedDomain}`,
    };
  }

  // Check if TLD is in valid ccTLD (e.g. .in, .uk, .us) or gTLD (e.g. .com, .org, .edu, .ai, .io)
  const isValidTld = CC_TLDS.has(tld) || GENERIC_TLDS.has(tld);

  if (!isValidTld) {
    return {
      valid: false,
      normalized: cleaned,
      error: `".${tld}" is not a recognized Top-Level Domain. Allowed extensions: .com, .in, .co.in, .org, .net, .edu, .ac.in, .ai, .io, etc.`,
    };
  }

  // Check multi-part second-level domain validity (e.g. .co.in, .ac.in, .gov.in, .edu.in, .org.uk)
  if (domainLabels.length >= 3) {
    const sld = domainLabels[domainLabels.length - 2];
    // If last part is a 2-letter country code (e.g. .in, .uk), verify sld isn't a typo
    if (CC_TLDS.has(tld) && sld.length > 4 && !GENERIC_TLDS.has(sld)) {
      // e.g. company.comm.in -> warning
      if (TLD_TYPO_MAP[sld]) {
        const fixedSld = TLD_TYPO_MAP[sld];
        const fixedDomain = [...domainLabels.slice(0, -2), fixedSld, tld].join('.');
        return {
          valid: false,
          normalized: `${local}@${fixedDomain}`,
          error: `Invalid extension ".${sld}.${tld}". Did you mean ".${fixedSld}.${tld}"?`,
          suggestion: `${local}@${fixedDomain}`,
        };
      }
    }
  }

  return {
    valid: true,
    normalized: cleaned,
  };
}
