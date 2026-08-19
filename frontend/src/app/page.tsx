'use client';

import React, { useState } from 'react';
import axios from 'axios';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();

  // Mode: 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Form states
  const [email, setEmail] = useState('Placement_Management@infoziant.com');
  const [password, setPassword] = useState('Ipoms@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign up specific
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email,
        password,
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('ipoms_token', token);
          localStorage.setItem('ipoms_user', JSON.stringify(user));
        }
        setSuccessMsg(`Welcome back, ${user.fullName}! Redirecting...`);
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        'Failed to connect to iPOMS backend. Ensure backend is running on port 5000.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('Registration request submitted! Please wait for Team Leader approval.');
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('Verification OTP has been generated! Check terminal or email.');
  };

  return (
    <main className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-5xl bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* Left Branding Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-950/60 via-slate-900/80 to-slate-950/90 p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80">
          <div>
            {/* Logo Badge */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  INFOZIANT <span className="text-blue-400 font-extrabold">iPOMS</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">Placement Operations System</p>
              </div>
            </div>

            {/* Value Proposition */}
            <div className="space-y-4 my-8">
              <h2 className="text-2xl font-bold text-white leading-tight">
                Enterprise Corporate CRM & Campus Placement Engine
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Streamlining daily company follow-ups, drive tracking, and institutional reports across 3,550+ hiring partners.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3 text-xs text-slate-300 bg-slate-800/40 p-3 rounded-lg border border-slate-700/40">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Stateless Dual-Token JWT & Granular RBAC</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-300 bg-slate-800/40 p-3 rounded-lg border border-slate-700/40">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Sub-10ms Indexed Search on 50,000+ Companies</span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="pt-8 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span>Version 1.0.0 (Frozen)</span>
            <span>© Infoziant 2026</span>
          </div>
        </div>

        {/* Right Authentication Form Panel (7 Cols) */}
        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-slate-900/40">
          
          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. LOGIN MODE */}
          {mode === 'login' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Sign in to your account</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Enter your official Infoziant credentials to access your placement dashboard.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Official Email
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. Placement_Management@infoziant.com"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-10 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-12 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                  <label htmlFor="remember" className="ml-2 text-xs text-slate-400">
                    Keep me signed in for 7 days
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to iPOMS</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Toggle to Coordinator Sign-Up */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  Placement Coordinator?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* 2. SIGN-UP MODE (Coordinator Self-Registration) */}
          {mode === 'signup' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Coordinator Registration</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Create your Placement Coordinator profile with your official company email.
                </p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Full Name</label>
                  <div className="relative">
                    <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Official Email</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="coordinator@infoziant.com"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Mobile Number</label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Create Password</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-xl mt-2"
                >
                  Submit Registration
                </button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </div>
          )}

          {/* 3. FORGOT PASSWORD MODE */}
          {mode === 'forgot' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Reset Password</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Enter your official email to receive a 6-digit OTP verification code.
                </p>
              </div>

              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Official Email</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      defaultValue="Placement_Management@infoziant.com"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-xl"
                >
                  Send Verification OTP
                </button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </main>
  );
}
