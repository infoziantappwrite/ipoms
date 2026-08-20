'use client';

import Image from 'next/image';
import Link from 'next/link';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  className?: string;
}

/**
 * Infoziant brand mark, on its own.
 *
 * The asset is a 5463x1318 horizontal wordmark (~4.14:1), so it is sized by
 * height with the width derived from that ratio. The previous version forced it
 * into a square box with object-contain, which letterboxed it down to an
 * unreadable strip.
 *
 * No "iPOMS" text and no version badge here by design — screens that need the
 * product name render their own heading (see SplashScreen / login).
 */
const SIZES = {
  sm: { h: 20, w: 83 },
  md: { h: 28, w: 116 },
  lg: { h: 44, w: 182 },
} as const;

export function InfoziantLogo({
  size = 'md',
  clickable = true,
  className = '',
}: Props) {
  const { h, w } = SIZES[size];

  const mark = (
    <span
      className={`inline-flex items-center justify-center rounded-control border border-border/80 bg-white px-2.5 py-1.5 shadow-1 ${className}`}
    >
      <Image
        src="/logo.png"
        alt="Infoziant"
        width={w}
        height={h}
        className="object-contain"
        priority
      />
    </span>
  );

  if (!clickable) return mark;

  return (
    <Link
      href="/home"
      aria-label="Infoziant iPOMS home"
      className="inline-flex cursor-pointer transition-opacity hover:opacity-90"
    >
      {mark}
    </Link>
  );
}
