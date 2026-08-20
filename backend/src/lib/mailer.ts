import nodemailer, { type Transporter } from 'nodemailer';

/**
 * OTP delivery.
 *
 * Deliberately narrow: one `sendOtpEmail` function, so swapping SMTP for
 * Microsoft Graph or an SMS provider later means rewriting this file only —
 * no auth-route changes. Everything provider-specific stays behind this line.
 *
 * Required environment (backend/.env):
 *   SMTP_HOST=smtp.office365.com
 *   SMTP_PORT=587
 *   SMTP_USER=noreply@infoziant.com
 *   SMTP_PASS=<app password>
 *   SMTP_FROM="iPOMS Security <noreply@infoziant.com>"
 *
 * With SMTP_USER unset the transport is not built and sendOtpEmail reports a
 * delivery failure rather than pretending to have sent. In development that
 * surfaces the code in the server log so the flow stays testable without a
 * mailbox, but it is never returned through the API.
 */

const HOST = process.env.SMTP_HOST || 'smtp.office365.com';
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER || '';
const PASS = process.env.SMTP_PASS || '';
const FROM = process.env.SMTP_FROM || `iPOMS Security <${USER || 'noreply@infoziant.com'}>`;

export const isMailConfigured = Boolean(USER && PASS);

let transporter: Transporter | null = null;
function getTransport(): Transporter | null {
  if (!isMailConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465, // 587 upgrades via STARTTLS
      auth: { user: USER, pass: PASS },
    });
  }
  return transporter;
}

function otpHtml(fullName: string, code: string, minutes: number): string {
  // Inline styles only — mail clients discard <style> blocks. No link or
  // button by design: a one-click auth control in email trains users to click
  // exactly what a phishing message imitates. The code is typed into iPOMS.
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

export async function sendOtpEmail(
  to: string,
  fullName: string,
  code: string,
  minutes: number
): Promise<{ delivered: boolean; reason?: string }> {
  const tx = getTransport();

  if (!tx) {
    // Not configured. Log locally so development can proceed, and be explicit
    // that nothing was delivered so the caller can tell the user the truth.
    console.warn(`[mailer] SMTP not configured — OTP for ${to} is ${code} (dev log only, no email sent)`);
    return { delivered: false, reason: 'SMTP is not configured on the server' };
  }

  try {
    await tx.sendMail({
      from: FROM,
      to,
      subject: `iPOMS verification code: ${code}`,
      text: `Your iPOMS password reset code is ${code}. It expires in ${minutes} minutes. `
        + `If you did not request this, contact your administrator.`,
      html: otpHtml(fullName, code, minutes),
    });
    return { delivered: true };
  } catch (err: any) {
    console.error('[mailer] Failed to send OTP email:', err?.message || err);
    return { delivered: false, reason: 'Email delivery failed' };
  }
}
