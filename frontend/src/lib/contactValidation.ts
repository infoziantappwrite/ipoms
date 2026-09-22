/**
 * Contact Validation & Normalization for Indian Mobile Numbers & Professional Emails
 * Strictly enforces official IANA Top-Level Domains (TLDs) and Indian Telecom (TRAI) numbering standards.
 */

export interface ValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
  suggestion?: string;
  type?: 'mobile' | 'landline';
  country?: string;
  startingDigit?: string;
  stdCode?: string;
  city?: string;
  formatted?: string;
}

/**
 * Recognized Indian Landline STD Area Codes & Metro Directories
 */
export const INDIAN_STD_CODES: Record<string, string> = {
  // 2-digit STD codes (Tier 1 Metros)
  '11': 'Delhi / NCR',
  '22': 'Mumbai',
  '33': 'Kolkata',
  '44': 'Chennai',
  '80': 'Bengaluru',
  '20': 'Pune',
  '40': 'Hyderabad',
  '79': 'Ahmedabad',
  // 3-digit STD codes (Tier 2 Cities)
  '120': 'Noida / Ghaziabad',
  '124': 'Gurugram',
  '129': 'Faridabad',
  '141': 'Jaipur',
  '172': 'Chandigarh',
  '175': 'Patiala',
  '181': 'Jalandhar',
  '183': 'Amritsar',
  '240': 'Aurangabad',
  '241': 'Ahmednagar',
  '250': 'Vasai',
  '251': 'Kalyan',
  '253': 'Nashik',
  '257': 'Jalgaon',
  '260': 'Vapi',
  '261': 'Surat',
  '265': 'Vadodara',
  '268': 'Nadiad',
  '2692': 'Anand',
  '278': 'Bhavnagar',
  '281': 'Rajkot',
  '288': 'Jamnagar',
  '361': 'Guwahati',
  '413': 'Puducherry',
  '416': 'Vellore',
  '421': 'Tiruppur',
  '422': 'Coimbatore',
  '424': 'Erode',
  '427': 'Salem',
  '4286': 'Namakkal',
  '431': 'Tiruchirappalli',
  '4324': 'Karur',
  '4344': 'Hosur',
  '435': 'Kumbakonam',
  '4362': 'Thanjavur',
  '451': 'Dindigul',
  '452': 'Madurai',
  '4546': 'Theni',
  '4562': 'Virudhunagar / Sivakasi',
  '4563': 'Rajapalayam',
  '4565': 'Karaikudi',
  '461': 'Thoothukudi',
  '462': 'Tirunelveli',
  '4652': 'Nagercoil',
  '471': 'Thiruvananthapuram',
  '474': 'Kollam',
  '477': 'Alappuzha',
  '481': 'Kottayam',
  '484': 'Kochi / Ernakulam',
  '487': 'Thrissur',
  '491': 'Palakkad',
  '495': 'Kozhikode',
  '497': 'Kannur',
  '512': 'Kanpur',
  '522': 'Lucknow',
  '532': 'Prayagraj',
  '542': 'Varanasi',
  '562': 'Agra',
  '571': 'Aligarh',
  '581': 'Bareilly',
  '591': 'Moradabad',
  '612': 'Patna',
  '621': 'Muzaffarpur',
  '6272': 'Darbhanga',
  '641': 'Bhagalpur',
  '651': 'Ranchi',
  '657': 'Jamshedpur',
  '661': 'Rourkela',
  '671': 'Cuttack',
  '674': 'Bhubaneswar',
  '680': 'Berhampur',
  '712': 'Nagpur',
  '721': 'Amravati',
  '731': 'Indore',
  '734': 'Ujjain',
  '744': 'Kota',
  '751': 'Gwalior',
  '755': 'Bhopal',
  '761': 'Jabalpur',
  '771': 'Raipur',
  '7752': 'Bilaspur',
  '788': 'Bhilai / Durg',
  '816': 'Tumakuru',
  '820': 'Udupi',
  '821': 'Mysuru',
  '824': 'Mangaluru',
  '831': 'Belagavi',
  '836': 'Hubballi / Dharwad',
  '8392': 'Ballari',
  '8472': 'Kalaburagi',
  '861': 'Nellore',
  '863': 'Guntur',
  '866': 'Vijayawada',
  '870': 'Warangal',
  '877': 'Tirupati',
  '883': 'Rajahmundry',
  '884': 'Kakinada',
  '891': 'Visakhapatnam',
};

/**
 * Validates and normalizes Indian Contact Numbers (both Mobile and Landline).
 * Rules:
 * 1. Accepts with or without +91, 0091, 0 trunk prefix, spaces, dashes, dots.
 * 2. Recognizes country as India (+91).
 * 3. Distinguishes Indian Mobile (10 digits starting with 6, 7, 8, 9)
 *    and Indian Landline (10 digits starting with recognized Indian STD code).
 * 4. Strictly rejects invalid length (must resolve to exactly 10 digits).
 */
