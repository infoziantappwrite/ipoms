"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthRoutes = registerAuthRoutes;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const audit_1 = require("./audit");
const mailer_1 = require("./mailer");
const passwordPolicy_1 = require("./passwordPolicy");
const authMiddleware_1 = require("./authMiddleware");
/**
 * Authentication routes: sign-in, lockout, OTP reset.
 *
 * Design decisions worth stating, because they are security-relevant and not
 * obvious from the code alone:
 *
 * 1. Error specificity. This is an internal staff tool on a single known
 *    domain, so "no account found" is returned rather than a generic failure.
 *    User enumeration is an accepted trade here — the roster is not secret to
 *    anyone who already works at Infoziant, and the support cost of a vague
 *    error is real. This would be the wrong call on a public product.
 *
 * 2. Lockout applies to everyone, administrators included. An exempt admin is
 *    an account with unlimited password guesses, which is the opposite of what
 *    exempting it is meant to achieve. Administrators recover through
 *    `npm run unlock -- <email>` on the server instead of email OTP, so a lost
 *    mailbox can never lock the organisation out of its own system.
 *
 * 3. The OTP is stored as a bcrypt hash with a short expiry and its own
 *    attempt cap, so neither a database read nor repeated guessing yields a
 *    usable code.
 */
// No fallback secret — see authMiddleware.ts for why. JWT_ACCESS_SECRET is
// imported from there so both files share one source of truth and one
// fail-fast check instead of two independently-drifting copies.
if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required — set it in backend/.env');
}
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
/** Consecutive failures allowed. The next failure locks the account. */
const MAX_FAILED_ATTEMPTS = 3;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const STAFF_DOMAIN = 'infoziant.com';
/**
 * "Remember this device" support. The access token stays a short-lived
 * (8h) bearer token used on every request; a long-lived refresh token
 * rides in an httpOnly cookie instead, so it's invisible to JS/XSS and
 * only ever sent to the one endpoint that needs it. Scoped to
 * `/api/v1/auth` via cookie Path so it isn't attached to every ordinary
 * API call, only to /auth/refresh and /auth/logout.
 *
 * This is stateless (no DB-backed session/revocation list) — matches the
 * rest of the project's auth (the 8h access token isn't blacklistable
 * either). Practical effect: "sign out" clears the cookie so this
 * browser stops being able to silently refresh, but a copy of the raw
 * refresh token taken before sign-out would still work until it expires.
 * Acceptable for an internal staff tool; revisit if that ever changes.
 */
