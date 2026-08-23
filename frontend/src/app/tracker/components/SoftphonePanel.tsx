'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone,
  PhoneOff,
  X,
  Minus,
  ChevronUp,
  Keyboard,
  Building2,
  User,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';
import type { TrackerRow, CallOutcome } from '../page';

// ── Outcome options (same as TrackerRow) ─────────────────────────────────────
const OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: 'jd_received', label: 'JD Received' },
  { value: 'hiring_freezed', label: 'Hiring Freezed' },
  { value: 'hiring_completed', label: 'Hiring Completed' },
  { value: 'call_back', label: 'Call Back' },
  { value: 'hiring', label: 'Hiring' },
  { value: 'invite_mail', label: 'Invite Mail' },
  { value: 'not_hiring', label: 'Not Hiring' },
  { value: 'no_response', label: 'No Response' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'in_connect', label: 'In Connect' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'drive_completed', label: 'Drive Completed' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DIALPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

type PanelState = 'idle' | 'ready' | 'calling' | 'wrapup';

export interface SoftphoneCallResult {
  rowId: string;
  call_start_time: string;
  call_end_time: string;
  duration_seconds: number;
  duration_formatted: string;
  outcome_status: CallOutcome;
  follow_up_month?: string | null;
  comments?: string;
}

interface Props {
  /** The tracker row to call. Null = panel hidden. */
  row: TrackerRow | null;
  /** Called when the wrap-up form is saved. */
  onSave: (result: SoftphoneCallResult) => void;
  /** Called when the panel is dismissed without saving. */
  onClose: () => void;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDurationLong(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function SoftphonePanel({ row, onSave, onClose }: Props) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [callStartISO, setCallStartISO] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDialpad, setShowDialpad] = useState(true);

  // Wrap-up form
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [followUpMonth, setFollowUpMonth] = useState('');
  const [comments, setComments] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [stopTimer]);

  // ── Sync row into panel state when row changes ─────────────────────────────
  useEffect(() => {
    if (row) {
      setPhoneNumber(row.mobile_number || '');
      setPanelState('ready');
      setElapsedSeconds(0);
      setCallStartISO('');
      setIsMinimized(false);
      setShowDialpad(true);
      setOutcome(row.outcome_status || '');
      setFollowUpMonth(row.follow_up_month || '');
      setComments(row.comments || '');
    } else {
      setPanelState('idle');
      stopTimer();
    }
  }, [row, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCall = () => {
    if (!phoneNumber.trim()) return;

    // Clean number: remove spaces, dashes
    const cleaned = phoneNumber.replace(/[\s\-()]/g, '');
    const telNumber = cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;

    // Open tel: link
    window.open(`tel:${telNumber}`, '_self');

    // Start tracking
    const now = new Date().toISOString();
    setCallStartISO(now);
    setPanelState('calling');
    startTimer();
  };

  const handleHangUp = () => {
    stopTimer();
    setPanelState('wrapup');
  };

  const handleDialpadPress = (key: string) => {
    setPhoneNumber((prev) => prev + key);
    numberInputRef.current?.focus();
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleSaveWrapUp = () => {
    if (!row || !outcome) return;

    const callEnd = new Date().toISOString();
    const result: SoftphoneCallResult = {
      rowId: row._id,
      call_start_time: callStartISO || new Date().toISOString(),
      call_end_time: callEnd,
      duration_seconds: elapsedSeconds,
      duration_formatted: formatDurationLong(elapsedSeconds),
      outcome_status: outcome,
      follow_up_month: outcome === 'follow_up' ? (followUpMonth || null) : null,
      comments: comments.trim() || undefined,
    };
    onSave(result);
  };

  const handleDismiss = () => {
    stopTimer();
    onClose();
  };

  // ── Don't render if idle ───────────────────────────────────────────────────
  if (!row || panelState === 'idle') return null;

  // ── Minimized pill (anchored at bottom-right if user collapses) ─────────────
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white border border-slate-200/90
                   rounded-full px-4 py-2.5 shadow-2xl cursor-pointer hover:shadow-xl transition-all hover:scale-105"
        onClick={() => setIsMinimized(false)}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${panelState === 'calling' ? 'bg-emerald-500 animate-pulse' : 'bg-primary'}`} />
        <div className="flex items-center gap-1.5">
          <Phone size={14} strokeWidth={2.25} className="text-slate-700" />
          <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
            {panelState === 'calling' ? formatDuration(elapsedSeconds) : 'Dialer Active'}
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-500 truncate max-w-[130px]">
          {row.company_name}
        </span>
        <ChevronUp size={14} className="text-slate-400" />
      </div>
    );
  }

  // ── Centered Main Minimal SaaS Popup ───────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-form-in">
      <div className="w-full max-w-[420px] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col transition-all">

        {/* ── Top Modal Header ─────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          panelState === 'calling'
            ? 'bg-emerald-50/70 border-emerald-200/80'
            : panelState === 'wrapup'
            ? 'bg-blue-50/70 border-blue-200/80'
            : 'bg-slate-50/80 border-slate-200/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
              panelState === 'calling'
                ? 'bg-emerald-600 text-white animate-pulse'
                : panelState === 'wrapup'
                ? 'bg-blue-600 text-white'
                : 'bg-primary text-white'
            }`}>
              <Phone size={17} strokeWidth={2.25} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 font-display block">
                {panelState === 'wrapup' ? 'Call Summary & Wrap-Up' : panelState === 'calling' ? 'Active Call in Progress' : 'iPOMS Softphone'}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {panelState === 'wrapup' ? 'Auto-syncing to daily tracker' : panelState === 'calling' ? 'Connected via Phone Link' : 'Ready to dial'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(true)}
              className="w-8 h-8 rounded-xl hover:bg-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Minimize to pill"
            >
              <Minus size={15} strokeWidth={2} />
            </button>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-xl hover:bg-rose-100 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Contact Info Card ────────────────────────────────────────────── */}
        <div className="px-6 pt-4 pb-2">
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Building2 size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{row.company_name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-0.5">
                <User size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{row.hr_name || 'HR Team'}</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-white text-slate-700 border border-slate-200 px-2 py-1 rounded-lg shrink-0 shadow-2xs">
              Row #{row.serial_no}
            </span>
          </div>
        </div>

        {/* ── Wrap-Up State vs Dialing State ───────────────────────────────── */}
        {panelState === 'wrapup' ? (
          <div className="px-6 pb-6 pt-2 space-y-3.5">
            {/* Duration Summary Pill */}
            <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200/70 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-900">Call Duration:</span>
              </div>
              <span className="text-sm font-bold text-blue-950 font-mono tabular-nums">
                {formatDurationLong(elapsedSeconds)}
              </span>
            </div>

            {/* Outcome Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Call Outcome <span className="text-rose-500">*</span>
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as CallOutcome)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs cursor-pointer"
              >
                <option value="">— Select Outcome —</option>
                {OUTCOMES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Follow Up Month (Conditional) */}
            {outcome === 'follow_up' && (
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Follow Up Month
                </label>
                <select
                  value={followUpMonth}
                  onChange={(e) => setFollowUpMonth(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs cursor-pointer"
                >
                  <option value="">— Pick Month —</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Comments Field */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Notes & Comments
              </label>
              <input
                type="text"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Optional call summary…"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs placeholder:text-slate-400 font-medium"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveWrapUp}
              disabled={!outcome}
              className="w-full bg-primary hover:bg-blue-800 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl py-3 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <CheckCircle2 size={16} strokeWidth={2.25} />
              Save to Daily Tracker
            </button>
          </div>
        ) : (
          <>
            {/* ── Phone Number Input Bar ───────────────────────────────────── */}
            <div className="px-6 py-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <span className="text-xs font-bold text-slate-400 font-mono shrink-0">+91</span>
                <input
                  ref={numberInputRef}
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                  placeholder="Enter mobile number"
                  disabled={panelState === 'calling'}
                  className="flex-1 bg-transparent text-base font-mono font-bold text-slate-900 outline-none placeholder:text-slate-400 tabular-nums disabled:text-slate-600"
                />
                {phoneNumber && panelState === 'ready' && (
                  <button
                    onClick={handleBackspace}
                    className="text-slate-400 hover:text-slate-700 text-xs font-mono font-bold px-1.5 py-0.5 rounded hover:bg-slate-200 transition-colors"
                    title="Delete digit"
                  >
                    ⌫
                  </button>
                )}
              </div>
            </div>

            {/* ── Dialpad Grid ─────────────────────────────────────────────── */}
            {panelState === 'ready' && showDialpad && (
              <div className="px-6 py-2">
                <div className="grid grid-cols-3 gap-2">
                  {DIALPAD_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleDialpadPress(key)}
                      className="h-11 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 active:scale-95
                                 border border-slate-200/80 text-sm font-bold text-slate-800 font-mono
                                 transition-all cursor-pointer shadow-2xs flex items-center justify-center"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Live Timer (During Active Call) ──────────────────────────── */}
            {panelState === 'calling' && (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-3xl font-bold text-slate-900 tabular-nums font-mono tracking-wider">
                    {formatDuration(elapsedSeconds)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">Live call timer connected</p>
              </div>
            )}

            {/* ── Action Buttons ───────────────────────────────────────────── */}
            <div className="px-6 pb-6 pt-2">
              {panelState === 'ready' && (
                <button
                  onClick={handleCall}
                  disabled={!phoneNumber.trim()}
                  className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700
                             active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl py-3.5
                             text-sm font-bold shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
                >
                  <Phone size={17} strokeWidth={2.5} />
                  Start Call
                </button>
              )}

              {panelState === 'calling' && (
                <button
                  onClick={handleHangUp}
                  className="w-full flex items-center justify-center gap-2.5 bg-rose-600 hover:bg-rose-700
                             active:scale-[0.99] text-white rounded-2xl py-3.5 text-sm font-bold shadow-md
                             shadow-rose-700/20 transition-all cursor-pointer"
                >
                  <PhoneOff size={17} strokeWidth={2.5} />
                  Hang Up & Log Call
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
