'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Check, ArrowLeft, AlarmClock } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { readSessionUser, roleOf } from '@/lib/session';

/**
 * "Have you sent the email?" reminder.
 *
 * Every Invite Mail call starts its own 15-minute timer on the server; this component only asks about
 * whatever the server says is due, and reports the answer back. The coordinator can confirm, or pick
 * their own time to be reminded at. It never blocks navigation and stays silent on any error.
 */

interface InviteCall {
  id: string;
  company: string;
  college: string;
  time_label: string;
}
interface Decision {
  show: boolean;
  kind?: 'due' | 'next_day';
  check_date?: string;
  when_label?: string;
  calls?: InviteCall[];
  colleges?: { code: string; count: number }[];
}

const POLL_MS = 45_000;
const READY_AFTER_MS = 60_000; // the app must have been open for a minute (login+logout in a minute -> next morning)
const SHOWN_CALLS = 3;

/** Minutes after IST midnight, whatever the browser's own timezone is. */
function istNowMinutes(): number {
  try {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const h = Number(p.find((x) => x.type === 'hour')?.value ?? 0) % 24;
    return h * 60 + Number(p.find((x) => x.type === 'minute')?.value ?? 0);
  } catch {
    return -1;
  }
}
const hhmm = (mins: number) => `${String(Math.floor((mins % 1440) / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
/** 18:30 -> "6:30 pm" */
function clockLabel(v: string): string {
  const [h, m] = v.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return v;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

export function EmailCheckPrompt() {
  const rawPath = usePathname() || '';
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;
  const [decision, setDecision] = useState<Decision | null>(null);
  const [view, setView] = useState<'ask' | 'snooze' | 'done'>('ask');
  const [doneMsg, setDoneMsg] = useState('');
  const [pickTime, setPickTime] = useState('');
  const [quick, setQuick] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const openedAt = useRef<number>(Date.now());
  const busy = useRef(false);
  const nextDayAsked = useRef(false);

  const eligible = useCallback(() => {
    const user: any = readSessionUser();
    if (!user) return false;
    if (roleOf(user) === 'admin') return false;
    if (user.has_all_colleges_access) return false;
    return true;
  }, []);

  const check = useCallback(
    async (kind: 'due' | 'next_day') => {
      if (busy.current || decision) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (!eligible()) return;
      if (Date.now() - openedAt.current < READY_AFTER_MS) return;
      busy.current = true;
      try {
        const res = await apiFetch<Decision>(`/email-check/status?kind=${kind}&ready=1`);
        if (res?.success && res.data?.show) {
          setDecision(res.data);
          setView('ask');
          setQuick(null);
          setErr('');
          setPickTime(hhmm(istNowMinutes() + 30));
        }
      } catch {
        /* silent */
      } finally {
        busy.current = false;
      }
    },
    [decision, eligible]
  );

  // A call can fall due at any point in the working day, so this runs through it.
  useEffect(() => {
    const tick = () => {
      const mins = istNowMinutes();
      if (mins >= 8 * 60 && mins <= 23 * 60) check('due');
    };
    const id = window.setInterval(tick, POLL_MS);
    const first = window.setTimeout(tick, READY_AFTER_MS + 500);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  // Next morning: only when the Daily Tracker is opened, once per page session.
  useEffect(() => {
    if (pathname !== '/tracker' || nextDayAsked.current) return;
    const wait = Math.max(1500, READY_AFTER_MS - (Date.now() - openedAt.current) + 500);
    const t = window.setTimeout(() => {
      nextDayAsked.current = true;
      check('next_day');
    }, wait);
    return () => window.clearTimeout(t);
  }, [pathname, check]);

  const send = useCallback(
    async (body: Record<string, unknown>) => {
      const d = decision;
      if (!d) return { success: false } as any;
      return apiFetch('/email-check/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_date: d.check_date, kind: d.kind, call_ids: (d.calls || []).map((c) => c.id), ...body }),
      }).catch(() => ({ success: false } as any));
    },
    [decision]
  );

  const finish = useCallback((msg: string) => {
    setDoneMsg(msg);
    setView('done');
    window.setTimeout(() => setDecision(null), 1600);
  }, []);

  /** Closing, Esc and "Not yet" with no time all mean the same thing: ask me again later. */
  const dismiss = useCallback(() => {
    void send({ answer: 'no' });
    setDecision(null);
  }, [send]);

  const confirmSent = useCallback(() => {
    void send({ answer: 'yes' });
    finish('Thank you - noted.');
  }, [send, finish]);

  const setReminder = useCallback(async () => {
    if (!pickTime) return;
    setErr('');
    const res: any = await send({ answer: 'snooze', remind_at: pickTime });
    if (res?.success) finish(`Reminder set for ${res?.data?.remind_at_label || clockLabel(pickTime)}`);
    else setErr(res?.error?.message || 'Could not set that reminder.');
  }, [pickTime, send, finish]);

  useEffect(() => {
    if (!decision) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && view !== 'done') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decision, view, dismiss]);

  const nowMins = istNowMinutes();
  const timeIsPast = useMemo(() => {
    if (!pickTime) return false;
    const [h, m] = pickTime.split(':').map(Number);
    return h * 60 + m <= nowMins;
    // nowMins is read at render; the Set button re-checks on the server anyway.
  }, [pickTime, nowMins]);

  if (!decision) return null;

  const calls = decision.calls || [];
  const many = calls.length > 1;
  const isNext = decision.kind === 'next_day';
  const when = decision.when_label || 'today';
  const title = isNext
    ? `Did you send ${many ? 'these emails' : 'this email'} from ${when === 'yesterday' ? 'yesterday' : when}?`
    : many
    ? 'Have you sent these emails?'
    : 'Have you sent this email?';
  const dayWord = when === 'yesterday' ? 'yesterday' : when;
  const subtitle = isNext
    ? many
      ? `${calls.length} Invite Mail calls from ${dayWord} were never confirmed.`
      : `Invite Mail logged ${dayWord} at ${calls[0]?.time_label || ''}, still not confirmed.`
    : many
    ? `${calls.length} Invite Mail calls, logged 15 minutes ago or more.`
    : `Invite Mail logged at ${calls[0]?.time_label || ''}.`;

  return (
    <div className="ipoms-ec-backdrop" role="presentation">
      <div className="ipoms-ec-card" role="dialog" aria-modal="true" aria-labelledby="ipoms-ec-title">
        {view === 'snooze' && (
          <button type="button" className="ipoms-ec-back" onClick={() => { setView('ask'); setErr(''); }} aria-label="Back">
            <ArrowLeft size={15} strokeWidth={2.2} aria-hidden />
          </button>
        )}
        {view !== 'done' && (
          <button type="button" className="ipoms-ec-x" onClick={dismiss} aria-label="Close">
            <X size={15} strokeWidth={2.2} aria-hidden />
          </button>
        )}

        <div className="ipoms-ec-hero" aria-hidden>
          <svg viewBox="0 0 120 80" width="74" height="49">
            <g className="ipoms-ec-plane">
              <path d="M8 40 L52 22 L40 46 Z" fill="#fff" opacity="0.95" />
              <path d="M40 46 L52 22 L34 40 Z" fill="#bfd0ff" />
            </g>
            <g className="ipoms-ec-env">
              <rect x="58" y="34" width="52" height="34" rx="5" fill="#fff" />
              <path d="M58 38 L84 55 L110 38" fill="none" stroke="#1E3A8A" strokeWidth="2.4" strokeLinejoin="round" />
            </g>
          </svg>
        </div>

        {view === 'done' && (
          <div className="ipoms-ec-done">
            <span className="ipoms-ec-tick"><Check size={24} strokeWidth={3} aria-hidden /></span>
            <p>{doneMsg}</p>
          </div>
        )}

        {view === 'ask' && (
          <div className="ipoms-ec-body">
            <h2 id="ipoms-ec-title" className="ipoms-ec-title">{title}</h2>
            <p className="ipoms-ec-sub">{subtitle}</p>
            <ul className="ipoms-ec-list">
              {calls.slice(0, SHOWN_CALLS).map((c) => (
                <li key={c.id}>
                  <span className="ipoms-ec-co" title={c.company}>{c.company}</span>
                  {c.college && <span className="ipoms-ec-chip">{c.college}</span>}
                  <span className="ipoms-ec-at">{c.time_label}</span>
                </li>
              ))}
              {calls.length > SHOWN_CALLS && <li className="ipoms-ec-more">and {calls.length - SHOWN_CALLS} more</li>}
            </ul>
            <div className="ipoms-ec-actions">
              <button type="button" className="ipoms-ec-btn ipoms-ec-yes" onClick={confirmSent}>Yes, sent</button>
              <button type="button" className="ipoms-ec-btn ipoms-ec-no" onClick={() => setView('snooze')}>
                <AlarmClock size={14} strokeWidth={2.2} aria-hidden /> Not yet
              </button>
            </div>
          </div>
        )}

        {view === 'snooze' && (
          <div className="ipoms-ec-body">
            <h2 id="ipoms-ec-title" className="ipoms-ec-title">Remind me at</h2>
            <p className="ipoms-ec-sub">Pick when you will have sent {many ? 'them' : 'it'}. Nothing shows up before that.</p>
            <div className="ipoms-ec-quick">
              {[15, 30, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`ipoms-ec-qchip${quick === m ? ' is-on' : ''}`}
                  onClick={() => { setQuick(m); setPickTime(hhmm(istNowMinutes() + m)); setErr(''); }}
                >
                  {m === 60 ? '1 hour' : `${m} min`}
                </button>
              ))}
            </div>
            <div className="ipoms-ec-or"><span>or choose a time</span></div>
            <div className="ipoms-ec-timefield">
              <input
                type="time"
                value={pickTime}
                onChange={(e) => { setPickTime(e.target.value); setQuick(null); setErr(''); }}
                aria-label="Reminder time"
              />
            </div>
            <p className={`ipoms-ec-preview${timeIsPast || err ? ' is-bad' : ''}`}>
              {err || (timeIsPast ? 'Choose a time later than now.' : pickTime ? `You will be reminded at ${clockLabel(pickTime)} today.` : 'Choose a time.')}
            </p>
            <div className="ipoms-ec-actions">
              <button type="button" className="ipoms-ec-btn ipoms-ec-yes" onClick={setReminder} disabled={!pickTime || timeIsPast}>Set reminder</button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .ipoms-ec-backdrop { position: fixed; inset: 0; z-index: 90; display: flex; align-items: center; justify-content: center;
          padding: 16px; overflow: auto; background: rgba(15, 23, 42, .45); animation: ipoms-ec-fade .25s ease-out both; }
        .ipoms-ec-card { position: relative; width: min(330px, 100%); margin: auto; border-radius: 18px; overflow: hidden;
          background: #fff; color: #0f172a; font-family: inherit; box-shadow: 0 24px 60px rgba(15, 23, 42, .35);
          animation: ipoms-ec-pop .35s cubic-bezier(.2,.9,.3,1.2) both; }
        .ipoms-ec-x, .ipoms-ec-back { position: absolute; top: 8px; z-index: 2; display: grid; place-items: center; width: 26px; height: 26px;
          border: 0; border-radius: 999px; background: rgba(255,255,255,.18); color: #fff; cursor: pointer; }
        .ipoms-ec-x { right: 8px; }
        .ipoms-ec-back { left: 8px; }
        .ipoms-ec-x:hover, .ipoms-ec-back:hover { background: rgba(255,255,255,.34); }
        .ipoms-ec-hero { display: grid; place-items: center; padding: 12px 0 8px; background: linear-gradient(135deg, #1E3A8A, #2F4DB0 58%, #5580F5); }
        .ipoms-ec-plane { animation: ipoms-ec-fly 2.4s ease-in-out infinite; }
        .ipoms-ec-env { animation: ipoms-ec-bob 2.4s ease-in-out infinite; transform-origin: 84px 51px; }
        .ipoms-ec-body { padding: 12px 16px 16px; animation: ipoms-ec-slide .22s ease-out both; }
        .ipoms-ec-title { margin: 0 0 3px; font-size: 15px; font-weight: 700; line-height: 1.3; letter-spacing: -.01em; }
        .ipoms-ec-sub { margin: 0; font-size: 11.5px; line-height: 1.45; color: #64748b; }

        .ipoms-ec-list { list-style: none; margin: 10px 0 0; padding: 6px 8px; display: flex; flex-direction: column; gap: 5px;
          border-radius: 10px; background: #f1f5f9; }
        .ipoms-ec-list li { display: flex; align-items: center; gap: 6px; font-size: 11.5px; }
        .ipoms-ec-co { flex: 1; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ipoms-ec-chip { flex: none; padding: 1px 6px; border-radius: 999px; background: #e0e7ff; color: #1E3A8A; font-size: 9.5px; font-weight: 700; letter-spacing: .02em; }
        .ipoms-ec-at { flex: none; color: #64748b; font-size: 10.5px; font-variant-numeric: tabular-nums; }
        .ipoms-ec-more { color: #64748b; font-size: 10.5px; }

        .ipoms-ec-quick { display: flex; gap: 6px; margin: 12px 0 0; }
        .ipoms-ec-qchip { flex: 1; height: 30px; border-radius: 9px; border: 1px solid #dbe2ec; background: #fff; color: #1e293b;
          font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 2px rgba(15,23,42,.06);
          transition: transform .12s ease, border-color .12s ease, background .12s ease; }
        .ipoms-ec-qchip:hover { transform: translateY(-1px); border-color: #1E3A8A; }
        .ipoms-ec-qchip.is-on { background: #1E3A8A; border-color: #1E3A8A; color: #fff; box-shadow: 0 4px 10px rgba(30,58,138,.28); }
        .ipoms-ec-or { display: flex; align-items: center; gap: 8px; margin: 12px 0 8px; color: #94a3b8; font-size: 10px; letter-spacing: .04em; text-transform: uppercase; }
        .ipoms-ec-or::before, .ipoms-ec-or::after { content: ''; flex: 1; height: 1px; background: #e6ebf2; }
        .ipoms-ec-timefield { display: flex; align-items: center; height: 38px; padding: 0 10px; border-radius: 10px;
          border: 1px solid #dbe2ec; background: #f8fafc; color: #64748b; box-shadow: inset 0 1px 2px rgba(15,23,42,.05); }
        .ipoms-ec-timefield:focus-within { border-color: #1E3A8A; box-shadow: 0 0 0 3px rgba(30,58,138,.14); }
        .ipoms-ec-timefield input { flex: 1; min-width: 0; border: 0; background: transparent; color: #0f172a; font-family: inherit;
          font-size: 14px; font-weight: 700; letter-spacing: .01em; outline: none; font-variant-numeric: tabular-nums; }
        .ipoms-ec-preview { margin: 8px 0 0; font-size: 10.5px; line-height: 1.4; color: #1E3A8A; font-weight: 600; }
        .ipoms-ec-preview.is-bad { color: #b91c1c; }

        .ipoms-ec-actions { display: flex; gap: 8px; margin-top: 12px; }
        .ipoms-ec-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 34px;
          border-radius: 10px; font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
          transition: transform .12s ease, filter .12s ease; }
        .ipoms-ec-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        .ipoms-ec-btn:disabled { opacity: .5; cursor: not-allowed; }
        .ipoms-ec-btn:focus-visible, .ipoms-ec-x:focus-visible, .ipoms-ec-back:focus-visible, .ipoms-ec-qchip:focus-visible { outline: 2px solid #5580F5; outline-offset: 2px; }
        .ipoms-ec-yes { border: 0; background: #15803d; color: #fff; box-shadow: 0 4px 10px rgba(21,128,61,.25); }
        .ipoms-ec-no { border: 1.5px solid #cbd5e1; background: transparent; color: #0f172a; }

        .ipoms-ec-done { display: grid; place-items: center; gap: 8px; padding: 18px 16px 22px; font-size: 12.5px; font-weight: 600; text-align: center; }
        .ipoms-ec-done p { margin: 0; }
        .ipoms-ec-tick { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 999px; background: #15803d; color: #fff;
          animation: ipoms-ec-pop .4s cubic-bezier(.2,.9,.3,1.4) both; }

        .dark .ipoms-ec-card { background: #141b2b; color: #e5e9f2; }
        .dark .ipoms-ec-sub, .dark .ipoms-ec-at, .dark .ipoms-ec-more { color: #a9b3c7; }
        .dark .ipoms-ec-list { background: #1b2436; }
        .dark .ipoms-ec-chip { background: #27365a; color: #b9c9ff; }
        .dark .ipoms-ec-qchip { background: #1b2436; border-color: #56627a; color: #e5e9f2; }
        .dark .ipoms-ec-qchip.is-on { background: #5580F5; border-color: #5580F5; color: #0b1120; }
        .dark .ipoms-ec-or { color: #7c8899; }
        .dark .ipoms-ec-or::before, .dark .ipoms-ec-or::after { background: #2b364c; }
        .dark .ipoms-ec-timefield { background: #1b2436; border-color: #56627a; color: #a9b3c7; }
        .dark .ipoms-ec-timefield input { color: #e5e9f2; color-scheme: dark; }
        .dark .ipoms-ec-preview { color: #9fb6ff; }
        .dark .ipoms-ec-preview.is-bad { color: #fca5a5; }
        .dark .ipoms-ec-no { color: #e5e9f2; border-color: #56627a; }

        @keyframes ipoms-ec-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ipoms-ec-pop { from { opacity: 0; transform: translateY(14px) scale(.94); } to { opacity: 1; transform: none; } }
        @keyframes ipoms-ec-slide { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }
        @keyframes ipoms-ec-fly { 0%, 100% { transform: translate(0, 2px); } 50% { transform: translate(10px, -4px); } }
        @keyframes ipoms-ec-bob { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @media (prefers-reduced-motion: reduce) {
          .ipoms-ec-backdrop, .ipoms-ec-card, .ipoms-ec-plane, .ipoms-ec-env, .ipoms-ec-tick, .ipoms-ec-body { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