const REFRESH_TOKEN_COOKIE = 'ipoms_refresh';
const REFRESH_TOKEN_TTL_DAYS = 30;
const REFRESH_TOKEN_MAX_AGE_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_PATH = '/api/v1/auth';
function signRefreshToken(user) {
    return jsonwebtoken_1.default.sign({ userId: user._id }, JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` });
}
function refreshCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: REFRESH_COOKIE_PATH,
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    };
}
function setRefreshCookie(res, user) {
    res.cookie(REFRESH_TOKEN_COOKIE, signRefreshToken(user), refreshCookieOptions());
}
function clearRefreshCookie(res) {
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_COOKIE_PATH });
}
/**
 * The only role self-registration is permitted to create (Module 08 §12/§16:
 * "Role selection at signup... corrected for security — users should never
 * see those options. The signup page now shows only Placement Coordinator").
 */
const SELF_SIGNUP_ROLE = 'PLACEMENT_COORDINATOR';
const isAdmin = (roles = []) => roles.includes('ADMINISTRATOR') || roles.includes('ADMIN');
function fail(res, status, code, message, extra = {}) {
    return res.status(status).json({ success: false, error: { code, message, ...extra } });
}
/** Cryptographically random 6-digit code, zero-padded. */
function generateOtp() {
    return String(crypto_1.default.randomInt(0, 1_000_000)).padStart(6, '0');
}
function signToken(user) {
    return jsonwebtoken_1.default.sign({ userId: user._id, email: user.official_email, roles: user.role_codes, fullName: user.full_name }, authMiddleware_1.JWT_ACCESS_SECRET, { expiresIn: '8h' });
}
function publicUser(user) {
    return {
        _id: user._id,
        id: user._id,
        full_name: user.full_name,
        username: user.username,
        official_email: user.official_email,
        role_codes: user.role_codes,
        profile_photo_url: user.profile_photo_url || '',
        designation: user.designation || (user.role_codes?.includes('ADMIN') || user.role_codes?.includes('ADMINISTRATOR') ? 'Administrator' : user.role_codes?.includes('TEAM_LEADER') ? 'Team Leader' : 'Placement Operations Coordinator'),
        employee_id: user.employee_id || '',
        must_change_password: user.must_change_password,
        is_profile_locked: Boolean(user.is_profile_locked),
        profile_locked_at: user.profile_locked_at || null,
        personal_email: user.personal_email || '',
        primary_mobile: user.primary_mobile || '',
        secondary_mobile: user.secondary_mobile || user.alternate_mobile || '',
        alternate_mobile: user.alternate_mobile || user.secondary_mobile || '',
        linkedin_profile: user.linkedin_profile || '',
        date_of_birth: user.date_of_birth || null,
        date_of_joining: user.date_of_joining || null,
        address_line: user.address_line || user.residential_address || '',
        residential_address: user.residential_address || user.address_line || '',
        pincode: user.pincode || '',
        city: user.city || '',
        state: user.state || '',
    };
}
const pendingSignups = new Map();
function registerAuthRoutes(app) {
    /* ── Staff Self-Registration Step 1: Request Outlook Email OTP ────────── */
    app.post('/api/v1/auth/signup/request-otp', async (req, res) => {
        try {
            const { full_name = '', username = '', official_email = '', primary_mobile = '', password = '', } = req.body;
            const email = String(official_email).trim().toLowerCase();
            const uname = String(username).trim().toLowerCase();
            const name = String(full_name).trim();
            if (!name || !uname || !email || !password) {
                return fail(res, 400, 'FIELDS_REQUIRED', 'Please complete all required fields.');
            }
            if (!email.endsWith(`@${STAFF_DOMAIN}`)) {
                return fail(res, 400, 'INVALID_DOMAIN', `Only @${STAFF_DOMAIN} email addresses are permitted.`);
            }
            if (!(0, passwordPolicy_1.isPasswordValid)(password)) {
                return fail(res, 400, 'PASSWORD_POLICY', (0, passwordPolicy_1.firstPasswordError)(password) || 'Password does not meet the policy.');
            }
            // Check if this email or username already exists in the database
            const existingUser = await User_1.User.findOne({
                $or: [
                    { official_email: email },
                    { username: uname },
                ],
            });
            if (existingUser) {
                const isSameEmail = existingUser.official_email.toLowerCase() === email;
                return fail(res, 409, 'ACCOUNT_ALREADY_EXISTS', isSameEmail
                    ? `An account with ${email} already exists. Please sign in or reset your password.`
                    : `The username "${uname}" is already taken. Please choose a different username.`);
            }
            const salt = await bcryptjs_1.default.genSalt(12);
            const password_hash = await bcryptjs_1.default.hash(password, salt);
            const code = generateOtp();
            const otp_hash = await bcryptjs_1.default.hash(code, 10);
            const expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
            pendingSignups.set(email, {
                full_name: name,
                username: uname,
                official_email: email,
                primary_mobile: String(primary_mobile).trim(),
                password_hash,
                otp_hash,
                expires_at,
                attempts: 0,
            });
            const delivery = await (0, mailer_1.sendOtpEmail)(email, name, code, OTP_TTL_MINUTES);
            await (0, audit_1.writeAudit)({
                action: 'OTP_ISSUED',
                result: delivery.delivered ? 'SUCCESS' : 'FAILED',
                entityType: 'users',
                entityId: null,
                performedBy: null,
                performedByRole: 'COORDINATOR',
                performedByEmail: email,
                module: 'Security & Audit',
                severity: 'info',
                summary: delivery.delivered
                    ? `Signup verification code emailed to Outlook inbox ${email}`
                    : `Signup verification code delivery failed for ${email} (${delivery.reason})`,
                req,
            });
            if (!delivery.delivered && delivery.reason === 'SMTP is not configured on the server') {
                return res.status(200).json({
                    success: true,
                    message: `Verification code generated: ${code}`,
                    data: { expiresInMinutes: OTP_TTL_MINUTES, devMode: true, devCode: code },
                });
            }
            return res.status(200).json({
                success: true,
                message: `A 6-digit verification code has been sent to your official Outlook inbox (${email}). Enter the code to activate your Coordinator account.`,
                data: { expiresInMinutes: OTP_TTL_MINUTES },
            });
        }
        catch (error) {
            return fail(res, 500, 'INTERNAL_SERVER_ERROR', error?.message || 'Unexpected error');
        }
    });
    /* ── Staff Self-Registration Step 2: Verify OTP & Create Account ──────── */
    app.post('/api/v1/auth/signup/verify-otp', async (req, res) => {
        try {
            const email = String(req.body?.official_email || req.body?.email || '').trim().toLowerCase();
            const otp = String(req.body?.otp ?? '').trim();
            if (!email || !otp) {
                return fail(res, 400, 'FIELDS_REQUIRED', 'Email and verification code are required.');
            }
            const pending = pendingSignups.get(email);
            if (!pending) {
                return fail(res, 400, 'NO_SIGNUP_PENDING', 'No pending registration found for this email. Please submit the sign-up form again.');
            }
            if (pending.expires_at.getTime() < Date.now()) {
                pendingSignups.delete(email);
                return fail(res, 400, 'OTP_EXPIRED', 'Verification code has expired. Please request a new code.');
            }
            pending.attempts += 1;
            if (pending.attempts > OTP_MAX_ATTEMPTS) {
                pendingSignups.delete(email);
                return fail(res, 400, 'OTP_MAX_ATTEMPTS', 'Too many invalid attempts. Please sign up again.');
            }
            const match = await bcryptjs_1.default.compare(otp, pending.otp_hash);
            if (!match) {
                const remaining = Math.max(0, OTP_MAX_ATTEMPTS - pending.attempts);
                return fail(res, 400, 'INVALID_OTP', `Invalid verification code. ${remaining} attempt(s) remaining.`);
            }
            // Check once more if user already exists
            const existingUser = await User_1.User.findOne({
                $or: [{ official_email: email }, { username: pending.username }],
            });
            if (existingUser) {
                pendingSignups.delete(email);
                return fail(res, 409, 'ACCOUNT_ALREADY_EXISTS', 'Account already exists. Please sign in.');
            }
            const { Role } = await Promise.resolve().then(() => __importStar(require('../models/Role')));
            const roles = await Role.find({ role_code: { $in: [SELF_SIGNUP_ROLE] } });
            const roleIds = roles.map((r) => r._id);
            const user = await User_1.User.create({
                full_name: pending.full_name,
                username: pending.username,
                official_email: pending.official_email,
                password_hash: pending.password_hash,
                role_codes: [SELF_SIGNUP_ROLE],
                role_ids: roleIds,
                primary_mobile: pending.primary_mobile,
                account_status: 'active',
                presence_status: 'available',
                is_deleted: false,
            });
            pendingSignups.delete(email);
            setRefreshCookie(res, user);
            await (0, audit_1.writeAudit)({
                action: 'CREATE',
                result: 'SUCCESS',
                entityType: 'users',
                entityId: user._id,
                performedBy: user._id,
                performedByRole: SELF_SIGNUP_ROLE,
                performedByEmail: email,
                module: 'Security & Audit',
                severity: 'info',
                summary: `Self-registered Placement Coordinator account for ${user.full_name} (${email}) verified via Outlook OTP`,
                req,
            });
            return res.status(201).json({
                success: true,
                message: `Welcome to Infoziant iPOMS, ${user.full_name}! Your Placement Coordinator account is now active.`,
                data: {
                    token: signToken(user),
                    user: publicUser(user),
                },
            });
        }
        catch (error) {
            return fail(res, 500, 'INTERNAL_SERVER_ERROR', error?.message || 'Unexpected error');
        }
    });
    /* ── Legacy / Combined Sign Up endpoint (routes to request-otp or verify-otp) ── */
    app.post('/api/v1/auth/signup', async (req, res) => {
        if (req.body?.otp) {
            return app._router.handle({ ...req, url: '/api/v1/auth/signup/verify-otp' }, res);
        }
        // Otherwise route to request-otp
        try {
            const { full_name = '', username = '', official_email = '', primary_mobile = '', password = '', } = req.body;
            const email = String(official_email).trim().toLowerCase();
            const uname = String(username).trim().toLowerCase();
            const name = String(full_name).trim();
            if (!name || !uname || !email || !password) {
                return fail(res, 400, 'FIELDS_REQUIRED', 'Please complete all required fields.');
            }
            if (!email.endsWith(`@${STAFF_DOMAIN}`)) {
                return fail(res, 400, 'INVALID_DOMAIN', `Only @${STAFF_DOMAIN} email addresses are permitted.`);
            }
            if (!(0, passwordPolicy_1.isPasswordValid)(password)) {
                return fail(res, 400, 'PASSWORD_POLICY', (0, passwordPolicy_1.firstPasswordError)(password) || 'Password does not meet the policy.');
            }
            const existingUser = await User_1.User.findOne({
                $or: [{ official_email: email }, { username: uname }],
            });
            if (existingUser) {
                const isSameEmail = existingUser.official_email.toLowerCase() === email;
                return fail(res, 409, 'ACCOUNT_ALREADY_EXISTS', isSameEmail
                    ? `An account with ${email} already exists. Please sign in or reset your password.`
                    : `The username "${uname}" is already taken. Please choose a different username.`);
            }
            const salt = await bcryptjs_1.default.genSalt(12);
            const password_hash = await bcryptjs_1.default.hash(password, salt);
            const code = generateOtp();
            const otp_hash = await bcryptjs_1.default.hash(code, 10);
            const expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
            pendingSignups.set(email, {
                full_name: name,
                username: uname,
                official_email: email,
                primary_mobile: String(primary_mobile).trim(),
                password_hash,
                otp_hash,
                expires_at,
                attempts: 0,
            });
            const delivery = await (0, mailer_1.sendOtpEmail)(email, name, code, OTP_TTL_MINUTES);
            return res.status(200).json({
                success: true,
                requiresOtp: true,
                message: `A 6-digit verification code has been sent to your Outlook inbox (${email}). Please verify to complete account creation.`,
                data: { expiresInMinutes: OTP_TTL_MINUTES },
            });
        }
        catch (error) {
            return fail(res, 500, 'INTERNAL_SERVER_ERROR', error?.message || 'Unexpected error');
        }
    });
    /* ── Sign in ──────────────────────────────────────────────────────────── */
    app.post('/api/v1/auth/login', async (req, res) => {
        try {
            const rawEmail = String(req.body?.email ?? req.body?.official_email ?? '').trim().toLowerCase();
            const password = String(req.body?.password ?? '');
            const rememberMe = Boolean(req.body?.remember_me);
            if (!rawEmail)
                return fail(res, 400, 'EMAIL_REQUIRED', 'Enter your official email address.');
            if (!password)
                return fail(res, 400, 'PASSWORD_REQUIRED', 'Enter your password.');
            // Distinguish the three ways an email can be wrong, so the form can point
            // at the actual problem instead of saying "invalid" to all of them.
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
                return fail(res, 400, 'EMAIL_MALFORMED', 'That is not a valid email address. Example: name@infoziant.com');
            }
            if (!rawEmail.endsWith(`@${STAFF_DOMAIN}`)) {
                return fail(res, 400, 'EMAIL_WRONG_DOMAIN', `Use your Infoziant address — it must end in @${STAFF_DOMAIN}.`);
            }
            const user = await User_1.User.findOne({ official_email: rawEmail, is_deleted: false });
            if (!user) {
                await (0, audit_1.writeAudit)({
                    action: 'FAILED_LOGIN', result: 'FAILED', entityType: 'users',
                    performedByEmail: rawEmail, module: 'Security & Audit', severity: 'warning',
                    summary: `Sign-in attempted for unknown address ${rawEmail}`, req,
                });
                return fail(res, 404, 'ACCOUNT_NOT_FOUND', 'No iPOMS account exists for this email address.');
            }
            // Already locked — send them straight to recovery.
            if (user.account_status === 'blocked') {
                return fail(res, 423, 'ACCOUNT_LOCKED', 'Your account is locked after repeated failed attempts. Verify by email to set a new password.', { requiresReset: true });
            }
            if (user.account_status !== 'active') {
                return fail(res, 403, 'ACCOUNT_INACTIVE', 'This account is not active. Contact your administrator.');
            }
            const matches = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!matches) {
                user.failed_login_attempts = (user.failed_login_attempts ?? 0) + 1;
                const remaining = MAX_FAILED_ATTEMPTS - user.failed_login_attempts;
                // Lock on the attempt that exceeds the allowance (the 4th failure).
                if (user.failed_login_attempts > MAX_FAILED_ATTEMPTS) {
                    user.account_status = 'blocked';
                    user.locked_at = new Date();
                    await user.save();
                    await (0, audit_1.writeAudit)({
                        action: 'ACCOUNT_LOCKED', result: 'FAILED', entityType: 'users', entityId: user._id,
                        performedBy: user._id, performedByRole: user.role_codes?.[0] ?? 'unknown',
                        performedByEmail: user.official_email, module: 'Security & Audit', severity: 'critical',
                        summary: `Account locked after ${MAX_FAILED_ATTEMPTS} consecutive failed sign-in attempts`, req,
                    });
                    return fail(res, 423, 'ACCOUNT_LOCKED', 'Account locked after 3 failed attempts. Verify by email to set a new password.', { requiresReset: true });
                }
                await user.save();
                await (0, audit_1.writeAudit)({
                    action: 'FAILED_LOGIN', result: 'FAILED', entityType: 'users', entityId: user._id,
                    performedBy: user._id, performedByRole: user.role_codes?.[0] ?? 'unknown',
                    performedByEmail: user.official_email, module: 'Security & Audit',
                    severity: user.failed_login_attempts >= MAX_FAILED_ATTEMPTS ? 'critical' : 'warning',
                    summary: `Incorrect password (attempt ${user.failed_login_attempts} of ${MAX_FAILED_ATTEMPTS})`, req,
                });
                return fail(res, 401, 'WRONG_PASSWORD', remaining > 0
                    ? `Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before your account is locked.`
                    : 'Incorrect password. One more failed attempt will lock your account.', { attemptsRemaining: Math.max(remaining, 0) });
            }
            // Success — clear the failure streak so it counts consecutive misses only.
            user.failed_login_attempts = 0;
            user.locked_at = null;
            user.last_login_at = new Date();
            await user.save();
            await (0, audit_1.writeAudit)({
                action: 'LOGIN', entityType: 'users', entityId: user._id, performedBy: user._id,
                performedByRole: user.role_codes?.[0] ?? 'unknown', performedByEmail: user.official_email,
                module: 'Security & Audit', severity: 'info', summary: 'Signed in successfully', req,
            });
            if (rememberMe) {
                setRefreshCookie(res, user);
            }
            else {
                // Guards against a stale 30-day cookie surviving a login where the
                // user deliberately unchecked "remember me" this time.
                clearRefreshCookie(res);
            }
            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: { token: signToken(user), user: publicUser(user) },
            });
        }
        catch (error) {
            return fail(res, 500, 'INTERNAL_SERVER_ERROR', error?.message || 'Unexpected error');
        }
    });
    /* ── Refresh: exchange the httpOnly "remember me" cookie for a fresh
       8h access token, without re-entering a password. Silent-called by
       the frontend when a request comes back 401 (access token expired). */
    app.post('/api/v1/auth/refresh', async (req, res) => {
        try {
            const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
            if (!rawToken) {
                return fail(res, 401, 'NO_REFRESH_TOKEN', 'No remembered session for this device.');
            }
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(rawToken, JWT_REFRESH_SECRET);
            }
            catch {
                clearRefreshCookie(res);
                return fail(res, 401, 'REFRESH_INVALID', 'Your remembered session has expired. Please sign in again.');
            }
            const user = await User_1.User.findOne({ _id: decoded.userId, is_deleted: false });
            if (!user || user.account_status !== 'active') {
                clearRefreshCookie(res);
                return fail(res, 401, 'REFRESH_INVALID', 'Your remembered session is no longer valid. Please sign in again.');
            }
            // Sliding window: a device that's actually in use stays remembered
            // for a full 30 days from its last activity, not just from login.
            setRefreshCookie(res, user);
            return res.status(200).json({
                success: true,
                data: { token: signToken(user), user: publicUser(user) },
            });
        }
        catch (error) {
            return fail(res, 500, 'INTERNAL_SERVER_ERROR', error?.message || 'Unexpected error');
        }
    });
    /* ── Sign out: clear the remember-me cookie server-side. Access token
       revocation itself is out of scope (stateless 8h tokens, same as the
       rest of the app) — this only stops this device from silently refreshing. */
    app.post('/api/v1/auth/logout', async (req, res) => {
        clearRefreshCookie(res);
        return res.status(200).json({ success: true, message: 'Signed out.' });
    });
    /* ── Request an OTP ───────────────────────────────────────────────────── */
    app.post('/api/v1/auth/request-otp', async (req, res) => {
        try {
            const email = String(req.body?.email ?? '').trim().toLowerCase();
            const user = await User_1.User.findOne({ official_email: email, is_deleted: false });
            if (!user)
                return fail(res, 404, 'ACCOUNT_NOT_FOUND', 'No iPOMS account exists for this email address.');
            const code = generateOtp();
            user.reset_otp_hash = await bcryptjs_1.default.hash(code, 10);
            user.reset_otp_expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
            user.reset_otp_attempts = 0;
            await user.save();
            const delivery = await (0, mailer_1.sendOtpEmail)(user.official_email, user.full_name, code, OTP_TTL_MINUTES);
            await (0, audit_1.writeAudit)({
                action: 'OTP_ISSUED', result: delivery.delivered ? 'SUCCESS' : 'FAILED',
                entityType: 'users', entityId: user._id, performedBy: user._id,
                performedByRole: user.role_codes?.[0] ?? 'unknown', performedByEmail: user.official_email,
                module: 'Security & Audit', severity: 'warning',
                // Status text only — the code itself never enters the audit trail.
                summary: delivery.delivered
                    ? 'Password reset code emailed to the registered address'
                    : `Password reset code could not be delivered (${delivery.reason})`,
                req,
            });
            if (!delivery.delivered) {
                if (delivery.reason === 'SMTP is not configured on the server') {
                    // In development mode without SMTP, allow the frontend to proceed to the OTP entry screen
                    // and provide the code directly for local testing
                    return res.status(200).json({
                        success: true,
                        message: `Verification code generated: ${code}`,
                        data: { expiresInMinutes: OTP_TTL_MINUTES, devMode: true, devCode: code },
                    });
                }
                return fail(res, 502, 'EMAIL_NOT_SENT', `Could not send the verification email. ${delivery.reason}. Contact your administrator.`);
            }
            return res.status(200).json({
                success: true,
                message: `Verification code sent to ${user.official_email}`,
                data: { expiresInMinutes: OTP_TTL_MINUTES },
            });
        }
        catch (error) {
            return fail(res, 500, 'INTERNAL_SERVER_ERROR', error?.message || 'Unexpected error');
        }
    });
    /* ── Step 1: Verify OTP (Unlock Step) ────────────────────────────────── */
    app.post('/api/v1/auth/verify-otp', async (req, res) => {
        try {
            const email = String(req.body?.email ?? '').trim().toLowerCase();
            const otp = String(req.body?.otp ?? '').trim();
            const user = await User_1.User.findOne({ official_email: email, is_deleted: false }).select('+reset_otp_hash');
            if (!user)
                return fail(res, 404, 'ACCOUNT_NOT_FOUND', 'No iPOMS account exists for this email address.');
            if (!user.reset_otp_hash || !user.reset_otp_expires_at) {
                return fail(res, 400, 'NO_OTP_PENDING', 'No verification code has been requested for this account.');
            }
            if (user.reset_otp_expires_at.getTime() < Date.now()) {
                return fail(res, 410, 'OTP_EXPIRED', 'That verification code has expired. Request a new one.');
            }
            if ((user.reset_otp_attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
                return fail(res, 429, 'OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect codes. Request a new one.');
            }
            const otpOk = await bcryptjs_1.default.compare(otp, user.reset_otp_hash);
            if (!otpOk) {
                user.reset_otp_attempts = (user.reset_otp_attempts ?? 0) + 1;
                await user.save();
                await (0, audit_1.writeAudit)({
                    action: 'OTP_FAILED', result: 'FAILED', entityType: 'users', entityId: user._id,
                    performedBy: user._id, performedByRole: user.role_codes?.[0] ?? 'unknown',
                    performedByEmail: user.official_email, module: 'Security & Audit', severity: 'critical',
                    summary: `Incorrect verification code (attempt ${user.reset_otp_attempts} of ${OTP_MAX_ATTEMPTS})`, req,
                });
                const left = OTP_MAX_ATTEMPTS - user.reset_otp_attempts;
                return fail(res, 401, 'OTP_INVALID', `Incorrect verification code. ${Math.max(left, 0)} attempt${left === 1 ? '' : 's'} remaining.`);
            }
            return res.status(200).json({
                success: true,
                message: 'Account unlocked! Please set your new password.',
            });
        }
        catch (error) {
            return fail(res, 500, 'INTERNAL_SERVER_ERROR', error?.message || 'Unexpected error');
        }
    });
    /* ── Step 2: Verify OTP and set the new password ──────────────────────── */
    app.post('/api/v1/auth/reset-password', async (req, res) => {
        try {
            const email = String(req.body?.email ?? '').trim().toLowerCase();
            const otp = String(req.body?.otp ?? '').trim();
            const newPassword = String(req.body?.newPassword ?? '');
            const confirmPassword = String(req.body?.confirmPassword ?? '');
            const user = await User_1.User.findOne({ official_email: email, is_deleted: false }).select('+reset_otp_hash');
            if (!user)
                return fail(res, 404, 'ACCOUNT_NOT_FOUND', 'No iPOMS account exists for this email address.');
            if (!user.reset_otp_hash || !user.reset_otp_expires_at) {
                return fail(res, 400, 'NO_OTP_PENDING', 'No verification code has been requested for this account.');
            }
            if (user.reset_otp_expires_at.getTime() < Date.now()) {
                return fail(res, 410, 'OTP_EXPIRED', 'That verification code has expired. Request a new one.');
            }
            if ((user.reset_otp_attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
                return fail(res, 429, 'OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect codes. Request a new one.');
            }
            // Validate the new password before spending an OTP attempt, so a policy
            // slip does not burn one of the user's five tries.
            if (newPassword !== confirmPassword) {
                return fail(res, 400, 'PASSWORD_MISMATCH', 'The two passwords do not match.');
            }
            if (!(0, passwordPolicy_1.isPasswordValid)(newPassword)) {
                return fail(res, 400, 'PASSWORD_POLICY', (0, passwordPolicy_1.firstPasswordError)(newPassword) || 'Password does not meet the policy.');
            }
            const otpOk = await bcryptjs_1.default.compare(otp, user.reset_otp_hash);
            if (!otpOk) {
                user.reset_otp_attempts = (user.reset_otp_attempts ?? 0) + 1;
                await user.save();
                await (0, audit_1.writeAudit)({
                    action: 'OTP_FAILED', result: 'FAILED', entityType: 'users', entityId: user._id,
                    performedBy: user._id, performedByRole: user.role_codes?.[0] ?? 'unknown',
                    performedByEmail: user.official_email, module: 'Security & Audit', severity: 'critical',
                    summary: `Incorrect verification code (attempt ${user.reset_otp_attempts} of ${OTP_MAX_ATTEMPTS})`, req,
                });
                const left = OTP_MAX_ATTEMPTS - user.reset_otp_attempts;
                return fail(res, 401, 'OTP_INVALID', `Incorrect verification code. ${Math.max(left, 0)} attempt${left === 1 ? '' : 's'} remaining.`);
            }
            // Verified: reset the password and lift the lock in one step.
            user.password_hash = await bcryptjs_1.default.hash(newPassword, 12);
            user.last_password_changed_at = new Date();
            user.must_change_password = false;
            user.account_status = 'active';
            user.failed_login_attempts = 0;
            user.locked_at = null;
            user.reset_otp_hash = null;
            user.reset_otp_expires_at = null;
            user.reset_otp_attempts = 0;
            await user.save();
            await (0, audit_1.writeAudit)({
                action: 'PASSWORD_RESET', entityType: 'users', entityId: user._id, performedBy: user._id,
                performedByRole: user.role_codes?.[0] ?? 'unknown', performedByEmail: user.official_email,
                module: 'Security & Audit', severity: 'warning',
                summary: 'Password reset via email verification; account unlocked', req,
            });
            const token = signToken(user);
            return res.status(200).json({
                success: true,
                message: 'Password updated successfully! Welcome back.',
                data: { token, user: publicUser(user) },
            });
        }
        catch (error) {
            return fail(res, 500, 'INTERNAL_SERVER_ERROR', error?.message || 'Unexpected error');
        }
    });
}
