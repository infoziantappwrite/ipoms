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
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
        <span>Saving…</span>
      </div>
    );
  }

  if (status === 'saved' && lastSavedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-success">
        <span className="w-2 h-2 rounded-full bg-success" />
        <span>Saved at {timeStr}</span>
      </div>
    );
  }

  if (status === 'saved' && !lastSavedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-success">
        <span className="w-2 h-2 rounded-full bg-success" />
        <span>All changes saved</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
      <span className="w-2 h-2 rounded-full bg-surface-raised" />
      <span>Auto-save active</span>
    </div>
  );
}
