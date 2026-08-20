"use strict";
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
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'ipoms_dev_access_secret_super_secure_key_2026';
/** Consecutive failures allowed. The next failure locks the account. */
const MAX_FAILED_ATTEMPTS = 3;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const STAFF_DOMAIN = 'infoziant.com';
const isAdmin = (roles = []) => roles.includes('ADMINISTRATOR') || roles.includes('ADMIN');
function fail(res, status, code, message, extra = {}) {
    return res.status(status).json({ success: false, error: { code, message, ...extra } });
}
/** Cryptographically random 6-digit code, zero-padded. */
function generateOtp() {
    return String(crypto_1.default.randomInt(0, 1_000_000)).padStart(6, '0');
}
function signToken(user) {
    return jsonwebtoken_1.default.sign({ userId: user._id, email: user.official_email, roles: user.role_codes, fullName: user.full_name }, JWT_ACCESS_SECRET, { expiresIn: '8h' });
}
function publicUser(user) {
    return {
        _id: user._id,
        id: user._id,
        full_name: user.full_name,
        username: user.username,
        official_email: user.official_email,
        role_codes: user.role_codes,
        must_change_password: user.must_change_password,
    };
}
function registerAuthRoutes(app) {
    /* ── Sign in ──────────────────────────────────────────────────────────── */
    app.post('/api/v1/auth/login', async (req, res) => {
        try {
            const rawEmail = String(req.body?.email ?? '').trim().toLowerCase();
            const password = String(req.body?.password ?? '');
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
                return fail(res, 423, 'ACCOUNT_LOCKED', isAdmin(user.role_codes)
                    ? 'This administrator account is locked. It must be unlocked on the server.'
                    : 'Your account is locked after repeated failed attempts. Verify by email to set a new password.', { requiresReset: !isAdmin(user.role_codes), adminLocked: isAdmin(user.role_codes) });
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
                    return fail(res, 423, 'ACCOUNT_LOCKED', isAdmin(user.role_codes)
                        ? 'This administrator account is now locked. It must be unlocked on the server.'
                        : 'Account locked after 3 failed attempts. Verify by email to set a new password.', { requiresReset: !isAdmin(user.role_codes), adminLocked: isAdmin(user.role_codes) });
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
    /* ── Request an OTP ───────────────────────────────────────────────────── */
    app.post('/api/v1/auth/request-otp', async (req, res) => {
        try {
            const email = String(req.body?.email ?? '').trim().toLowerCase();
            const user = await User_1.User.findOne({ official_email: email, is_deleted: false });
            if (!user)
                return fail(res, 404, 'ACCOUNT_NOT_FOUND', 'No iPOMS account exists for this email address.');
            if (isAdmin(user.role_codes)) {
                return fail(res, 403, 'ADMIN_NO_OTP', 'Administrator accounts cannot be reset by email. Unlock it on the server instead.');
            }
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
    /* ── Verify OTP and set the new password ──────────────────────────────── */
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
            return res.status(200).json({
                success: true,
                message: 'Password updated. You can sign in with your new password.',
                data: { user: publicUser(user) },
            });
        }
        catch (error) {
            return fail(res, 500, 'INTERNAL_SERVER_ERROR', error?.message || 'Unexpected error');
        }
    });
}