export function validateAndNormalizeIndianContact(raw: string): ValidationResult {
  if (!raw || !raw.trim()) {
    return { valid: false, normalized: '', error: 'Contact number cannot be empty' };
  }

  // Remove common formatters (spaces, dashes, parentheses, dots, slashes)
  let cleaned = raw.trim().replace(/[\s\-\(\)\.\/]/g, '');

  let hasIndiaPrefix = false;

  // Strip international / trunk prefixes
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
    hasIndiaPrefix = true;
  } else if (cleaned.startsWith('0091')) {
    cleaned = cleaned.slice(4);
    hasIndiaPrefix = true;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
    hasIndiaPrefix = true;
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
    hasIndiaPrefix = true;
  }

  // Check if purely numeric
  if (!/^\d+$/.test(cleaned)) {
    return {
      valid: false,
      normalized: raw,
      error: `"${raw}" contains invalid characters. Numbers only.`,
    };
  }

  // Check exact 10-digit length rule
  if (cleaned.length !== 10) {
    return {
      valid: false,
      normalized: cleaned,
      error: `Indian phone numbers must be exactly 10 digits (currently ${cleaned.length} digits: "${cleaned}").`,
    };
  }

  // 1. Check Indian Mobile (Starts with 6, 7, 8, 9)
  if (/^[6-9]/.test(cleaned)) {
    return {
      valid: true,
      type: 'mobile',
      country: 'India (+91)',
      startingDigit: cleaned[0],
      normalized: cleaned,
      formatted: `+91 ${cleaned}`,
    };
  }

  // 2. Check Indian Landline (Starts with 1, 2, 3, 4, 5, 7, 8)
  // Check 4-digit, 3-digit, and 2-digit STD codes
  let matchedStd: string | null = null;
  let matchedCity: string | null = null;

  for (const len of [4, 3, 2]) {
    const candidateStd = cleaned.slice(0, len);
    if (INDIAN_STD_CODES[candidateStd]) {
      matchedStd = candidateStd;
      matchedCity = INDIAN_STD_CODES[candidateStd];
      break;
    }
  }

  // If starts with 1-5 or matches STD directory
  if (/^[1-5]/.test(cleaned) || matchedStd) {
    const std = matchedStd || cleaned.slice(0, 3);
    const sub = cleaned.slice(std.length);
    return {
      valid: true,
      type: 'landline',
      country: 'India (+91)',
      stdCode: `0${std}`,
      city: matchedCity || 'Indian Landline',
      normalized: cleaned,
      formatted: `0${std}-${sub}`,
    };
  }

  return {
    valid: false,
    normalized: cleaned,
    error: `"${cleaned}" does not match Indian mobile (starts with 6-9) or valid Indian landline STD code.`,
  };
}

/**
 * Validates and normalizes Indian Mobile Numbers (TRAI standard 10 digits starting with 6-9).
 */
export function validateAndNormalizeIndianMobile(raw: string): ValidationResult {
  const res = validateAndNormalizeIndianContact(raw);
  if (!res.valid) return res;

  if (res.type === 'landline') {
    // If user passed a valid landline, allow it or mark type
    return {
      ...res,
      valid: true,
    };
  }

  return res;
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

/**
 * Validates and normalizes multiple Email addresses separated by commas, semicolons, or slashes.
 * Returns comma-separated normalized emails if all are valid.
 */
export function validateAndNormalizeMultiEmail(raw: string): ValidationResult {
  if (!raw || !raw.trim()) {
    return { valid: true, normalized: '' };
  }

  const parts = raw
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { valid: true, normalized: '' };
  }

  const normalizedList: string[] = [];
  for (const part of parts) {
    const res = validateAndNormalizeEmail(part);
    if (!res.valid) {
      return res; // Return error from first invalid email
    }
    if (!normalizedList.includes(res.normalized)) {
      normalizedList.push(res.normalized);
    }
  }

  return {
    valid: true,
    normalized: normalizedList.join(', '),
  };
}

/**
 * Validates and normalizes multiple Indian Mobile Numbers separated by commas, semicolons, or slashes.
 * Returns comma-separated normalized mobile numbers if all are valid.
 */
export function validateAndNormalizeMultiMobile(raw: string): ValidationResult {
  if (!raw || !raw.trim()) {
    return { valid: true, normalized: '' };
  }

  const parts = raw
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { valid: true, normalized: '' };
  }

  const normalizedList: string[] = [];
  for (const part of parts) {
    const res = validateAndNormalizeIndianMobile(part);
    if (!res.valid) {
      return res; // Return error from first invalid mobile
    }
    if (!normalizedList.includes(res.normalized)) {
      normalizedList.push(res.normalized);
    }
  }

  return {
    valid: true,
    normalized: normalizedList.join(', '),
  };
}

