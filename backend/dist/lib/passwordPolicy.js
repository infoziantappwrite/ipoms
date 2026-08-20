"use strict";
/**
 * iPOMS password policy.
 *
 * Mirrored verbatim in frontend/src/lib/passwordPolicy.ts so the form can give
 * live feedback without a round trip. The backend copy is authoritative — the
 * frontend one is a convenience, never a substitute, since a client can post
 * straight to the API.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_MIN_LENGTH = void 0;
exports.checkPassword = checkPassword;
exports.isPasswordValid = isPasswordValid;
exports.firstPasswordError = firstPasswordError;
exports.PASSWORD_MIN_LENGTH = 9;
/** The only punctuation permitted, per the brief. */
const ALLOWED_SPECIALS = '@.';
/** Anything outside letters, digits, and the two allowed specials. */
const DISALLOWED = /[^A-Za-z0-9@.]/;
/** Per-rule results, for rendering a live checklist under the field. */
function checkPassword(password) {
    const pw = password ?? '';
    return [
        { id: 'length', label: `At least ${exports.PASSWORD_MIN_LENGTH} characters`, passed: pw.length >= exports.PASSWORD_MIN_LENGTH },
        { id: 'lower', label: 'One lowercase letter (a–z)', passed: /[a-z]/.test(pw) },
        { id: 'upper', label: 'One uppercase letter (A–Z)', passed: /[A-Z]/.test(pw) },
        { id: 'digit', label: 'One number (0–9)', passed: /[0-9]/.test(pw) },
        { id: 'special', label: 'One special character (@ or .)', passed: /[@.]/.test(pw) },
        { id: 'charset', label: 'Only letters, numbers, @ and .', passed: pw.length > 0 && !DISALLOWED.test(pw) },
    ];
}
function isPasswordValid(password) {
    return checkPassword(password).every((r) => r.passed);
}
/** First unmet rule, phrased for a user. Null when the password is valid. */
function firstPasswordError(password) {
    const failed = checkPassword(password).find((r) => !r.passed);
    if (!failed)
        return null;
    if (failed.id === 'charset') {
        return `Password may only contain letters, numbers, and the characters ${ALLOWED_SPECIALS.split('').join(' or ')}.`;
    }
    // Not lowercased: it would turn the "(A–Z)" hint into "(a–z)".
    return `Password must contain: ${failed.label}.`;
}
