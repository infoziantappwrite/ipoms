'use client';

import { Check, Circle } from 'lucide-react';
import { checkPassword } from '@/lib/passwordPolicy';

/**
 * Live policy checklist. Shown while the user types rather than as an error
 * after they submit — a rule you can watch yourself satisfy is far less
 * frustrating than one that rejects you afterwards.
 */
export function PasswordChecklist({ password }: { password: string }) {
  const rules = checkPassword(password);

  return (
    <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2" aria-live="polite">
      {rules.map((r) => (
        <li
          key={r.id}
          className={`flex items-center gap-1.5 text-micro transition-colors ${
            r.passed ? 'text-success' : 'text-fg-subtle'
          }`}
        >
          {r.passed
            ? <Check size={12} strokeWidth={3} className="shrink-0" aria-hidden />
            : <Circle size={12} strokeWidth={2} className="shrink-0" aria-hidden />}
          <span>{r.label}</span>
          <span className="sr-only">{r.passed ? '— met' : '— not yet met'}</span>
        </li>
      ))}
    </ul>
  );
}
