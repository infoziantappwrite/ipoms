'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

type SaveStatus = 'saved' | 'saving' | 'idle';

interface Props {
  status: SaveStatus;
  lastSavedAt: Date | null;
}

export function AutoSaveBadge({ status, lastSavedAt }: Props) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    if (!lastSavedAt) return;
    const update = () => {
      setTimeStr(
        lastSavedAt.toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      );
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  if (status === 'saving') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/30 text-xs font-semibold text-warning transition-all duration-200 animate-in fade-in">
        <Loader2 size={12} className="animate-spin text-warning shrink-0" />
        <span className="tracking-tight">Saving…</span>
      </div>
    );
  }

  if (status === 'saved' && lastSavedAt) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/30 text-xs font-semibold text-success transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in fade-in zoom-in-95">
        <Check size={12} strokeWidth={3} className="text-success shrink-0" />
        <span className="tracking-tight">
          Saved at <span className="tabular-nums font-mono">{timeStr}</span>
        </span>
      </div>
    );
  }

  if (status === 'saved' && !lastSavedAt) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/30 text-xs font-semibold text-success transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in fade-in">
        <Check size={12} strokeWidth={3} className="text-success shrink-0" />
        <span className="tracking-tight">All changes saved</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-sunken border border-border text-xs font-medium text-fg-subtle">
      <span className="w-1.5 h-1.5 rounded-full bg-fg-disabled" />
      <span className="tracking-tight">Auto-save ready</span>
    </div>
  );
}

