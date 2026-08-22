'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InfoziantMark } from '@/components/InfoziantMark';
import GradientWaves from '@/components/effects/GradientWaves/GradientWaves';
import { PasswordChecklist } from '@/components/auth/PasswordChecklist';
import {
  AlertTriangle, CheckCircle2, LockKeyhole, LogIn, PenLine,
  ShieldAlert, Lock, Unlock, RotateCcw, KeyRound, Eye, EyeOff, Sparkles
} from 'lucide-react';
import { armNavIntro } from '@/lib/session';
import { isPasswordValid } from '@/lib/passwordPolicy';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const STAFF_DOMAIN = 'infoziant.com';

type Mode = 'login' | 'signup' | 'forgot' | 'verify_otp' | 'set_new_password';

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
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign-up
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [roleCode, setRoleCode] = useState('COORDINATOR');

  // OTP reset flow (2 steps)
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [locked, setLocked] = useState(false);

  const clearFeedback = () => { setErrorMsg(''); setSuccessMsg(''); };

  const goTo = (next: Mode) => {
    setMode(next);
    clearFeedback();
    setIsUnlocked(false);
  };

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
        credentials: 'include',
        body: JSON.stringify({ email: addr, password, remember_me: rememberMe }),
      });
      const data = await res.json();

      if (!data.success) {
        const err = data.error ?? {};
        setErrorMsg(err.message || 'Sign-in failed.');

        if (err.code === 'ACCOUNT_LOCKED') {
          setLocked(true);
          if (err.requiresReset) {
            const sent = await requestOtp(addr);
            if (sent) { setMode('verify_otp'); setErrorMsg(''); }
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
      const res = await fetch(`${API}/auth/signup`, {
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
    if (sent) setMode('verify_otp');
    setLoading(false);
  };

  /** Step 1: Verify OTP and trigger unlock animation */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!otp || otp.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: completeEmail(email), otp: otp.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error?.message || 'Invalid verification code.');
        setLoading(false);
        return;
      }

      setIsUnlocked(true);
      setSuccessMsg('Account unlocked! Please set your new password.');
      setLoading(false);

      setTimeout(() => {
        setMode('set_new_password');
        clearFeedback();
      }, 850);
    } catch {
      setErrorMsg('Cannot reach the iPOMS server. Check your connection and try again.');
      setLoading(false);
    }
  };

  /** Step 2: Save New Password and Sign in directly */
  const handleSaveAndSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (newPassword !== confirmPassword) {
      setErrorMsg('The two passwords do not match.');
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setErrorMsg('The new password does not meet the policy shown below.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: completeEmail(email), otp: otp.trim(), newPassword, confirmPassword }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error?.message || 'Could not save the new password.');
        return;
      }

      if (data.data?.token && data.data?.user) {
        localStorage.setItem('ipoms_user', JSON.stringify(data.data.user));
        localStorage.setItem('ipoms_token', data.data.token);
        armNavIntro();
        setSuccessMsg(`Password saved successfully! Welcome back, ${data.data.user.full_name}. Entering dashboard…`);
        setTimeout(() => router.push('/dashboard'), 750);
      } else {
        setSuccessMsg('Password updated! You can now sign in with your new password.');
        setOtp(''); setNewPassword(''); setConfirmPassword(''); setPassword('');
        setLocked(false);
        setMode('login');
      }
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
    : mode === 'verify_otp' ? 'Verify & Unlock Account'
    : 'Set New Password';

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <GradientWaves
          horizonColor="#7edbee"
          waveColor="#a1bcc1"
          crestColor="#90e0ed"
          speed={0.4}
          amplitude={2.45}
          waveScale={0.6}
          waveRatio={1.15}
          swell={37}
          turbulence={20.5}
          tilt={1.05}
          zoom={0.75}
          height={5.6}
          fogDepth={17}
          detail="medium"
          brightness={1.05}
          opacity={1}
          grain
          grainIntensity={0.05}
          mouseInteraction
          parallaxStrength={0.37}
        />
      </div>

      <div className="relative z-10 w-full max-w-xl bg-white border border-border rounded-3xl shadow-4 p-8 sm:p-10 space-y-6">

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center">
            <InfoziantMark size={104} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">{heading}</h1>
          <p className="text-xs text-fg-subtle">
            Infoziant Placement Operations Management System
          </p>
        </div>

        {(mode === 'login' || mode === 'signup') && (
          <div className="grid grid-cols-2 gap-2 bg-surface-sunken p-1 rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => goTo('login')}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-fg shadow-1 border border-border/50'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              <LogIn size={14} strokeWidth={2} aria-hidden /> Sign In
            </button>
            <button
              type="button"
              onClick={() => goTo('signup')}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-white text-fg shadow-1 border border-border/50'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              <PenLine size={14} strokeWidth={2} aria-hidden /> Create Account
            </button>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-destructive-subtle bg-destructive-subtle p-3.5 text-xs text-destructive font-medium animate-feedback-in"
          >
            {locked ? (
              <ShieldAlert size={16} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
            ) : (
              <AlertTriangle size={16} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
            )}
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-2xl border border-success-subtle bg-success-subtle p-3.5 text-xs text-success font-medium animate-feedback-in"
          >
            <CheckCircle2 size={16} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs animate-form-in">
            <div>
              <label className="block text-fg-muted font-bold mb-1">Official Email Address</label>
              <input
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
                <label className="text-fg-muted font-bold">Password</label>
                <button
                  type="button"
                  onClick={() => goTo('forgot')}
                  className="text-primary hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className={`${inputClass} pr-14`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-micro font-semibold text-fg-subtle hover:text-fg"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-fg-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-border-strong text-primary focus:ring-primary"
              />
              <span>Remember this device for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground rounded-xl font-bold shadow-2 transition-all active:scale-[0.99] text-xs cursor-pointer"
            >
              {loading ? 'Authenticating…' : 'Sign-In'}
            </button>
          </form>
        )}

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
              className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground rounded-xl font-bold shadow-2 transition-colors text-xs cursor-pointer">
              {loading ? 'Creating account…' : 'Register New Account'}
            </button>
          </form>
        )}

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
              className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground rounded-xl font-bold shadow-2 transition-colors text-xs cursor-pointer">
              {loading ? 'Sending…' : 'Send Verification Code'}
            </button>

            <div className="text-center pt-1">
              <button type="button" onClick={() => goTo('login')} className="text-primary hover:underline font-semibold">
                ← Back to sign in
              </button>
            </div>
          </form>
        )}

        {mode === 'verify_otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 text-xs animate-form-in">
            <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken p-3.5 text-fg-muted">
              <LockKeyhole size={16} strokeWidth={2} className="mt-px shrink-0 text-primary" aria-hidden />
              <span className="leading-relaxed">
                Check <span className="font-semibold text-fg">{email}</span> for a 6-digit verification code.
                It expires in 10 minutes.
              </span>
            </div>

            <div>
              <label htmlFor="otp" className="block text-fg font-bold mb-1.5 text-center text-xs">
                Enter 6-Digit Verification Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="0 0 0 0 0 0"
                autoComplete="one-time-code"
                required
                className={`${inputClass} font-mono text-center text-2xl font-bold tracking-[0.4em] py-3.5 text-primary bg-surface-sunken/40 focus:bg-white`}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all shadow-2 flex items-center justify-center gap-2 select-none cursor-pointer ${
                isUnlocked
                  ? 'bg-emerald-600 text-white scale-[1.02] shadow-emerald-500/25 ring-2 ring-emerald-400'
                  : 'bg-primary hover:bg-primary-hover disabled:opacity-50 text-white active:scale-[0.99]'
              }`}
            >
              {isUnlocked ? (
                <>
                  <Unlock size={17} strokeWidth={2.5} className="text-white animate-pulse" />
                  <span>Account Unlocked!</span>
                </>
              ) : (
                <>
                  <Lock size={17} strokeWidth={2.5} className="transition-transform duration-300 group-hover:scale-110" />
                  <span>{loading ? 'Verifying Code…' : 'Unlock Account'}</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => requestOtp(completeEmail(email))}
                className="flex items-center gap-1.5 text-primary hover:underline font-bold"
              >
                <RotateCcw size={13} strokeWidth={2} /> Resend OTP
              </button>
              <button
                type="button"
                onClick={() => goTo('login')}
                className="text-fg-subtle hover:text-fg font-semibold"
              >
                ← Back to sign in
              </button>
            </div>
          </form>
        )}

        {mode === 'set_new_password' && (
          <form onSubmit={handleSaveAndSignIn} className="space-y-4 text-xs animate-form-in">
            <div className="flex items-center gap-2 p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 font-medium">
              <Sparkles size={16} strokeWidth={2} className="shrink-0 text-emerald-600" />
              <span>Identity verified! Create your new secure password below.</span>
            </div>

            <div>
              <label className="block text-fg-muted font-bold mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 9 characters"
                  autoComplete="new-password"
                  required
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <PasswordChecklist password={newPassword} />
            </div>

            <div>
              <label className="block text-fg-muted font-bold mb-1">Re-enter New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  required
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <p className="mt-1 text-micro font-semibold text-destructive">
                  The two passwords do not match.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || newPassword !== confirmPassword || !isPasswordValid(newPassword)}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl font-bold shadow-2 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-[0.99]"
            >
              <KeyRound size={16} strokeWidth={2} />
              <span>{loading ? 'Saving & Authenticating…' : 'Save & Sign In'}</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => goTo('login')}
                className="text-fg-subtle hover:text-fg font-semibold"
              >
                Cancel and return to sign in
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
