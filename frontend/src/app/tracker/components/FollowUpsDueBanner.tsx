'use client';

import { useState } from 'react';
import { AlarmClock, ChevronDown, Phone, User, Mail, ListPlus } from 'lucide-react';
import { formatFollowUpDateDisplay } from './TrackerRow';

export interface FollowUpReminder {
  _id: string;
  company_id?: string | null;
  company_name: string;
  hr_name: string;
  mobile_number: string;
  email_id: string;
  college_id: string;
  follow_up_month: string;
  follow_up_date: string;
  originally_logged_on: string;
}

/** "Due today" for an exact match, "Overdue since 20 Sep 2026" for anything
 *  earlier — the query is "$lte today", so a missed day keeps showing rather
 *  than silently vanishing, and this makes that visible instead of confusing. */
function formatDueCaption(dateStr: string): string {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  if (dueDay.getTime() === today.getTime()) return 'Due today';
  if (dueDay.getTime() < today.getTime()) return `Overdue since ${formatFollowUpDateDisplay(dateStr)}`;
  return `Due ${formatFollowUpDateDisplay(dateStr)}`;
}

interface Props {
  reminders: FollowUpReminder[];
  isReadOnly: boolean;
  /** "Today" or "Tomorrow" — whichever sheet is currently active via the page's
   *  own single Today/Tomorrow toggle. Shown so it's clear where Add to Tracker
   *  will file the contact; there is no separate Tomorrow control here. */
  activeDateLabel: string;
  onAddToTracker: (reminders: FollowUpReminder[]) => void;
}

/**
 * A contact marked "Follow Up" in a past session, whose target month has now
 * arrived — shown here, not mixed into today's grid. "Add to Tracker" drops it
 * straight into whichever sheet is currently active as a blank, ready-to-call
 * row (same mechanism as Load Contacts) — no call-logging popup, since the
 * coordinator isn't necessarily calling this instant. Mustard/amber throughout
 * is deliberate — this is the one color on the page that means "pending from
 * history."
 */
export function FollowUpsDueBanner({ reminders, isReadOnly, activeDateLabel, onAddToTracker }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (reminders.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl border border-amber-300/70 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30 overflow-hidden">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
        >
          <AlarmClock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={2.2} />
          <span className="text-sm font-bold text-amber-800 dark:text-amber-300 shrink-0">
            {reminders.length} Follow-Up{reminders.length === 1 ? '' : 's'} Due
          </span>
          <ChevronDown
            size={16}
            className={`text-amber-500 transition-transform shrink-0 ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>

        {!isReadOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToTracker(reminders);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold px-3.5 py-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer ml-auto"
          >
            <ListPlus size={13} strokeWidth={2.4} />
            {reminders.length === 1
              ? `Add to ${activeDateLabel}'s Tracker`
              : `Add All to ${activeDateLabel}'s Tracker`}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="border-t border-amber-200/70 dark:border-amber-800/40 divide-y divide-amber-200/60 dark:divide-amber-800/40">
          {reminders.map((r) => (
            <div key={r._id} className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5">
              <div className="min-w-[160px]">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200 leading-tight">{r.company_name}</p>
                <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70">{formatDueCaption(r.follow_up_date)}</p>
              </div>

              {r.hr_name && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <User size={12} strokeWidth={2.2} /> {r.hr_name}
                </span>
              )}
              {r.mobile_number && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 tabular-nums">
                  <Phone size={12} strokeWidth={2.2} /> {r.mobile_number}
                </span>
              )}
              {r.email_id && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <Mail size={12} strokeWidth={2.2} /> {r.email_id}
                </span>
              )}

              {!isReadOnly && reminders.length > 1 && (
                <button
                  type="button"
                  onClick={() => onAddToTracker([r])}
                  className="ml-auto shrink-0 rounded-full bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold px-3 py-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                >
                  Add to {activeDateLabel}'s Tracker
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
