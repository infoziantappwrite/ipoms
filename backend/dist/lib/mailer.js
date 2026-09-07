"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPositiveSyncReminderEmail = sendPositiveSyncReminderEmail;
exports.sendForeignCollegeEditEmail = sendForeignCollegeEditEmail;
exports.sendOtpEmail = sendOtpEmail;
require("dotenv/config");
const nodemailer_1 = __importDefault(require("nodemailer"));
function getTransport() {
    const host = process.env.SMTP_HOST || 'smtp.office365.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const from = process.env.SMTP_FROM || `iPOMS Placement Operations <${user || 'placement_management@infoziant.com'}>`;
    if (!user || !pass)
        return null;
    const transporter = nodemailer_1.default.createTransport({
        host,
        port,
        secure: port === 465, // 587 upgrades via STARTTLS
        auth: { user, pass },
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false,
        },
    });
    return { transporter, from };
}
function otpHtml(fullName, code, minutes) {
    return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:32px">
      <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0f172a">iPOMS password reset</p>
      <p style="margin:0 0 24px;font-size:13px;color:#64748b">Infoziant Placement Operations Management System</p>

      <p style="margin:0 0 16px;font-size:14px;color:#334155">
        Hello ${fullName || 'there'}, your account was locked after repeated failed sign-in
        attempts. Use this verification code in iPOMS to set a new password.
      </p>

      <div style="margin:24px 0;padding:18px;background:#f1f5f9;border-radius:10px;text-align:center">
        <span style="font-family:'Courier New',monospace;font-size:30px;font-weight:700;letter-spacing:9px;color:#1e3a8a">${code}</span>
      </div>

      <p style="margin:0 0 8px;font-size:13px;color:#334155">
        This code expires in ${minutes} minutes and can be used once.
      </p>
      <p style="margin:0;font-size:13px;color:#b91c1c">
        If you did not try to sign in, do not enter this code — contact your administrator instead.
      </p>

      <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
        Automated message from iPOMS. Nobody from Infoziant will ever ask you for this code.
      </p>
    </div>
  </div>`;
}
function foreignCollegeEditHtml(opts) {
    const actionLabel = { created: 'added', updated: 'updated', deleted: 'deleted' }[opts.action];
    const when = opts.timestamp.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:32px">
      <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0f172a">Weekly Tracker change on your college</p>
      <p style="margin:0 0 24px;font-size:13px;color:#64748b">Infoziant Placement Operations Management System</p>

      <p style="margin:0 0 16px;font-size:14px;color:#334155">
        Hello ${opts.ownerName}, <strong>${opts.actorName}</strong> ${actionLabel} a Weekly Tracker
        entry for <strong>${opts.companyName}</strong> on <strong>${opts.collegeName}</strong> —
        a college assigned to you — on ${when}.
      </p>

      <p style="margin:0;font-size:13px;color:#334155">
        This is an informational notice only. No action is needed unless the change looks
        incorrect, in which case check the Weekly Tracker or contact your Team Leader.
      </p>

      <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
        Automated message from iPOMS.
      </p>
    </div>
  </div>`;
}
function positiveSyncReminderHtml(opts) {
    const when = opts.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const companyList = opts.companies.map((c) => `<li style="margin:0 0 4px">${c}</li>`).join('');
    return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:32px">
      <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0f172a">Positive calls not yet in Weekly Tracker</p>
      <p style="margin:0 0 24px;font-size:13px;color:#64748b">Infoziant Placement Operations Management System</p>

      <p style="margin:0 0 16px;font-size:14px;color:#334155">
        Hello ${opts.coordinatorName}, you logged ${opts.companies.length} Invite Mail call(s)
        for <strong>${opts.collegeName}</strong> on ${when} that haven't been synced into
        Weekly Tracker yet:
      </p>

      <ul style="margin:0 0 16px;padding-left:20px;font-size:13px;color:#334155">
        ${companyList}
      </ul>

      <p style="margin:0 0 8px;font-size:13px;color:#334155">
        Click <strong>Sync Daily Positives</strong> in Weekly Tracker, or add these companies
        manually, before <strong>10:00 PM</strong> tonight.
      </p>
      <p style="margin:0;font-size:13px;color:#b91c1c">
        If nothing is done by 10:00 PM, iPOMS will sync these automatically so the data
        isn't lost — but a manual review is always better.
      </p>

      <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
        Automated message from iPOMS.
      </p>
    </div>
  </div>`;
}
async function sendPositiveSyncReminderEmail(to, opts) {
    const mailSetup = getTransport();
    if (!mailSetup) {
        console.warn(`[mailer] SMTP not configured — skipping positive-sync reminder to ${to}`);
        return { delivered: false, reason: 'SMTP is not configured on the server' };
    }
    try {
        await mailSetup.transporter.sendMail({
            from: mailSetup.from,
            to,
            subject: `iPOMS: ${opts.companies.length} positive call(s) on ${opts.collegeName} not yet in Weekly Tracker`,
            text: `You logged ${opts.companies.length} Invite Mail call(s) for ${opts.collegeName} today `
                + `(${opts.companies.join(', ')}) that haven't been synced into Weekly Tracker. Please sync `
                + `or add them manually before 10:00 PM tonight — after that iPOMS will auto-sync them.`,
            html: positiveSyncReminderHtml(opts),
        });
        console.log(`[mailer] Delivered positive-sync reminder to ${to}`);
        return { delivered: true };
    }
    catch (err) {
        console.error('[mailer] Failed to send positive-sync reminder:', err?.message || err);
        return { delivered: false, reason: 'Email delivery failed' };
    }
}
async function sendForeignCollegeEditEmail(to, opts) {
    const mailSetup = getTransport();
    if (!mailSetup) {
        console.warn(`[mailer] SMTP not configured — skipping foreign-college-edit notice to ${to}`);
        return { delivered: false, reason: 'SMTP is not configured on the server' };
    }
    const actionLabel = { created: 'added', updated: 'updated', deleted: 'deleted' }[opts.action];
    try {
        await mailSetup.transporter.sendMail({
            from: mailSetup.from,
            to,
            subject: `iPOMS: ${opts.actorName} ${actionLabel} a Weekly Tracker entry on ${opts.collegeName}`,
            text: `${opts.actorName} ${actionLabel} a Weekly Tracker entry for ${opts.companyName} on `
                + `${opts.collegeName} (a college assigned to you) at ${opts.timestamp.toISOString()}. `
                + `This is informational only.`,
            html: foreignCollegeEditHtml(opts),
        });
        console.log(`[mailer] Delivered foreign-college-edit notice to ${to}`);
        return { delivered: true };
    }
    catch (err) {
        console.error('[mailer] Failed to send foreign-college-edit notice:', err?.message || err);
        return { delivered: false, reason: 'Email delivery failed' };
    }
}
async function sendOtpEmail(to, fullName, code, minutes) {
    const mailSetup = getTransport();
    if (!mailSetup) {
        console.warn(`[mailer] SMTP not configured — OTP for ${to} is ${code} (dev log only, no email sent)`);
        return { delivered: false, reason: 'SMTP is not configured on the server' };
    }
    try {
        await mailSetup.transporter.sendMail({
            from: mailSetup.from,
            to,
            subject: `iPOMS verification code: ${code}`,
            text: `Your iPOMS password reset code is ${code}. It expires in ${minutes} minutes. `
                + `If you did not request this, contact your administrator.`,
            html: otpHtml(fullName, code, minutes),
        });
        console.log(`[mailer] Successfully delivered OTP email to ${to}`);
        return { delivered: true };
    }
    catch (err) {
        console.error('[mailer] Failed to send OTP email:', err?.message || err);
        return { delivered: false, reason: 'Email delivery failed' };
    }
}
