'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  label: string;
  /** Anchor the tooltip beside this element. */
  anchor: HTMLElement | null;
}

/**
 * Label for a collapsed rail icon. Rendered into <body> rather than inside the
 * drawer: the drawer clips its own overflow so nav labels shear off cleanly
 * during the width transition, and a tooltip living inside it would be clipped
 * by the same rule.
 */
export function RailTooltip({ label, anchor }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchor) return setPos(null);
    const r = anchor.getBoundingClientRect();
    setPos({ top: r.top + r.height / 2, left: r.right + 12 });
  }, [anchor]);

  if (!anchor || !pos) return null;

  return createPortal(
    <div
      role="tooltip"
      style={{ top: pos.top, left: pos.left }}
      className="pointer-events-none fixed z-toast -translate-y-1/2 whitespace-nowrap rounded-control border border-border bg-surface px-2.5 py-1.5 text-micro font-semibold text-fg shadow-2"
    >
      {label}
    </div>,
    document.body,
  );
}
