'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Check, Clock3 } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { readSessionUser, roleOf } from '@/lib/session';

/**
 * "Have you sent the email?" reminder.
 *
 * Every Invite Mail call starts its own 15-minute timer on the server; this component only asks about
 * whatever the server says is due, and reports the answer back. The coordinator can confirm, or open the
 * time picker in place and choose when to be reminded. It never blocks navigation and fails silently.
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
}

const POLL_MS = 45_000;
const READY_AFTER_MS = 60_000; // the app must have been open for a minute (login+logout in a minute -> next morning)
const SHOWN_CALLS = 3;
const ITEM = 34; // one row of a picker wheel

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
/** Minutes after midnight -> 'HH:MM', rounded up to the next 5 so it lands on the picker's steps. */
const toHHMM = (mins: number) => {
  const m = Math.min(23 * 60 + 55, Math.ceil((mins % 1440) / 5) * 5);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const minsOf = (v: string) => {
  const [h, m] = v.split(':').map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? -1 : h * 60 + m;
};
/** '18:30' -> '6:30 pm' */
function clockLabel(v: string): string {
  const [h, m] = v.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return v;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

/** A snap-scrolling column. Scroll it, drag it, click a row, or use the arrow keys. */
function Wheel({ items, index, onIndex, label }: { items: string[]; index: number; onIndex: (i: number) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number>();
  const fromScroll = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    if (Math.round(el.scrollTop / ITEM) !== index) el.scrollTo({ top: index * ITEM, behavior: el.scrollTop === 0 && index === 0 ? 'auto' : 'smooth' });
  }, [index]);

  // start on the right row without animating in
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = index * ITEM;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
      if (i !== index) {
        fromScroll.current = true;
        onIndex(i);
      }
    }, 90);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      onIndex(Math.max(0, Math.min(items.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1))));
    }
  };

  return (
    <div className="ipoms-ec-wheel" ref={ref} onScroll={onScroll} onKeyDown={onKey} tabIndex={0} role="listbox" aria-label={label}>
      <div className="ipoms-ec-pad" />
      {items.map((it, i) => (
        <div
          key={it}
          role="option"
          aria-selected={i === index}
          className={`ipoms-ec-item${i === index ? ' is-on' : ''}`}
          onClick={() => onIndex(i)}
        >
          {it}
        </div>
      ))}
      <div className="ipoms-ec-pad" />
    </div>
  );
}

