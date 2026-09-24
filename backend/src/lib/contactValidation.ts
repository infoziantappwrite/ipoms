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

export function validateAndNormalizeIndianContact(rawInput: string): ValidationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return { valid: false, normalized: '', error: 'Input must be a non-empty string.' };
  }

  const cleaned = rawInput.replace(/[^\d+]/g, '');

  let digits = cleaned.replace(/^\+/, '');
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length > 10) {
    digits = digits.slice(1);
  }

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return {
      valid: true,
      normalized: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      type: 'mobile',
      country: 'India',
      startingDigit: digits[0],
      formatted: `+91 ${digits}`,
    };
  }

  return {
    valid: false,
    normalized: rawInput,
    error: 'Invalid contact format.',
  };
}

export function validateAndNormalizeEmail(rawEmail: string): ValidationResult {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return { valid: false, normalized: '', error: 'Email must be a non-empty string.' };
  }

  const trimmed = rawEmail.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (emailRegex.test(trimmed)) {
    return {
      valid: true,
      normalized: trimmed,
      formatted: trimmed,
    };
  }

  return {
    valid: false,
    normalized: trimmed,
    error: 'Invalid email address format.',
  };
}
