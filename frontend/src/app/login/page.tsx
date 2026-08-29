'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InfoziantMark } from '@/components/InfoziantMark';
import { LoginModuleMarquee } from '@/components/auth/LoginModuleMarquee';
import { LoginCollegeLogoStrip } from '@/components/auth/LoginCollegeLogoStrip';
import { PasswordChecklist } from '@/components/auth/PasswordChecklist';
import {
  AlertTriangle, CheckCircle2, LockKeyhole, LogIn, PenLine,
  ShieldAlert, Lock, Unlock, RotateCcw, KeyRound, Eye, EyeOff, Sparkles,
  MailCheck, ExternalLink, ArrowRight
} from 'lucide-react';
import { armNavIntro } from '@/lib/session';
import { clearDailyFocusOnLogin } from '@/lib/collegeSession';
import { isPasswordValid } from '@/lib/passwordPolicy';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const STAFF_DOMAIN = 'infoziant.com';

type Mode = 'login' | 'signup' | 'signup_verify_otp' | 'forgot' | 'verify_otp' | 'set_new_password';

function completeEmail(raw: string): string {
  const v = raw.trim();
  if (!v || v.includes('@')) return v;
  return `${v}@${STAFF_DOMAIN}`;
}

export default function LoginPage() {
  const router = useRouter();

  // Enforce Light Theme: Splash, Login, and Signup are strictly in Light Theme by default
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  }, []);

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
  const [signupOtp, setSignupOtp] = useState('');

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
        const code = data.error?.code;
        const msg = data.error?.message || 'Invalid email or password.';

        if (code === 'ACCOUNT_LOCKED' || code === 'PASSWORD_LIMIT_EXCEEDED') {
          setLocked(true);
          setErrorMsg(msg);
          const sent = await requestOtp(addr);
          if (sent) {
            setMode('verify_otp');
          }
          return;
        }

        setErrorMsg(msg);
        return;
      }

      // Persist session
      const user = data.data?.user;
      if (user) {
        try {
          const raw = JSON.stringify(user);
          localStorage.setItem('ipoms_user', raw);
          sessionStorage.setItem('ipoms_user', raw);
        } catch {}
      }

      armNavIntro();
      clearDailyFocusOnLogin();

      router.push('/dashboard');
    } catch {
      setErrorMsg('Cannot reach the iPOMS server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Coordinator requests OTP for signup
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    const addr = completeEmail(email);
    setEmail(addr);

    if (!isPasswordValid(password)) {
      setErrorMsg('Password does not satisfy policy requirements.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/signup/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.trim(),
          official_email: addr,
          primary_mobile: mobile.trim() || undefined,
          password,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error?.message || 'Could not initiate registration.');
        return;
      }

      setSuccessMsg(data.message || `Verification code sent to your Outlook inbox (${addr}).`);
      setSignupOtp('');
      setMode('signup_verify_otp');
    } catch {
      setErrorMsg('Cannot reach the iPOMS server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Coordinator verifies OTP and account is created
  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);

    const addr = completeEmail(email);

    try {
      const res = await fetch(`${API}/auth/signup/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          official_email: addr,
          otp: signupOtp.trim(),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error?.message || 'Invalid or expired verification code.');
        return;
      }

      const user = data.data?.user;
      if (user) {
        try {
          const raw = JSON.stringify(user);
          localStorage.setItem('ipoms_user', raw);
          sessionStorage.setItem('ipoms_user', raw);
        } catch {}
      }

      setSuccessMsg(`Account verified successfully! Welcome, ${user?.full_name || 'Coordinator'}.`);
      armNavIntro();
      clearDailyFocusOnLogin();

      setTimeout(() => {
        router.push('/dashboard');
      }, 600);
    } catch {
      setErrorMsg('Cannot reach the iPOMS server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignupOtp = async () => {
    clearFeedback();
    setLoading(true);
    const addr = completeEmail(email);

    try {
      const res = await fetch(`${API}/auth/signup/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.trim(),
          official_email: addr,
          primary_mobile: mobile.trim() || undefined,
          password,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error?.message || 'Could not resend verification code.');
      } else {
        setSuccessMsg(data.message || `New verification code sent to ${addr}.`);
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
    setLoading(false);
    if (sent) {
      setMode('verify_otp');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: completeEmail(email), otp: otp.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error?.message || 'Invalid or expired verification code.');
        return;
      }

      setIsUnlocked(true);
      setSuccessMsg(data.message || 'Code verified successfully.');
      setTimeout(() => {
        setMode('set_new_password');
      }, 700);
    } catch {
      setErrorMsg('Cannot reach the iPOMS server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!isPasswordValid(newPassword)) {
      setErrorMsg('Password does not satisfy policy requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('The two passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: completeEmail(email),
          otp: otp.trim(),
          new_password: newPassword,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error?.message || 'Could not update password.');
        return;
      }

      setSuccessMsg('Password updated! You can now sign in with your new password.');
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
    'w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 transition-colors outline-hidden';

  const heading =
    mode === 'login' ? 'Sign In'
    : mode === 'signup' ? 'Create Account'
    : mode === 'signup_verify_otp' ? 'Verify Outlook Email'
    : mode === 'forgot' ? 'Reset Password'
    : mode === 'verify_otp' ? 'Verify & Unlock Account'
    : 'Set New Password';

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[1.05fr_1fr] text-slate-900">

      {/* ── Left: brand panel with top logos, center title, and bottom marquee ── */}
      <aside className="relative hidden lg:flex flex-col items-center justify-between overflow-hidden border-r border-slate-200 bg-white py-12">
        {/* Top: Sliding Partner College Logos */}
        <div className="w-full space-y-2">
          <p className="text-center text-micro font-bold text-slate-400 uppercase tracking-widest font-mono">
            Partner Institutions
          </p>
          <LoginCollegeLogoStrip />
        </div>

        {/* Center: Highlighted Application Title */}
        <div className="flex flex-col items-center text-center px-8 shrink-0 my-auto py-8">
          <p className="font-display text-4xl font-bold tracking-tight text-primary drop-shadow-xs">
            iPOMS
          </p>
          <h2 className="mt-2 font-display text-sm font-semibold tracking-normal text-slate-700 whitespace-nowrap">
            Infoziant Placement Operations & Management System
          </h2>
        </div>

        {/* Bottom: Sliding Operations Modules */}
        <div className="w-full space-y-2">
          <p className="text-center text-micro font-bold text-slate-400 uppercase tracking-widest font-mono">
            Core Modules
          </p>
          <LoginModuleMarquee />
        </div>
      </aside>

      {/* ── Right: the working surface in crisp Light Theme ── */}
      <main className="relative flex min-h-screen items-center justify-center bg-slate-50 lg:bg-white p-4 sm:p-6 lg:min-h-0 lg:p-10 text-slate-900">
        {/* Desktop-only mark */}
        <div className="hidden lg:block absolute top-8 right-8">
          <InfoziantMark size={88} />
        </div>

        <div className="w-full max-w-md space-y-4">

          {/* Compact brand lockup — mobile only */}
          <div className="flex flex-col items-center gap-1 lg:hidden">
            <InfoziantMark size={52} />
            <p className="text-title font-bold tracking-tight text-primary">iPOMS</p>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">{heading}</h1>
            <p className="text-micro text-slate-500 lg:hidden whitespace-nowrap">
              Infoziant Placement Operations & Management System
            </p>
          </div>

        {(mode === 'login' || mode === 'signup') && (
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="relative grid grid-cols-2 bg-slate-100 p-1 rounded-2xl border border-slate-200"
          >
            {/* Glider tab */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-white border border-slate-200/80 shadow-xs transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ transform: mode === 'signup' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => goTo('login')}
              className={`relative z-10 py-2 rounded-xl text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn size={14} strokeWidth={2} aria-hidden /> Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => goTo('signup')}
              className={`relative z-10 py-2 rounded-xl text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signup' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <PenLine size={14} strokeWidth={2} aria-hidden /> Create Account
            </button>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 font-medium animate-feedback-in"
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
            className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700 font-medium animate-feedback-in"
          >
            <CheckCircle2 size={16} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs animate-form-in">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Official Email Address</label>
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
              <p className="mt-1 text-micro text-slate-500">
                Type your name and press Tab — @{STAFF_DOMAIN} is added for you.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 font-bold">Password</label>
                <button
                  type="button"
                  onClick={() => goTo('forgot')}
                  className="text-primary hover:underline font-semibold cursor-pointer"
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
                  className={`${inputClass} pr-14 transition-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-micro font-semibold text-slate-500 hover:text-slate-800 cursor-pointer transition-none select-none"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>Remember this device for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl font-bold shadow-md transition-all active:scale-[0.99] text-xs cursor-pointer"
            >
              {loading ? 'Authenticating…' : 'Sign-In'}
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3 text-xs animate-form-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priyadharshini K" required className={inputClass} />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Username *</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. priya.k" required className={`${inputClass} font-mono`} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Official Email *</label>
                <input type="text"
                inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => setEmail(completeEmail(e.target.value))}
                  placeholder={`priya.k@${STAFF_DOMAIN}`} required className={`${inputClass} font-mono`} />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Primary Mobile</label>
                <input type="text" value={mobile} onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210" className={`${inputClass} font-mono`} />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 9 characters" autoComplete="new-password" required className={inputClass} />
              <PasswordChecklist password={password} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-[0.99]">
              <span>{loading ? 'Sending Outlook Code…' : 'Verify Outlook Email & Continue'}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* ── Step 2: Verify Outlook Email OTP for Signup ── */}
        {mode === 'signup_verify_otp' && (
          <form onSubmit={handleVerifySignupOtp} className="space-y-4 text-xs animate-form-in">
            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/90 space-y-2.5 text-slate-700">
              <div className="flex items-center gap-2 font-bold text-blue-900 text-xs">
                <MailCheck size={16} className="text-primary shrink-0" />
                <span>Outlook Email Verification Required</span>
              </div>
              <p className="text-micro leading-relaxed text-slate-600">
                A 6-digit verification code was dispatched to <strong className="text-slate-900 font-mono font-semibold">{email}</strong>. Once verified, your Placement Coordinator account will be activated immediately.
              </p>
              {/* 1-Click Outlook Launcher */}
              <a
                href="https://outlook.office.com/mail/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-micro font-bold text-slate-700 shadow-2xs transition-all hover:text-primary cursor-pointer"
              >
                <ExternalLink size={12} /> Open Outlook Webmail
              </a>
            </div>

            <div>
              <label htmlFor="signup-otp" className="block text-slate-900 font-bold mb-1.5 text-center text-xs">
                Enter 6-Digit Verification Code
              </label>
              <input
                id="signup-otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={signupOtp}
                onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="0 0 0 0 0 0"
                autoComplete="one-time-code"
                required
                className={`${inputClass} font-mono text-center text-2xl font-bold tracking-[0.4em] py-3.5 text-primary bg-slate-50 focus:bg-white`}
              />
            </div>

            <button
              type="submit"
              disabled={loading || signupOtp.length !== 6}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-[0.99]"
            >
              <CheckCircle2 size={16} strokeWidth={2} />
              <span>{loading ? 'Verifying & Activating…' : 'Verify OTP & Activate Account'}</span>
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleResendSignupOtp}
                disabled={loading}
                className="flex items-center gap-1.5 text-primary hover:underline font-bold cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={13} strokeWidth={2} /> Resend OTP
              </button>
              <button
                type="button"
                onClick={() => goTo('signup')}
                className="text-slate-500 hover:text-slate-900 font-semibold cursor-pointer"
              >
                ← Edit details
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4 text-xs animate-form-in">
            <p className="text-slate-600 leading-relaxed">
              Enter your official Infoziant email. We will send a 6-digit verification
              code to that inbox, valid for 10 minutes.
            </p>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Official Email</label>
              <input type="text"
                inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(completeEmail(e.target.value))}
                placeholder={`name@${STAFF_DOMAIN}`} required className={`${inputClass} font-mono`} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl font-bold shadow-md transition-colors text-xs cursor-pointer">
              {loading ? 'Sending…' : 'Send Verification Code'}
            </button>

            <div className="text-center pt-1">
              <button type="button" onClick={() => goTo('login')} className="text-primary hover:underline font-semibold cursor-pointer">
                ← Back to sign in
              </button>
            </div>
          </form>
        )}

        {mode === 'verify_otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 text-xs animate-form-in">
            <div className="flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-slate-700">
              <LockKeyhole size={16} strokeWidth={2} className="mt-px shrink-0 text-primary" aria-hidden />
              <span className="leading-relaxed">
                Check <span className="font-semibold text-slate-900">{email}</span> for a 6-digit verification code.
                It expires in 10 minutes.
              </span>
            </div>

            <div>
              <label htmlFor="otp" className="block text-slate-900 font-bold mb-1.5 text-center text-xs">
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
                className={`${inputClass} font-mono text-center text-2xl font-bold tracking-[0.4em] py-3.5 text-primary bg-slate-50 focus:bg-white`}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 select-none cursor-pointer ${
                isUnlocked
                  ? 'bg-emerald-600 text-white scale-[1.02] shadow-emerald-500/25 ring-2 ring-emerald-400'
                  : 'bg-primary hover:bg-primary/90 disabled:opacity-50 text-white active:scale-[0.99]'
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

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => requestOtp(completeEmail(email))}
                className="flex items-center gap-1.5 text-primary hover:underline font-bold cursor-pointer"
              >
                <RotateCcw size={13} strokeWidth={2} /> Resend OTP
              </button>
              <button
                type="button"
                onClick={() => goTo('login')}
                className="text-slate-500 hover:text-slate-900 font-semibold cursor-pointer"
              >
                ← Back to sign in
              </button>
            </div>
          </form>
        )}

        {mode === 'set_new_password' && (
          <form onSubmit={handleSaveAndSignIn} className="space-y-4 text-xs animate-form-in">
            <div className="flex items-center gap-2 p-3 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-800 font-medium">
              <Sparkles size={16} strokeWidth={2} className="shrink-0 text-emerald-600" />
              <span>Identity verified! Create your new secure password below.</span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 9 characters"
                  autoComplete="new-password"
                  required
                  className={`${inputClass} pr-12 transition-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer transition-none select-none"
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <PasswordChecklist password={newPassword} />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Re-enter New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  required
                  className={`${inputClass} pr-12 transition-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer transition-none select-none"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <p className="mt-1 text-micro font-semibold text-rose-600">
                  The two passwords do not match.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || newPassword !== confirmPassword || !isPasswordValid(newPassword)}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-[0.99]"
            >
              <KeyRound size={16} strokeWidth={2} />
              <span>{loading ? 'Saving & Authenticating…' : 'Save & Sign In'}</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => goTo('login')}
                className="text-slate-500 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Cancel and return to sign in
              </button>
            </div>
          </form>
        )}

        </div>
      </main>
    </div>
  );
}