export function EmailCheckPrompt() {
  const rawPath = usePathname() || '';
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;
  const [decision, setDecision] = useState<Decision | null>(null);
  const [picking, setPicking] = useState(false);
  const [done, setDone] = useState('');
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
          setPicking(false);
          setQuick(null);
          setErr('');
          setDone('');
          setPickTime(toHHMM(istNowMinutes() + 30));
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
    setDone(msg);
    window.setTimeout(() => setDecision(null), 1600);
  }, []);

  /** Closing and Esc mean the same thing: not now, ask me again later. */
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || done) return;
      if (picking) setPicking(false);
      else dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decision, picking, done, dismiss]);

  const nowMins = istNowMinutes();
  const chosen = minsOf(pickTime);
  const timeIsPast = chosen >= 0 && chosen <= nowMins;

  // wheel positions derived from the single source of truth, pickTime
  const { hourIdx, minIdx, isPm } = useMemo(() => {
    const h24 = Math.floor(Math.max(0, chosen) / 60);
    return {
      hourIdx: ((h24 % 12) + 11) % 12, // 0 -> "12", 13 -> "01"
      minIdx: Math.round((Math.max(0, chosen) % 60) / 5) % 12,
      isPm: h24 >= 12,
    };
  }, [chosen]);

  const setParts = useCallback((h12: number, min: number, pm: boolean) => {
    const h24 = (h12 % 12) + (pm ? 12 : 0);
    setPickTime(`${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    setQuick(null);
    setErr('');
  }, []);

  if (!decision) return null;

  const calls = decision.calls || [];
  const many = calls.length > 1;
  const isNext = decision.kind === 'next_day';
  const when = decision.when_label || 'today';
  const title = isNext
    ? `Did you send ${many ? 'these emails' : 'this email'} from ${when}?`
    : many
    ? 'Have you sent these emails?'
    : 'Have you sent this email?';
  const subtitle = isNext
    ? many
      ? `${calls.length} Invite Mail calls from ${when} were never confirmed.`
      : `Invite Mail logged ${when} at ${calls[0]?.time_label || ''}, still not confirmed.`
    : many
    ? `${calls.length} Invite Mail calls, logged 15 minutes ago or more.`
    : `Invite Mail logged at ${calls[0]?.time_label || ''}.`;

  return (
    <div className="ipoms-ec-backdrop" role="presentation">
      <div className="ipoms-ec-card" role="dialog" aria-modal="true" aria-labelledby="ipoms-ec-title">
        {!done && (
          <button type="button" className="ipoms-ec-x" onClick={dismiss} aria-label="Close">
            <X size={15} strokeWidth={2.2} aria-hidden />
          </button>
        )}

        <div className="ipoms-ec-hero" aria-hidden>
          <span className="ipoms-ec-halo" />
          <svg viewBox="0 0 128 62" width="88" height="43">
            {/* the letter, rising out of the envelope */}
            <g className="ipoms-ec-letter">
              <rect x="44" y="4" width="40" height="30" rx="4" fill="#e8eefc" />
              <rect x="50" y="12" width="28" height="3" rx="1.5" fill="#9db0dc" />
              <rect x="50" y="19" width="20" height="3" rx="1.5" fill="#bcc9e8" />
            </g>
            {/* envelope */}
            <rect x="30" y="22" width="68" height="36" rx="6" fill="#fff" />
            <path d="M30 27 L64 49 L98 27" fill="none" stroke="#1E3A8A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M30 53 L52 38 M98 53 L76 38" fill="none" stroke="#c3d0ec" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>

        {done ? (
          <div className="ipoms-ec-done">
            <span className="ipoms-ec-tick"><Check size={24} strokeWidth={3} aria-hidden /></span>
            <p>{done}</p>
          </div>
        ) : (
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
              <button
                type="button"
                className={`ipoms-ec-btn ipoms-ec-pick${picking ? ' is-open' : ''}`}
                onClick={() => setPicking((p) => !p)}
                aria-expanded={picking}
              >
                <Clock3 size={14} strokeWidth={2.2} aria-hidden /> Pick time
              </button>
            </div>

            {picking && (
              <div className="ipoms-ec-picker">
                <div className="ipoms-ec-quick">
                  {[15, 30, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`ipoms-ec-qchip${quick === m ? ' is-on' : ''}`}
                      onClick={() => { setPickTime(toHHMM(istNowMinutes() + m)); setQuick(m); setErr(''); }}
                    >
                      {m === 60 ? 'in 1 hour' : `in ${m} min`}
                    </button>
                  ))}
                </div>

                <div className="ipoms-ec-wheels">
                  <span className="ipoms-ec-band" aria-hidden />
                  <Wheel items={HOURS} index={hourIdx} label="Hour" onIndex={(i) => setParts(i + 1, Number(MINUTES[minIdx]), isPm)} />
                  <span className="ipoms-ec-colon" aria-hidden>:</span>
                  <Wheel items={MINUTES} index={minIdx} label="Minute" onIndex={(i) => setParts(hourIdx + 1, i * 5, isPm)} />
                  <div className="ipoms-ec-mer" role="group" aria-label="AM or PM">
                    <span className="ipoms-ec-merthumb" style={{ transform: isPm ? 'translateY(100%)' : 'none' }} aria-hidden />
                    <button type="button" className={!isPm ? 'is-on' : ''} onClick={() => setParts(hourIdx + 1, Number(MINUTES[minIdx]), false)} aria-pressed={!isPm}>AM</button>
                    <button type="button" className={isPm ? 'is-on' : ''} onClick={() => setParts(hourIdx + 1, Number(MINUTES[minIdx]), true)} aria-pressed={isPm}>PM</button>
                  </div>
                </div>

                <p className={`ipoms-ec-preview${timeIsPast || err ? ' is-bad' : ''}`} aria-live="polite">
                  {err || (timeIsPast ? 'That time has already passed today.' : `You will be reminded at ${clockLabel(pickTime)} today.`)}
                </p>
                <button type="button" className="ipoms-ec-btn ipoms-ec-set" onClick={setReminder} disabled={timeIsPast}>
                  Set reminder
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .ipoms-ec-backdrop { position: fixed; inset: 0; z-index: 90; display: flex; align-items: center; justify-content: center;
          padding: 16px; overflow: auto; background: rgba(15, 23, 42, .45); animation: ipoms-ec-fade .25s ease-out both; }
        .ipoms-ec-card { position: relative; width: min(400px, 100%); margin: auto; border-radius: 20px; overflow: hidden;
          display: flex; flex-direction: column; max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px);
          background: #fff; color: #0f172a; font-family: inherit; box-shadow: 0 24px 60px rgba(15, 23, 42, .35);
          animation: ipoms-ec-pop .35s cubic-bezier(.16,1,.3,1) both; }
        .ipoms-ec-x { position: absolute; top: 9px; right: 9px; z-index: 2; display: grid; place-items: center; width: 28px; height: 28px;
          border: 0; border-radius: 999px; background: rgba(255,255,255,.18); color: #fff; cursor: pointer; transition: background .15s ease; }
        .ipoms-ec-x:hover { background: rgba(255,255,255,.34); }

        .ipoms-ec-hero { position: relative; flex: none; display: grid; place-items: center; padding: 10px 0 6px; overflow: hidden;
          background: linear-gradient(135deg, #16307A, #2F4DB0 55%, #5580F5); }
        .ipoms-ec-halo { position: absolute; width: 150px; height: 150px; border-radius: 999px; background: rgba(255,255,255,.12);
          animation: ipoms-ec-halo 3.2s ease-in-out infinite; }
        .ipoms-ec-letter { animation: ipoms-ec-lift 3.2s ease-in-out infinite; }

        .ipoms-ec-body { padding: 12px 18px 16px; overflow-y: auto; min-height: 0; overscroll-behavior: contain; }
        .ipoms-ec-title { margin: 0 0 3px; font-size: 16px; font-weight: 700; line-height: 1.3; letter-spacing: -.01em; }
        .ipoms-ec-sub { margin: 0; font-size: 12px; line-height: 1.45; color: #64748b; }

        .ipoms-ec-list { list-style: none; margin: 9px 0 0; padding: 7px 10px; display: flex; flex-direction: column; gap: 6px;
          border-radius: 12px; background: #f1f5f9; }
        .ipoms-ec-list li { display: flex; align-items: center; gap: 7px; font-size: 12px; }
        .ipoms-ec-co { flex: 1; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ipoms-ec-chip { flex: none; padding: 1px 7px; border-radius: 999px; background: #e0e7ff; color: #1E3A8A; font-size: 10px; font-weight: 700; letter-spacing: .02em; }
        .ipoms-ec-at { flex: none; color: #64748b; font-size: 11px; font-variant-numeric: tabular-nums; }
        .ipoms-ec-more { color: #64748b; font-size: 11px; }

        .ipoms-ec-actions { display: flex; gap: 9px; margin-top: 11px; }
        .ipoms-ec-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px;
          border-radius: 12px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
          transition: transform .14s cubic-bezier(.16,1,.3,1), filter .14s ease, border-color .14s ease, background .14s ease; }
        .ipoms-ec-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.04); }
        .ipoms-ec-btn:active:not(:disabled) { transform: translateY(0) scale(.985); }
        .ipoms-ec-btn:disabled { opacity: .45; cursor: not-allowed; }
        .ipoms-ec-btn:focus-visible, .ipoms-ec-x:focus-visible, .ipoms-ec-qchip:focus-visible, .ipoms-ec-wheel:focus-visible, .ipoms-ec-mer button:focus-visible { outline: 2px solid #5580F5; outline-offset: 2px; }
        .ipoms-ec-yes { border: 0; background: #15803d; color: #fff; box-shadow: 0 6px 14px rgba(21,128,61,.24); }
        .ipoms-ec-pick { border: 1.5px solid #cbd5e1; background: #fff; color: #0f172a; }
        .ipoms-ec-pick.is-open { border-color: #1E3A8A; background: #eef2ff; color: #1E3A8A; }
        .ipoms-ec-set { width: 100%; margin-top: 8px; border: 0; background: #1E3A8A; color: #fff; box-shadow: 0 6px 14px rgba(30,58,138,.24); }

        .ipoms-ec-picker { margin-top: 10px; padding-top: 10px; border-top: 1px solid #eef1f6; animation: ipoms-ec-reveal .26s cubic-bezier(.2,.9,.3,1) both; }
        .ipoms-ec-quick { display: flex; gap: 7px; }
        .ipoms-ec-qchip { flex: 1; height: 32px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; color: #334155;
          font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: all .14s ease; }
        .ipoms-ec-qchip:hover { border-color: #1E3A8A; color: #1E3A8A; }
        .ipoms-ec-qchip.is-on { background: #1E3A8A; border-color: #1E3A8A; color: #fff; box-shadow: 0 5px 12px rgba(30,58,138,.26); }

        .ipoms-ec-wheels { position: relative; display: flex; align-items: center; justify-content: center; gap: 2px; margin-top: 9px;
          padding: 4px 10px; border-radius: 16px; background: #f8fafc; border: 1px solid #e8edf4; box-shadow: inset 0 1px 3px rgba(15,23,42,.05); }
        .ipoms-ec-band { position: absolute; left: 10px; right: 10px; top: 50%; height: ${ITEM}px; transform: translateY(-50%);
          border-radius: 12px; background: #e8eeff; pointer-events: none; }
        .ipoms-ec-wheel { position: relative; z-index: 1; width: 74px; height: ${ITEM * 3}px; overflow-y: auto; scroll-snap-type: y mandatory;
          scrollbar-width: none; -ms-overflow-style: none; text-align: center; outline: none;
          -webkit-mask-image: linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent);
          mask-image: linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent); }
        .ipoms-ec-wheel::-webkit-scrollbar { display: none; }
        .ipoms-ec-pad { height: ${ITEM}px; }
        .ipoms-ec-item { height: ${ITEM}px; line-height: ${ITEM}px; scroll-snap-align: center; cursor: pointer; user-select: none;
          font-size: 17px; font-weight: 600; color: #94a3b8; font-variant-numeric: tabular-nums;
          transition: color .18s ease, transform .18s cubic-bezier(.16,1,.3,1), opacity .18s ease; opacity: .75; }
        .ipoms-ec-item.is-on { color: #1E3A8A; font-weight: 800; transform: scale(1.12); opacity: 1; }
        .ipoms-ec-colon { position: relative; z-index: 1; font-size: 17px; font-weight: 800; color: #1E3A8A; padding-bottom: 2px; }
        .ipoms-ec-mer { position: relative; z-index: 1; display: flex; flex-direction: column; margin-left: 10px; padding: 3px;
          border-radius: 12px; background: #eaeff7; }
        .ipoms-ec-merthumb { position: absolute; left: 3px; right: 3px; top: 3px; height: calc(50% - 3px); border-radius: 9px;
          background: #1E3A8A; box-shadow: 0 3px 8px rgba(30,58,138,.3); transition: transform .24s cubic-bezier(.16,1,.3,1); }
        .ipoms-ec-mer button { position: relative; z-index: 1; width: 46px; height: 30px; border: 0; background: transparent;
          font-family: inherit; font-size: 11.5px; font-weight: 700; letter-spacing: .04em; color: #64748b; cursor: pointer; transition: color .2s ease; }
        .ipoms-ec-mer button.is-on { color: #fff; }

        .ipoms-ec-preview { margin: 8px 0 0; font-size: 11.5px; line-height: 1.4; color: #1E3A8A; font-weight: 600; text-align: center; }
        .ipoms-ec-preview.is-bad { color: #b91c1c; }

        .ipoms-ec-done { display: grid; place-items: center; gap: 9px; padding: 20px 18px 24px; font-size: 13px; font-weight: 600; text-align: center; }
        .ipoms-ec-done p { margin: 0; }
        .ipoms-ec-tick { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 999px; background: #15803d; color: #fff;
          animation: ipoms-ec-pop .4s cubic-bezier(.16,1,.3,1) both; }

        .dark .ipoms-ec-card { background: #141b2b; color: #e5e9f2; }
        .dark .ipoms-ec-sub, .dark .ipoms-ec-at, .dark .ipoms-ec-more { color: #a9b3c7; }
        .dark .ipoms-ec-list { background: #1b2436; }
        .dark .ipoms-ec-chip { background: #27365a; color: #b9c9ff; }
        .dark .ipoms-ec-pick { background: #1b2436; border-color: #56627a; color: #e5e9f2; }
        .dark .ipoms-ec-pick.is-open { background: #22305a; border-color: #5580F5; color: #cfdcff; }
        .dark .ipoms-ec-set { background: #5580F5; color: #0b1120; }
        .dark .ipoms-ec-picker { border-top-color: #2b364c; }
        .dark .ipoms-ec-qchip { background: #1b2436; border-color: #56627a; color: #d5dbe8; }
        .dark .ipoms-ec-qchip.is-on { background: #5580F5; border-color: #5580F5; color: #0b1120; }
        .dark .ipoms-ec-wheels { background: #1b2436; border-color: #2b364c; }
        .dark .ipoms-ec-band { background: #26324c; }
        .dark .ipoms-ec-item { color: #8b95aa; }
        .dark .ipoms-ec-item.is-on { color: #cfdcff; }
        .dark .ipoms-ec-colon { color: #cfdcff; }
        .dark .ipoms-ec-mer { background: #26324c; }
        .dark .ipoms-ec-merthumb { background: #5580F5; }
        .dark .ipoms-ec-mer button { color: #a9b3c7; }
        .dark .ipoms-ec-mer button.is-on { color: #0b1120; }
        .dark .ipoms-ec-preview { color: #9fb6ff; }
        .dark .ipoms-ec-preview.is-bad { color: #fca5a5; }

        @keyframes ipoms-ec-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ipoms-ec-pop { from { opacity: 0; transform: translateY(14px) scale(.94); } to { opacity: 1; transform: none; } }
        @keyframes ipoms-ec-reveal { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        @keyframes ipoms-ec-lift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3.5px); } }
        @keyframes ipoms-ec-halo { 0%, 100% { transform: scale(.82); opacity: .35; } 50% { transform: scale(1); opacity: .6; } }
        @media (prefers-reduced-motion: reduce) {
          .ipoms-ec-backdrop, .ipoms-ec-card, .ipoms-ec-letter, .ipoms-ec-halo, .ipoms-ec-tick, .ipoms-ec-picker { animation: none !important; }
          .ipoms-ec-wheel { scroll-behavior: auto; }
        }
      `}</style>
    </div>
  );
}
