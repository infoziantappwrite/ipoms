'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Check } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { readSessionUser, roleOf } from '@/lib/session';

/**
 * "Have you sent all your emails?" reminder. All decisions (who, when, how many times) are made by the
 * server clock in /email-check/status; this component only asks, shows and reports the answer.
 * It never blocks navigation and stays silent on any error.
 */

interface Decision {
  show: boolean;
  kind?: 'evening' | 'next_day';
  check_date?: string;
  when_label?: string;
  prompt_no?: number;
  positives?: { count: number; colleges: { code: string; count: number }[] };
}

const POLL_MS = 30_000;
const READY_AFTER_MS = 60_000; // the app must have been open for a minute (login+logout in a minute -> next morning)

/** Minutes after IST midnight, from the browser clock, used only to skip pointless polling. */
function istMinutesNow(): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return h * 60 + m;
  } catch {
    return -1;
  }
}

export function EmailCheckPrompt() {
  const rawPath = usePathname() || '';
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;
  const [decision, setDecision] = useState<Decision | null>(null);
  const [done, setDone] = useState(false);
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
    async (kind: 'evening' | 'next_day') => {
      if (busy.current || decision) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (!eligible()) return;
      const ready = Date.now() - openedAt.current >= READY_AFTER_MS;
      if (!ready) return;
      busy.current = true;
      try {
        const res = await apiFetch<Decision>(`/email-check/status?kind=${kind}&ready=1`);
        if (res?.success && res.data?.show) setDecision(res.data);
      } catch {
        /* silent */
      } finally {
        busy.current = false;
      }
    },
    [decision, eligible]
  );

  // Evening: poll only in the window where a prompt can possibly appear (16:55 - 18:50 IST).
  useEffect(() => {
    const tick = () => {
      const mins = istMinutesNow();
      if (mins >= 16 * 60 + 55 && mins <= 18 * 60 + 50) check('evening');
    };
    const id = window.setInterval(tick, POLL_MS);
    const first = window.setTimeout(tick, READY_AFTER_MS + 500);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
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

  const close = useCallback(() => setDecision(null), []);

  const answer = useCallback(
    async (a: 'yes' | 'no') => {
      const d = decision;
      if (!d) return;
      if (a === 'yes') setDone(true);
      else setDecision(null);
      try {
        await apiFetch('/email-check/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ check_date: d.check_date, answer: a, kind: d.kind }),
        });
      } catch {
        /* silent */
      }
      if (a === 'yes') window.setTimeout(() => { setDone(false); setDecision(null); }, 1400);
    },
    [decision]
  );

  useEffect(() => {
    if (!decision) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decision, close]);

  if (!decision) return null;

  const isNext = decision.kind === 'next_day';
  const when = decision.when_label || 'today';
  const title = isNext ? `Did you send all the emails for ${when === 'yesterday' ? "yesterday's" : `${when}'s`} positives?` : 'Have you sent all your emails?';
  const cols = decision.positives?.colleges || [];
  const total = decision.positives?.count || 0;

  return (
    <div className="ipoms-ec-backdrop" role="presentation">
      <div className="ipoms-ec-card" role="dialog" aria-modal="true" aria-labelledby="ipoms-ec-title">
        <button type="button" className="ipoms-ec-x" onClick={close} aria-label="Close">
          <X size={16} strokeWidth={2.2} aria-hidden />
        </button>

        <div className="ipoms-ec-hero" aria-hidden>
          <svg viewBox="0 0 120 80" width="120" height="80">
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

        {done ? (
          <div className="ipoms-ec-done">
            <span className="ipoms-ec-tick"><Check size={26} strokeWidth={3} aria-hidden /></span>
            <p>Thank you - noted.</p>
          </div>
        ) : (
          <>
            <h2 id="ipoms-ec-title" className="ipoms-ec-title">{title}</h2>
            <p className="ipoms-ec-sub">
              {isNext ? 'You logged' : 'You have logged'} {total} Invite Mail {total === 1 ? 'call' : 'calls'}
              {cols.length > 0 && (
                <> in {cols.map((c, i) => (<span key={c.code}>{i > 0 ? ', ' : ''}<b>{c.code}</b> ({c.count})</span>))}</>
              )}
              . Please make sure the emails have gone out.
            </p>
            <div className="ipoms-ec-actions">
              <button type="button" className="ipoms-ec-btn ipoms-ec-yes" onClick={() => answer('yes')} autoFocus={false}>Yes, all sent</button>
              <button type="button" className="ipoms-ec-btn ipoms-ec-no" onClick={() => answer('no')}>No</button>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .ipoms-ec-backdrop { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 16px;
          background: rgba(15, 23, 42, 0.45); animation: ipoms-ec-fade .25s ease-out both; }
        .ipoms-ec-card { position: relative; width: min(440px, 100%); border-radius: 20px; overflow: hidden;
          background: #ffffff; color: #0f172a; box-shadow: 0 24px 60px rgba(15, 23, 42, .35);
          animation: ipoms-ec-pop .35s cubic-bezier(.2,.9,.3,1.2) both; }
        .ipoms-ec-x { position: absolute; top: 10px; right: 10px; z-index: 2; display: grid; place-items: center; width: 30px; height: 30px;
          border-radius: 999px; border: 0; background: rgba(255,255,255,.18); color: #fff; cursor: pointer; }
        .ipoms-ec-x:hover { background: rgba(255,255,255,.32); }
        .ipoms-ec-hero { display: grid; place-items: center; padding: 22px 0 14px; background: linear-gradient(135deg, #1E3A8A, #3b5bdb 60%, #5580F5); }
        .ipoms-ec-plane { animation: ipoms-ec-fly 2.4s ease-in-out infinite; }
        .ipoms-ec-env { animation: ipoms-ec-bob 2.4s ease-in-out infinite; transform-origin: 84px 51px; }
        .ipoms-ec-title { margin: 18px 22px 6px; font-size: 18px; font-weight: 700; line-height: 1.3; }
        .ipoms-ec-sub { margin: 0 22px; font-size: 13.5px; line-height: 1.5; color: #475569; }
        .ipoms-ec-actions { display: flex; gap: 10px; padding: 18px 22px 22px; }
        .ipoms-ec-btn { flex: 1; height: 42px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform .12s ease, filter .12s ease; }
        .ipoms-ec-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
        .ipoms-ec-btn:focus-visible, .ipoms-ec-x:focus-visible { outline: 2px solid #5580F5; outline-offset: 2px; }
        .ipoms-ec-yes { border: 0; background: #15803d; color: #fff; }
        .ipoms-ec-no { border: 1.5px solid #94a3b8; background: transparent; color: #0f172a; }
        .dark .ipoms-ec-card { background: #141b2b; color: #e5e9f2; }
        .dark .ipoms-ec-sub { color: #a9b3c7; }
        .dark .ipoms-ec-no { color: #e5e9f2; border-color: #56627a; }
        .ipoms-ec-done { display: grid; place-items: center; gap: 8px; padding: 26px 22px 30px; font-weight: 600; }
        .ipoms-ec-done p { margin: 0; }
        .ipoms-ec-tick { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 999px; background: #15803d; color: #fff;
          animation: ipoms-ec-pop .4s cubic-bezier(.2,.9,.3,1.4) both; }
        @keyframes ipoms-ec-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ipoms-ec-pop { from { opacity: 0; transform: translateY(14px) scale(.94); } to { opacity: 1; transform: none; } }
        @keyframes ipoms-ec-fly { 0%, 100% { transform: translate(0, 2px); } 50% { transform: translate(10px, -4px); } }
        @keyframes ipoms-ec-bob { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @media (prefers-reduced-motion: reduce) {
          .ipoms-ec-backdrop, .ipoms-ec-card, .ipoms-ec-plane, .ipoms-ec-env, .ipoms-ec-tick { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
