'use client';

import { Building2, Check, CheckCircle2, Mail, Smartphone, Zap } from 'lucide-react';

interface AssignedItem {
  _id: string;
  sender_tl_id?: { full_name: string };
  college_id?: { college_name: string; college_code: string };
  company_name: string;
  hr_name?: string;
  hr_mobile?: string;
  hr_email?: string;
  task_description: string;
  priority: 'high' | 'medium' | 'low';
  is_loaded_to_metadata: boolean;
}

interface Props {
  assignments: AssignedItem[];
  onLoadToMetadata: (id: string) => void;
  onMarkComplete: (id: string) => void;
}

type Priority = 'high' | 'medium' | 'low';

const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low'];

const PRIORITY_META: Record<Priority, { label: string; chip: string; rail: string }> = {
  high: {
    label: 'High priority',
    chip: 'bg-destructive-subtle text-destructive border-destructive/30',
    rail: 'bg-destructive',
  },
  medium: {
    label: 'Medium priority',
    chip: 'bg-warning-subtle text-warning border-warning/30',
    rail: 'bg-warning',
  },
  low: {
    label: 'Low priority',
    chip: 'bg-info-subtle text-info border-info/30',
    rail: 'bg-info',
  },
};

export function AssignedWorkWidget({ assignments, onLoadToMetadata, onMarkComplete }: Props) {
  /**
   * Grouped by priority rather than rendered as one flat grid. The spec sorts
   * assignments by priority; a sorted flat grid still makes the coordinator
   * work out where "high" stops, whereas a labelled group answers "what must I
   * do first" without reading a single card.
   */
  const groups = PRIORITY_ORDER.map((p) => ({
    priority: p,
    items: assignments.filter((a) => a.priority === p),
  })).filter((g) => g.items.length > 0);

  return (
    <section
      aria-labelledby="assigned-heading"
      className="rounded-panel border border-border bg-surface p-5 shadow-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border pb-3">
        <div>
          <h2 id="assigned-heading" className="text-title font-bold tracking-tight text-fg">
            Assigned work
          </h2>
          <p className="mt-0.5 text-micro text-fg-subtle">
            Dispatched by your Team Leader. Load the contact into Metadata, then mark it done.
          </p>
        </div>

        {assignments.length > 0 && (
          <span className="shrink-0 rounded-full border border-destructive/30 bg-destructive-subtle px-2.5 py-0.5 text-micro font-bold text-destructive">
            {assignments.length} open
          </span>
        )}
      </div>

      {assignments.length === 0 ? (
        /* Empty state that teaches the interface rather than saying "nothing here". */
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <span
            aria-hidden
            className="grid h-12 w-12 place-items-center rounded-panel bg-success-subtle text-success"
          >
            <CheckCircle2 size={22} strokeWidth={2} />
          </span>
          <p className="mt-3 text-body font-semibold text-fg">Your inbox is clear</p>
          <p className="mt-1 max-w-sm text-micro leading-relaxed text-fg-subtle">
            New assignments from your Team Leader land here — each one carries a company, an HR
            contact, and a task. They disappear the moment you mark them done.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map((group) => {
            const meta = PRIORITY_META[group.priority];
            return (
              <div key={group.priority}>
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className={`h-3.5 w-1 rounded-full ${meta.rail}`} />
                  <h3 className="text-micro font-bold uppercase tracking-wide text-fg-muted">
                    {meta.label}
                  </h3>
                  <span className="text-micro tabular-nums text-fg-subtle">
                    {group.items.length}
                  </span>
                </div>

                <ul className="mt-2.5 grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {group.items.map((item) => (
                    <li
                      key={item._id}
                      className="flex flex-col justify-between rounded-panel border border-border bg-surface-sunken p-4 transition-shadow duration-200 hover:shadow-1"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="flex min-w-0 items-center gap-1.5 text-body font-bold text-fg">
                            <Building2
                              size={15}
                              strokeWidth={2}
                              className="shrink-0 text-fg-subtle"
                              aria-hidden
                            />
                            <span className="font-bold text-fg">{item.company_name}</span>
                          </h4>
                          <span
                            className={`shrink-0 rounded-control border px-1.5 py-0.5 font-mono text-micro font-semibold ${meta.chip}`}
                          >
                            {item.college_id?.college_code || '—'}
                          </span>
                        </div>

                        {(item.hr_name || item.hr_mobile || item.hr_email) && (
                          <dl className="mt-2.5 space-y-1 text-micro">
                            {item.hr_name && (
                              <div className="flex gap-1.5">
                                <dt className="text-fg-subtle">HR</dt>
                                <dd className="font-semibold text-fg-muted">{item.hr_name}</dd>
                              </div>
                            )}
                            {item.hr_mobile && (
                              <div className="flex items-center gap-1.5">
                                <dt className="sr-only">Mobile</dt>
                                <Smartphone
                                  size={13}
                                  strokeWidth={2}
                                  className="shrink-0 text-fg-subtle"
                                  aria-hidden
                                />
                                <dd className="font-mono tabular-nums text-fg-muted">
                                  {item.hr_mobile}
                                </dd>
                              </div>
                            )}
                            {item.hr_email && (
                              <div className="flex min-w-0 items-center gap-1.5">
                                <dt className="sr-only">Email</dt>
                                <Mail
                                  size={13}
                                  strokeWidth={2}
                                  className="shrink-0 text-fg-subtle"
                                  aria-hidden
                                />
                                <dd className="truncate font-mono text-fg-muted">
                                  {item.hr_email}
                                </dd>
                              </div>
                            )}
                          </dl>
                        )}

                        <p className="mt-2.5 border-t border-border pt-2.5 text-micro leading-relaxed text-fg-muted">
                          {item.task_description}
                        </p>
                      </div>

                      <div className="mt-3.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onLoadToMetadata(item._id)}
                          disabled={item.is_loaded_to_metadata}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-border bg-surface px-2.5 py-1.5 text-micro font-semibold text-primary shadow-1 transition-[box-shadow,color] duration-200 hover:text-primary-hover active:shadow-inset-1 disabled:cursor-default disabled:border-transparent disabled:bg-success-subtle disabled:text-success disabled:shadow-none"
                        >
                          {item.is_loaded_to_metadata ? (
                            <>
                              <Check size={13} strokeWidth={2.5} aria-hidden />
                              <span>In Metadata</span>
                            </>
                          ) : (
                            <>
                              <Zap size={13} strokeWidth={2} aria-hidden />
                              <span>Load to Metadata</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onMarkComplete(item._id)}
                          className="flex shrink-0 items-center gap-1.5 rounded-control bg-success px-3 py-1.5 text-micro font-semibold text-success-foreground shadow-1 transition-[box-shadow,opacity] duration-200 hover:opacity-90 active:shadow-inset-1"
                        >
                          <Check size={13} strokeWidth={2.5} aria-hidden />
                          Mark done
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
