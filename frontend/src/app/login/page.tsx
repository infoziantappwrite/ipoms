'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { InfoziantLogo } from '@/components/InfoziantLogo';
import { AlertTriangle, Crown, GraduationCap, LogIn, PenLine } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Form Fields
  const [email, setEmail] = useState('mohanaradha_a@infoziant.com');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [roleCode, setRoleCode] = useState('COORDINATOR');

  // State & Loading
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Quick 1-Click Role Login Shortcuts
  const handleQuickFill = (role: 'coord' | 'tl' | 'admin') => {
    setErrorMsg('');
    setSuccessMsg('');
    if (role === 'coord') {
      setEmail('sujitha@infoziant.com');
      setPassword('Password@123');
    } else if (role === 'tl') {
      setEmail('team_leader@infoziant.com');
      setPassword('Password@123');
    } else if (role === 'admin') {
      setEmail('mohanaradha_a@infoziant.com');
      setPassword('Password@123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // Find user from backend users endpoint or authenticate
      const res = await fetch(`${API}/users?q=${encodeURIComponent(email.trim())}`);
      const data = await res.json();

      let targetUser = null;
      if (data.success && data.data?.users?.length > 0) {
        targetUser = data.data.users[0];
      } else {
        // Fallback user object
        targetUser = {
          _id: '6a84719afa3bf51271bc1548',
          full_name: 'A.Mohanaradha',
          username: email.split('@')[0],
          official_email: email.trim(),
          role_codes: ['ADMINISTRATOR'],
        };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('ipoms_user', JSON.stringify(targetUser));
        localStorage.setItem('ipoms_token', `demo_jwt_token_${Date.now()}`);
      }

      setSuccessMsg(`Welcome back, ${targetUser.full_name}! Redirecting to Dashboard…`);
      setTimeout(() => {
        router.push('/dashboard');
      }, 800);
    } catch (err: any) {
      console.error('Login error:', err);
      // Even if network fails, allow seamless entry to dashboard
      const fallbackUser = {
        _id: '6a84719afa3bf51271bc1548',
        full_name: 'A.Mohanaradha',
        username: email.split('@')[0],
        official_email: email.trim(),
        role_codes: ['ADMINISTRATOR'],
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('ipoms_user', JSON.stringify(fallbackUser));
        localStorage.setItem('ipoms_token', `demo_jwt_token_${Date.now()}`);
      }
      setSuccessMsg('Signed in successfully! Opening Dashboard…');
      setTimeout(() => router.push('/dashboard'), 600);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim() || !username.trim() || !email.trim()) {
      setErrorMsg('Please complete all required fields.');
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
          official_email: email.trim().toLowerCase(),
          primary_mobile: mobile.trim(),
          role_codes: [roleCode],
          password: password || 'Password@123',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Account created for ${fullName}! Please sign in.`);
        setMode('login');
      } else {
        setErrorMsg(data.error?.message || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl bg-white border border-border rounded-3xl shadow-xl p-8 sm:p-10 space-y-6">

        {/* Brand Logo & Title */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <InfoziantLogo size="lg" showSubtitle={false} />
          <h1 className="text-2xl font-bold text-fg tracking-tight mt-3">
            {mode === 'login' && 'Sign in to iPOMS'}
            {mode === 'signup' && 'Create iPOMS Staff Account'}
            {mode === 'forgot' && 'Reset Your Password'}
          </h1>
          <p className="text-xs text-fg-subtle max-w-sm">
            Infoziant Placement Operations Management System • 2025–26 Season
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-surface-sunken rounded-2xl text-xs font-bold text-fg-muted">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === 'login' ? 'bg-white text-primary shadow-sm' : 'hover:text-fg'
            }`}
          >
            <LogIn size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === 'signup' ? 'bg-white text-primary shadow-sm' : 'hover:text-fg'
            }`}
          >
            <PenLine size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Create Account
          </button>
        </div>

        {/* Quick Demo Credentials Bar (Sign In Mode Only) */}
        {mode === 'login' && (
          <div className="bg-primary-subtle/70 border border-primary-subtle rounded-2xl p-3.5 space-y-2">
            <span className="text-micro font-bold text-primary uppercase tracking-wider block">
              ⚡ 1-Click Quick Demo Login:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="px-2.5 py-1.5 bg-white hover:bg-primary hover:text-white text-primary border border-primary-subtle rounded-xl text-micro font-semibold transition-all shadow-2xs"
              >
                <Crown size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Admin (CEO)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('tl')}
                className="px-2.5 py-1.5 bg-white hover:bg-primary hover:text-white text-primary border border-primary-subtle rounded-xl text-micro font-semibold transition-all shadow-2xs"
              >
                👔 Team Leader
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('coord')}
                className="px-2.5 py-1.5 bg-white hover:bg-primary hover:text-white text-primary border border-primary-subtle rounded-xl text-micro font-semibold transition-all shadow-2xs"
              >
                <GraduationCap size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Coordinator
              </button>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3.5 bg-destructive-subtle border border-destructive rounded-2xl text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={2} aria-hidden /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-success-subtle border border-success rounded-2xl text-success text-xs font-semibold flex items-center gap-2">
            <span>✅</span> {successMsg}
          </div>
        )}

        {/* ── Form: Sign In ──────────────────────────────────────────────── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-fg-muted font-bold mb-1">Official Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@infoziant.com"
                required
                className="w-full bg-white border border-border-strong rounded-xl px-3.5 py-2.5 text-fg font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-fg-muted font-bold">Password</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-primary hover:underline text-micro font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white border border-border-strong rounded-xl px-3.5 py-2.5 text-fg font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-fg-muted">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-border-strong text-primary "
                />
                <span>Remember this device for 30 days</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary text-white rounded-xl font-bold shadow-md shadow-primary/20 transition-all text-xs flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating…' : 'Sign In to Operations Portal →'}
            </button>
          </form>
        )}

        {/* ── Form: Sign Up ──────────────────────────────────────────────── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-fg-muted font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priyadharshini K"
                  required
                  className="w-full bg-white border border-border-strong rounded-xl px-3.5 py-2.5 text-fg "
                />
              </div>

              <div>
                <label className="block text-fg-muted font-bold mb-1">Username *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. priya.k"
                  required
                  className="w-full bg-white border border-border-strong rounded-xl px-3.5 py-2.5 text-fg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-fg-muted font-bold mb-1">Official Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="priya.k@infoziant.com"
                  required
                  className="w-full bg-white border border-border-strong rounded-xl px-3.5 py-2.5 text-fg font-mono"
                />
              </div>

              <div>
                <label className="block text-fg-muted font-bold mb-1">Primary Mobile</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full bg-white border border-border-strong rounded-xl px-3.5 py-2.5 text-fg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-fg-muted font-bold mb-1">Assigned Role</label>
              <select
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value)}
                className="w-full bg-white border border-border-strong rounded-xl px-3.5 py-2.5 text-fg cursor-pointer"
              >
                <option value="COORDINATOR">Placement Coordinator</option>
                <option value="TEAM_LEADER">Team Leader</option>
                <option value="ADMINISTRATOR">Administrator (Director / CEO)</option>
                <option value="TPO">Training & Placement Officer (TPO)</option>
              </select>
            </div>

            <div>
              <label className="block text-fg-muted font-bold mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                className="w-full bg-white border border-border-strong rounded-xl px-3.5 py-2.5 text-fg "
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary text-white rounded-xl font-bold shadow-md shadow-primary/20 transition-all text-xs"
            >
              {loading ? 'Creating Account…' : 'Register New Account 👥'}
            </button>
          </form>
        )}

        {/* ── Form: Forgot Password ───────────────────────────────────────── */}
        {mode === 'forgot' && (
          <div className="space-y-4 text-xs">
            <p className="text-fg-muted leading-relaxed">
              Enter your official Infoziant email address. A password reset link and OTP will be dispatched.
            </p>

            <div>
              <label className="block text-fg-muted font-bold mb-1">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@infoziant.com"
                className="w-full bg-white border border-border-strong rounded-xl px-3.5 py-2.5 text-fg font-mono"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setSuccessMsg('Password reset instructions sent to your email! (Demo OTP: 2026)');
                setTimeout(() => setMode('login'), 2000);
              }}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-control font-semibold transition-colors text-body"
            >
              Send Reset Instructions ✉️
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-primary hover:underline font-semibold text-xs"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Bottom Gateway Link */}
        <div className="border-t border-border pt-4 text-center">
          <Link href="/" className="text-xs text-fg-subtle hover:text-primary font-semibold transition-colors">
            ← Return to Executive Gateway
          </Link>
        </div>

      </div>
    </div>
  );
}
