'use client';

import { useEffect, useState } from 'react';

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
      setTimeStr(lastSavedAt.toLocaleTimeString('en-IN', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      }));
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-400">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>Saving…</span>
      </div>
    );
  }

  if (status === 'saved' && lastSavedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span>Saved at {timeStr}</span>
      </div>
    );
  }

  if (status === 'saved' && !lastSavedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span>All changes saved</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <span className="w-2 h-2 rounded-full bg-slate-600" />
      <span>Auto-save active</span>
    </div>
  );
}
