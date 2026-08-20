"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const audit_1 = require("../lib/audit");
const passwordPolicy_1 = require("../lib/passwordPolicy");
/**
 * Break-glass account unlock — the administrator's recovery path.
 *
 * Administrators are subject to the same 3-attempt lockout as everyone else,
 * but cannot recover by email OTP: if the admin mailbox were ever unreachable,
 * an email-only path would lock the organisation out of its own system. This
 * script requires shell access to the server, which is a stronger proof of
 * authority than inbox access anyway.
 *
 *   npm run unlock -- someone@infoziant.com
 *   npm run unlock -- someone@infoziant.com 'NewPass@2026'
 *
 * With no password argument the account is simply unlocked and the failure
 * counter cleared. With one, the password is reset too.
 */
async function unlockUser() {
    const [email, newPassword] = process.argv.slice(2);
    if (!email) {
        console.error('\nUsage: npm run unlock -- <email> [newPassword]\n');
        process.exit(1);
    }
    if (newPassword && !(0, passwordPolicy_1.isPasswordValid)(newPassword)) {
        console.error(`\n[ERROR] ${(0, passwordPolicy_1.firstPasswordError)(newPassword)}\n`);
        process.exit(1);
    }
    try {
        await (0, database_1.connectDatabase)();
        const user = await User_1.User.findOne({ official_email: email.toLowerCase().trim(), is_deleted: false });
        if (!user) {
            console.error(`\n[ERROR] No account found for ${email}\n`);
            return;
        }
        const wasLocked = user.account_status === 'blocked';
        user.account_status = 'active';
        user.failed_login_attempts = 0;
        user.locked_at = null;
        user.reset_otp_hash = null;
        user.reset_otp_expires_at = null;
        user.reset_otp_attempts = 0;
        if (newPassword) {
            user.password_hash = await bcryptjs_1.default.hash(newPassword, 12);
            user.last_password_changed_at = new Date();
            user.must_change_password = false;
        }
        await user.save();
        await (0, audit_1.writeAudit)({
            action: newPassword ? 'PASSWORD_RESET' : 'STATUS_CHANGE',
            entityType: 'users',
            entityId: user._id,
            performedByRole: 'system',
            performedByEmail: user.official_email,
            module: 'Security & Audit',
            severity: 'critical',
            summary: newPassword
                ? 'Account unlocked and password reset via server console (break-glass)'
                : 'Account unlocked via server console (break-glass)',
        });
        console.log('\n=============================================================');
        console.log('  ACCOUNT UNLOCKED');
        console.log('=============================================================');
        console.log(`  Email          : ${user.official_email}`);
        console.log(`  Name           : ${user.full_name}`);
        console.log(`  Role           : ${user.role_codes.join(', ')}`);
        console.log(`  Was locked     : ${wasLocked ? 'yes' : 'no (counter cleared anyway)'}`);
        console.log(`  Password reset : ${newPassword ? 'yes' : 'no — existing password kept'}`);
        console.log('=============================================================\n');
    }
    catch (error) {
        console.error('[ERROR] Unlock failed:', error);
    }
    finally {
        await (0, database_1.disconnectDatabase)();
        process.exit(0);
    }
}
unlockUser();
