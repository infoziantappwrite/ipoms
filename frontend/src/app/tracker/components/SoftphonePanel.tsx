'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Clock,
  CheckCircle2,
  X,
  Minus,
  ChevronUp,
  Building2,
  User,
} from 'lucide-react';
import type { CallOutcome } from '../page';
import { triggerHaptic } from '@/lib/haptics';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { RowOutcomeDropdown } from './RowOutcomeDropdown';
import { RowMonthDropdown } from './RowMonthDropdown';

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
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DIALPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

export interface SoftphoneCallResult {
  rowId: string;
  outcomeStatus: CallOutcome;
  followUpMonth?: string;
  comments?: string;
  callDurationSeconds?: number;
}

interface Props {
  row: {
    _id: string;
    serial_no: number;
    company_name: string;
    hr_name?: string;
    mobile_number?: string;
    email_id?: string;
    outcome_status?: CallOutcome;
  } | null;
  onSave: (result: SoftphoneCallResult) => void;
  onClose: () => void;
}

type PanelState = 'ready' | 'calling' | 'wrapup';

export function SoftphonePanel({ row, onSave, onClose }: Props) {
  if (!row) return null;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [panelState, setPanelState] = useState<PanelState>('ready');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDialpad, setShowDialpad] = useState(false);

  // Active call duration state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Wrap-up inputs
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [followUpMonth, setFollowUpMonth] = useState('');
  const [comments, setComments] = useState('');

  const numberInputRef = useRef<HTMLInputElement>(null);

  // Init dialer state when row changes
  useEffect(() => {
    if (row) {
      setPhoneNumber(row.mobile_number || '');
      setPanelState('ready');
      setIsMinimized(false);
      setElapsedSeconds(0);
      setOutcome(row.outcome_status || '');
      setFollowUpMonth('');
      setComments('');
      setShowDialpad(false);
    }
  }, [row]);

  // Handle active call timer
  useEffect(() => {
    if (panelState === 'calling') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [panelState]);

  const handleCall = () => {
    if (!phoneNumber.trim()) return;

    triggerHaptic('success');
    // Trigger device native call protocol (Phone Link / MicroSIP / Android)
    const cleaned = phoneNumber.replace(/[\s\-()]/g, '');
    window.location.href = `tel:${cleaned}`;

    setPanelState('calling');
    setElapsedSeconds(0);
  };

  const handleHangUp = () => {
    triggerHaptic('warning');
    setPanelState('wrapup');
  };

  const handleDialpadPress = (key: string) => {
    triggerHaptic('light');
    if (panelState === 'ready') {
      setPhoneNumber((prev) => prev + key);
    }
  };

  const handleBackspace = () => {
    if (panelState === 'ready') {
      setPhoneNumber((prev) => prev.slice(0, -1));
    }
  };

  const handleSaveWrapUp = () => {
    if (!outcome) {
      alert('Please select a Call Outcome status');
      return;
    }

    const result: SoftphoneCallResult = {
      rowId: row._id,
      outcomeStatus: outcome,
      followUpMonth: outcome === 'follow_up' ? followUpMonth : undefined,
      comments: comments.trim() || undefined,
      callDurationSeconds: elapsedSeconds,
    };

    onSave(result);
    onClose();
  };

  const handleDismiss = () => {
    if (panelState === 'calling' && !confirm('Active call is running. Close dialer?')) {
      return;
    }
    onClose();
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatDurationLong = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s} seconds`;
    return `${m} min ${s} sec`;
  };

  // ── Minimized pill (anchored at bottom-right if user collapses) ─────────────
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-surface border border-border
                   rounded-full px-4 py-2.5 shadow-2xl cursor-pointer hover:shadow-xl transition-all hover:scale-105 text-fg"
        onClick={() => setIsMinimized(false)}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${panelState === 'calling' ? 'bg-emerald-500 animate-pulse' : 'bg-primary'}`} />
        <div className="flex items-center gap-1.5">
          <Phone size={14} strokeWidth={2.25} className="text-fg" />
          <span className="text-xs font-bold text-fg font-mono tabular-nums">
            {panelState === 'calling' ? formatDuration(elapsedSeconds) : 'Dialer Active'}
          </span>
        </div>
        <span className="text-xs font-semibold text-fg-subtle truncate max-w-[130px]">
          {row.company_name}
        </span>
        <ChevronUp size={14} className="text-fg-subtle" />
      </div>
    );
  }

  // ── Centered Main Minimal SaaS Popup ───────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-[420px] bg-surface rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col transition-all text-fg">

        {/* ── Top Modal Header ─────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          panelState === 'calling'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : panelState === 'wrapup'
            ? 'bg-primary/10 border-primary/20'
            : 'bg-surface-sunken border-border'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
              panelState === 'calling'
                ? 'bg-emerald-600 text-white animate-pulse'
                : panelState === 'wrapup'
                ? 'bg-primary text-white'
                : 'bg-primary text-white'
            }`}>
              <Phone size={17} strokeWidth={2.25} />
            </div>
            <div>
              <span className="text-xs font-bold text-fg font-display block">
                {panelState === 'wrapup' ? 'Call Summary & Wrap-Up' : panelState === 'calling' ? 'Active Call in Progress' : 'iPOMS Softphone'}
              </span>
              <span className="text-[11px] font-semibold text-fg-subtle">
                {panelState === 'wrapup' ? 'Auto-syncing to daily tracker' : panelState === 'calling' ? 'Connected via Phone Link' : 'Ready to dial'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(true)}
              className="w-8 h-8 rounded-xl hover:bg-surface-raised flex items-center justify-center text-fg-subtle hover:text-fg transition-colors cursor-pointer"
              title="Minimize to pill"
            >
              <Minus size={15} strokeWidth={2} />
            </button>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-xl hover:bg-rose-500/20 flex items-center justify-center text-fg-subtle hover:text-rose-500 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Contact Info Card ────────────────────────────────────────────── */}
        <div className="px-6 pt-4 pb-2">
          <div className="bg-surface-sunken border border-border rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-fg">
                <Building2 size={14} className="text-fg-subtle shrink-0" />
                <span className="truncate">{row.company_name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-fg-subtle font-medium mt-0.5">
                <User size={13} className="text-fg-subtle shrink-0" />
                <span className="truncate">{row.hr_name || 'HR Team'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {row.mobile_number && (
                <WhatsAppButton
                  mobileNumber={row.mobile_number}
                  contactName={row.hr_name}
                  companyName={row.company_name}
                />
              )}
              <span className="text-[10px] font-mono font-bold bg-surface text-fg-muted border border-border px-2 py-1 rounded-lg shrink-0 shadow-2xs">
                Row #{row.serial_no}
              </span>
            </div>
          </div>
        </div>

        {/* ── Wrap-Up State vs Dialing State ───────────────────────────────── */}
        {panelState === 'wrapup' ? (
          <div className="px-6 pb-6 pt-2 space-y-3.5">
            {/* Duration Summary Pill */}
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-primary" />
                <span className="text-xs font-semibold text-fg">Call Duration:</span>
              </div>
              <span className="text-sm font-bold text-primary font-mono tabular-nums">
                {formatDurationLong(elapsedSeconds)}
              </span>
            </div>

            {/* Outcome Selector */}
            <div>
              <label className="text-xs font-bold text-fg mb-1.5 block">
                Call Outcome <span className="text-rose-500">*</span>
              </label>
              <RowOutcomeDropdown
                value={outcome || undefined}
                onChange={(val) => setOutcome(val as CallOutcome)}
              />
            </div>

            {/* Follow Up Month (Conditional) */}
            {outcome === 'follow_up' && (
              <div>
                <label className="text-xs font-bold text-fg mb-1.5 block">
                  Follow Up Month
                </label>
                <RowMonthDropdown
                  value={followUpMonth}
                  onChange={(m) => setFollowUpMonth(m)}
                />
              </div>
            )}

            {/* Comments Field */}
            <div>
              <label className="text-xs font-bold text-fg mb-1.5 block">
                Notes & Comments
              </label>
              <input
                type="text"
                value={comments}
                maxLength={200}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Optional call summary (max 200 chars)…"
                className="w-full bg-surface-sunken border border-border rounded-xl px-3.5 py-2.5 text-xs text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs placeholder:text-fg-disabled font-medium"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveWrapUp}
              disabled={!outcome}
              className="w-full bg-primary hover:bg-primary-hover active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl py-3 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <CheckCircle2 size={16} strokeWidth={2.25} />
              Save to Daily Tracker
            </button>
          </div>
        ) : (
          <>
            {/* ── Phone Number Input Bar ───────────────────────────────────── */}
            <div className="px-6 py-2">
              <div className="flex items-center gap-2 bg-surface-sunken border border-border rounded-2xl px-4 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <span className="text-xs font-bold text-fg-subtle font-mono shrink-0">+91</span>
                <input
                  ref={numberInputRef}
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                  placeholder="Enter mobile number"
                  disabled={panelState === 'calling'}
                  className="flex-1 bg-transparent text-base font-mono font-bold text-fg outline-none placeholder:text-fg-disabled tabular-nums disabled:text-fg-muted"
                />
                {phoneNumber && panelState === 'ready' && (
                  <button
                    onClick={handleBackspace}
                    className="text-fg-subtle hover:text-fg text-xs font-mono font-bold px-1.5 py-0.5 rounded hover:bg-surface-raised transition-colors"
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
                      type="button"
                      onPointerDown={() => handleDialpadPress(key)}
                      className="h-11 rounded-2xl bg-surface-sunken hover:bg-surface-raised active:bg-surface-raised active:scale-90
                                 border border-border text-sm font-bold text-fg font-mono select-none
                                 transition-transform duration-100 cursor-pointer shadow-2xs flex items-center justify-center"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Live Timer (During Active Call) ──────────────────── */}
            {panelState === 'calling' && (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-3xl font-bold text-fg tabular-nums font-mono tracking-wider">
                    {formatDuration(elapsedSeconds)}
                  </span>
                </div>
                <p className="text-xs text-fg-subtle font-medium mt-1">Live call timer connected</p>
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
