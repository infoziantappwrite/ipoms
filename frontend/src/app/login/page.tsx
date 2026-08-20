'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { InfoziantMark } from '@/components/InfoziantMark';
import { PasswordChecklist } from '@/components/auth/PasswordChecklist';
import { AlertTriangle, CheckCircle2, LockKeyhole, LogIn, PenLine, ShieldAlert } from 'lucide-react';
import { armNavIntro } from '@/lib/session';
import { isPasswordValid } from '@/lib/passwordPolicy';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const STAFF_DOMAIN = 'infoziant.com';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

/**
 * Everyone signs in with an @infoziant.com address, so typing the domain is
 * pure friction. Leaving the field with a bare name completes it.
 */
function completeEmail(raw: string): string {
  const v = raw.trim();
  if (!v || v.includes('@')) return v;
  return `${v}@${STAFF_DOMAIN}`;
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign-up
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [roleCode, setRoleCode] = useState('COORDINATOR');

  // OTP reset
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  /** Set when the account is locked, so the UI can explain rather than just refuse. */
  const [locked, setLocked] = useState(false);

  const clearFeedback = () => { setErrorMsg(''); setSuccessMsg(''); };

  const goTo = (next: Mode) => { setMode(next); clearFeedback(); };

  /** Asks the server to email a code. Shared by the lockout path and "Forgot password". */
  const requestOtp = async (addr: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr }),
      });
      const data = await res.json();
      if (!data.success) { setErrorMsg(data.error?.message || 'Could not send the verification code.'); return false; }
      setSuccessMsg(data.message || `Verification code sent to ${addr}.`);
      return true;
    } catch {
      setErrorMsg('Cannot reach the iPOMS server. Check your connection and try again.');
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setLocked(false);
    setLoading(true);

    const addr = completeEmail(email);
    setEmail(addr);

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr, password }),
      });
      const data = await res.json();

      if (!data.success) {
        const err = data.error ?? {};
        setErrorMsg(err.message || 'Sign-in failed.');

        // Locked accounts go straight into recovery rather than making the user
        // find the "forgot password" link after being told they are locked out.
        if (err.code === 'ACCOUNT_LOCKED') {
          setLocked(true);
          if (err.requiresReset) {
            const sent = await requestOtp(addr);
            if (sent) { setMode('reset'); setErrorMsg(''); }
          }
        }
        return;
      }

      const { token, user } = data.data;
      localStorage.setItem('ipoms_user', JSON.stringify(user));
      localStorage.setItem('ipoms_token', token);
      armNavIntro();

      setSuccessMsg(`Welcome back, ${user.full_name}. Opening your dashboard…`);
      setTimeout(() => router.push('/dashboard'), 700);
    } catch {
      setErrorMsg('Cannot reach the iPOMS server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!fullName.trim() || !username.trim() || !email.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }
    if (!isPasswordValid(password)) {
      setErrorMsg('The password does not meet the policy shown below.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          official_email: completeEmail(email).toLowerCase(),
          primary_mobile: mobile.trim(),
          role_codes: [roleCode],
          password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Account created for ${fullName}. You can sign in now.`);
        setPassword('');
        setMode('login');
      } else {
        setErrorMsg(data.error?.message || 'Registration failed.');
      }
    } catch {
      setErrorMsg('Cannot reach the iPOMS server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);
    const addr = completeEmail(email);
    setEmail(addr);
    const sent = await requestOtp(addr);
    if (sent) setMode('reset');
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (newPassword !== confirmPassword) { setErrorMsg('The two passwords do not match.'); return; }
    if (!isPasswordValid(newPassword)) { setErrorMsg('The new password does not meet the policy shown below.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: completeEmail(email), otp, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!data.success) { setErrorMsg(data.error?.message || 'Could not reset the password.'); return; }

      setSuccessMsg('Password updated. Sign in with your new password.');
      setOtp(''); setNewPassword(''); setConfirmPassword(''); setPassword('');
      setLocked(false);
      setMode('login');
    } catch {
      setErrorMsg('Cannot reach the iPOMS server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-white border border-border-strong rounded-xl px-3.5 py-2.5 text-fg';

  const heading =
    mode === 'login' ? 'Sign in to iPOMS'
    : mode === 'signup' ? 'Create iPOMS Staff Account'
    : mode === 'forgot' ? 'Reset your password'
    : 'Verify and set a new password';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl bg-white border border-border rounded-3xl shadow-4 p-8 sm:p-10 space-y-6">

        <div className="text-center space-y-2 flex flex-col items-center">
          <InfoziantMark size={104} />
          <h1 key={mode} className="text-2xl font-bold text-fg tracking-tight mt-3 animate-form-in">
            {heading}
          </h1>
          <p className="text-xs text-fg-subtle max-w-sm">
            Infoziant Placement Operations Management System
          </p>
        </div>

        {/* Tabs are only meaningful for the two entry modes. */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="flex items-center p-1 bg-surface-sunken rounded-2xl text-xs font-bold text-fg-muted">
            <button
              type="button"
              onClick={() => goTo('login')}
              className={`flex-1 py-2 rounded-xl transition-all ${
                mode === 'login' ? 'bg-white text-primary shadow-1' : 'hover:text-fg'
              }`}
            >
              <LogIn size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{' '}Sign In
            </button>
            <button
              type="button"
              onClick={() => goTo('signup')}
              className={`flex-1 py-2 rounded-xl transition-all ${
                mode === 'signup' ? 'bg-white text-primary shadow-1' : 'hover:text-fg'
              }`}
            >
              <PenLine size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{' '}Create Account
            </button>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2 ${
              locked
                ? 'bg-warning-subtle border border-warning text-warning'
                : 'bg-destructive-subtle border border-destructive text-destructive'
            }`}
          >
            {locked
              ? <ShieldAlert size={15} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
              : <AlertTriangle size={15} strokeWidth={2} className="mt-px shrink-0" aria-hidden />}
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div role="status" className="p-3.5 bg-success-subtle border border-success rounded-2xl text-success text-xs font-semibold flex items-start gap-2">
            <CheckCircle2 size={15} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── Sign in ──────────────────────────────────────────────────────── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs animate-form-in">
            <div>
              <label htmlFor="email" className="block text-fg-muted font-bold mb-1">Official Email Address</label>
              <input
                id="email"
                type="text"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(completeEmail(e.target.value))}
                placeholder={`name@${STAFF_DOMAIN}`}
                autoComplete="username"
                required
                className={`${inputClass} font-mono`}
              />
              <p className="mt-1 text-micro text-fg-subtle">
                Type your name and press Tab — @{STAFF_DOMAIN} is added for you.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="text-fg-muted font-bold">Password</label>
                <button type="button" onClick={() => goTo('forgot')} className="text-primary hover:underline text-micro font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className={`${inputClass} font-mono pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none text-fg-muted pt-1">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-border-strong text-primary"
              />
              <span>Remember this device for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground rounded-xl font-bold shadow-2 transition-colors text-xs"
            >
              {loading ? 'Verifying…' : 'Sign In to Operations Portal →'}
            </button>
          </form>
        )}

        {/* ── Create account ───────────────────────────────────────────────── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4 text-xs animate-form-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-fg-muted font-bold mb-1">Full Name *</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priyadharshini K" required className={inputClass} />
              </div>
              <div>
                <label className="block text-fg-muted font-bold mb-1">Username *</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. priya.k" required className={`${inputClass} font-mono`} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-fg-muted font-bold mb-1">Official Email *</label>
                <input type="text"
                inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => setEmail(completeEmail(e.target.value))}
                  placeholder={`priya.k@${STAFF_DOMAIN}`} required className={`${inputClass} font-mono`} />
              </div>
              <div>
                <label className="block text-fg-muted font-bold mb-1">Primary Mobile</label>
                <input type="text" value={mobile} onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210" className={`${inputClass} font-mono`} />
              </div>
            </div>

            <div>
              <label className="block text-fg-muted font-bold mb-1">Assigned Role</label>
              <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)}
                className={`${inputClass} cursor-pointer`}>
                <option value="COORDINATOR">Placement Coordinator</option>
                <option value="TEAM_LEADER">Team Leader</option>
              </select>
            </div>

            <div>
              <label className="block text-fg-muted font-bold mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 9 characters" autoComplete="new-password" required className={inputClass} />
              <PasswordChecklist password={password} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground rounded-xl font-bold shadow-2 transition-colors text-xs">
              {loading ? 'Creating account…' : 'Register New Account'}
            </button>
          </form>
        )}

        {/* ── Forgot password ──────────────────────────────────────────────── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4 text-xs animate-form-in">
            <p className="text-fg-muted leading-relaxed">
              Enter your official Infoziant email. We will send a 6-digit verification
              code to that inbox, valid for 10 minutes.
            </p>

            <div>
              <label className="block text-fg-muted font-bold mb-1">Official Email</label>
              <input type="text"
                inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(completeEmail(e.target.value))}
                placeholder={`name@${STAFF_DOMAIN}`} required className={`${inputClass} font-mono`} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground rounded-xl font-bold shadow-2 transition-colors text-xs">
              {loading ? 'Sending…' : 'Send Verification Code'}
            </button>

            <div className="text-center pt-1">
              <button type="button" onClick={() => goTo('login')} className="text-primary hover:underline font-semibold">
                ← Back to sign in
              </button>
            </div>
          </form>
        )}

        {/* ── Verify OTP and set a new password ────────────────────────────── */}
        {mode === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4 text-xs animate-form-in">
            <div className="flex items-start gap-2 rounded-2xl border border-border bg-surface-sunken p-3.5 text-fg-muted">
              <LockKeyhole size={15} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
              <span>
                Check <span className="font-semibold text-fg">{email}</span> for a 6-digit code.
                It expires in 10 minutes. Nobody from Infoziant will ever ask you for it.
              </span>
            </div>

            <div>
              <label htmlFor="otp" className="block text-fg-muted font-bold mb-1">Verification Code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoComplete="one-time-code"
                required
                className={`${inputClass} font-mono text-center text-display tracking-[0.5em]`}
              />
            </div>

            <div>
              <label className="block text-fg-muted font-bold mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password" required className={inputClass} />
              <PasswordChecklist password={newPassword} />
            </div>

            <div>
              <label className="block text-fg-muted font-bold mb-1">Re-enter New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password" required className={inputClass} />
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <p className="mt-1 text-micro font-semibold text-destructive">The two passwords do not match.</p>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground rounded-xl font-bold shadow-2 transition-colors text-xs">
              {loading ? 'Verifying…' : 'Set New Password & Unlock Account'}
            </button>

            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={() => requestOtp(completeEmail(email))} className="text-primary hover:underline font-semibold">
                Resend code
              </button>
              <button type="button" onClick={() => goTo('login')} className="text-fg-subtle hover:text-fg font-semibold">
                Back to sign in
              </button>
            </div>
          </form>
        )}

        <div className="border-t border-border pt-4 text-center">
          <Link href="/home" className="text-xs text-fg-subtle hover:text-primary font-semibold transition-colors">
            ← Return to Executive Gateway
          </Link>
        </div>

      </div>
    </div>
  );
}
